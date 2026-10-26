import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

const store = vi.hoisted(() => ({
  accessToken: 'expired', refreshToken: 'refresh',
  setToken: vi.fn(), logOut: vi.fn(),
}))
vi.mock('@/store/modules/user', () => ({ useUserStore: () => store }))

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: '', headers: new AxiosHeaders() }
}
function expired(config: InternalAxiosRequestConfig) {
  return new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, response(config, {}, 401))
}
async function settledWithin(promises: Promise<unknown>[]) {
  let timer: ReturnType<typeof setTimeout>
  try {
    return await Promise.race([
      Promise.allSettled(promises),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('请求仍在等待刷新结果')), 300) }),
    ])
  } finally { clearTimeout(timer!) }
}

const originalAdapter = axios.defaults.adapter
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks()
  store.accessToken = 'expired'; store.refreshToken = 'refresh'
  store.setToken.mockImplementation((access, refresh) => { store.accessToken = access; store.refreshToken = refresh })
  store.logOut.mockImplementation(() => { store.accessToken = ''; store.refreshToken = '' })
})
afterEach(() => { axios.defaults.adapter = originalAdapter })

describe('Admin 登录刷新', () => {
  it('刷新失败时结束所有并发请求，并且只清理一次登录状态', async () => {
    const { default: client, request } = await import('../src/api/request')
    client.defaults.adapter = async config => { throw expired(config) }
    let fail!: (reason: Error) => void
    const refresh = vi.fn(() => new Promise<never>((_, reject) => { fail = reject }))
    axios.defaults.adapter = refresh
    const results = settledWithin([request({ url: '/first' }), request({ url: '/second' })])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    fail(new Error('refresh failed'))
    expect((await results).map(item => item.status)).toEqual(['rejected', 'rejected'])
    expect(store.logOut).toHaveBeenCalledTimes(1)
  })

  it('并发 401 只刷新一次，重试保留原请求头', async () => {
    const { default: client, request } = await import('../src/api/request')
    client.defaults.adapter = async config => {
      if (config.headers.Authorization === 'Bearer expired') throw expired(config)
      expect(config.headers['X-Request-ID']).toBeTruthy()
      return response(config, { code: 0, data: config.url })
    }
    let succeed!: () => void
    const refresh = vi.fn((config: InternalAxiosRequestConfig) => new Promise(resolve => {
      succeed = () => resolve(response(config, { code: 0, data: { accessToken: 'new', refreshToken: 'next', expiresIn: 7200 } }))
    }))
    axios.defaults.adapter = refresh
    const results = settledWithin([
      request({ url: '/first', headers: { 'X-Request-ID': 'one' } }),
      request({ url: '/second', headers: { 'X-Request-ID': 'two' } }),
    ])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    succeed()
    expect((await results).map(item => item.status)).toEqual(['fulfilled', 'fulfilled'])
    expect(store.setToken).toHaveBeenCalledWith('new', 'next')
  })

  it('刷新后仍返回 401 时不反复刷新', async () => {
    const { default: client, request } = await import('../src/api/request')
    client.defaults.adapter = async config => { throw expired(config) }
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, { code: 0, data: { accessToken: 'new', refreshToken: 'next' } }))
    axios.defaults.adapter = refresh
    expect((await settledWithin([request({ url: '/first' }), request({ url: '/second' })])).every(item => item.status === 'rejected')).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('刷新期间退出登录，迟到的刷新结果不能恢复登录态', async () => {
    const { default: client, request } = await import('../src/api/request')
    client.defaults.adapter = async config => {
      if (config.headers.Authorization === 'Bearer expired') throw expired(config)
      return response(config, { code: 0, data: true })
    }
    let succeed!: () => void
    const refresh = vi.fn((config: InternalAxiosRequestConfig) => new Promise(resolve => {
      succeed = () => resolve(response(config, { code: 0, data: { accessToken: 'new', refreshToken: 'next' } }))
    }))
    axios.defaults.adapter = refresh
    const results = settledWithin([request({ url: '/first' })])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    store.accessToken = ''; store.refreshToken = ''
    succeed()
    expect((await results)[0].status).toBe('rejected')
    expect(store.setToken).not.toHaveBeenCalled()
  })
})
