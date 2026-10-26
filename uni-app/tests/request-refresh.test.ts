import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  token: 'expired', refreshToken: 'refresh',
  updateAccessToken: vi.fn(), setTokens: vi.fn(), resetSession: vi.fn(),
}))
vi.mock('@/store/member', () => ({ useMemberStore: () => store }))
type Options = { url: string; header?: Record<string, string>; success: (data: unknown) => void; fail: (error: unknown) => void }
const reLaunch = vi.fn()
async function settledWithin(promises: Promise<unknown>[]) {
  let timer: ReturnType<typeof setTimeout>
  try {
    return await Promise.race([
      Promise.allSettled(promises),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('请求仍在等待刷新结果')), 300) }),
    ])
  } finally { clearTimeout(timer!) }
}
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks()
  store.token = 'expired'; store.refreshToken = 'refresh'
  store.updateAccessToken.mockImplementation(access => { store.token = access })
  store.setTokens.mockImplementation((access, refresh) => { store.token = access; store.refreshToken = refresh })
  store.resetSession.mockImplementation(() => { store.token = ''; store.refreshToken = '' })
})

describe('uni-app 登录刷新', () => {
  it('刷新失败时并发请求全部结束，只重定向一次', async () => {
    let refreshOptions!: Options
    const transport = vi.fn((options: Options) => {
      if (options.url.endsWith('/auth/refresh')) refreshOptions = options
      else queueMicrotask(() => options.success({ statusCode: 401, data: {} }))
    })
    vi.stubGlobal('uni', { request: transport, reLaunch })
    const { request } = await import('../src/utils/request')
    const results = settledWithin([request({ url: '/first' }), request({ url: '/second' })])
    await vi.waitFor(() => expect(refreshOptions).toBeDefined())
    refreshOptions.fail(new Error('refresh failed'))
    expect((await results).map(item => item.status)).toEqual(['rejected', 'rejected'])
    expect(reLaunch).toHaveBeenCalledTimes(1)
  })

  it('并发请求复用一次刷新，更新令牌并保留请求头', async () => {
    let refreshOptions!: Options
    const transport = vi.fn((options: Options) => {
      if (options.url.endsWith('/auth/refresh')) { refreshOptions = options; return }
      queueMicrotask(() => {
        if (options.header?.Authorization === 'Bearer expired') options.success({ statusCode: 401, data: {} })
        else {
          options.success({ statusCode: 200, data: { code: 0, data: true } })
        }
      })
    })
    vi.stubGlobal('uni', { request: transport, reLaunch })
    const { request } = await import('../src/utils/request')
    const results = settledWithin([
      request({ url: '/first', header: { 'X-Request-ID': 'one' } }),
      request({ url: '/second', header: { 'X-Request-ID': 'two' } }),
    ])
    await vi.waitFor(() => expect(refreshOptions).toBeDefined())
    refreshOptions.success({ statusCode: 200, data: { code: 0, data: { accessToken: 'new', refreshToken: 'next' } } })
    expect((await results).map(item => item.status)).toEqual(['fulfilled', 'fulfilled'])
    expect(transport.mock.calls.filter(([options]) => options.url.endsWith('/auth/refresh'))).toHaveLength(1)
    expect(store.setTokens).toHaveBeenCalledWith('new', 'next')
    expect(transport.mock.calls.filter(([options]) => options.header?.Authorization === 'Bearer new').map(([options]) => options.header?.['X-Request-ID'])).toEqual(['one', 'two'])
  })

  it('刷新后仍为 401 时不循环刷新', async () => {
    let refreshes = 0
    vi.stubGlobal('uni', { reLaunch, request(options: Options) {
      queueMicrotask(() => {
        if (options.url.endsWith('/auth/refresh')) {
          refreshes++
          options.success({ statusCode: 200, data: { code: 0, data: { accessToken: 'new', refreshToken: 'next' } } })
        } else options.success({ statusCode: 401, data: {} })
      })
    } })
    const { request } = await import('../src/utils/request')
    expect((await settledWithin([request({ url: '/first' }), request({ url: '/second' })])).every(item => item.status === 'rejected')).toBe(true)
    expect(refreshes).toBe(1)
  })

  it('退出后的迟到刷新结果不能恢复会话', async () => {
    let refreshOptions!: Options
    vi.stubGlobal('uni', { reLaunch, request(options: Options) {
      if (options.url.endsWith('/auth/refresh')) refreshOptions = options
      else queueMicrotask(() => options.success({ statusCode: options.header?.Authorization === 'Bearer expired' ? 401 : 200, data: { code: 0, data: true } }))
    } })
    const { request } = await import('../src/utils/request')
    const results = settledWithin([request({ url: '/first' })])
    await vi.waitFor(() => expect(refreshOptions).toBeDefined())
    store.token = ''; store.refreshToken = ''
    refreshOptions.success({ statusCode: 200, data: { code: 0, data: { accessToken: 'new', refreshToken: 'next' } } })
    expect((await results)[0].status).toBe('rejected')
    expect(store.setTokens).not.toHaveBeenCalled()
    expect(store.updateAccessToken).not.toHaveBeenCalled()
  })
})
