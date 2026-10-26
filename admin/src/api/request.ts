import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { ErrorCode, type ApiResponse, type TokenPair } from '@nova/shared-types'
import { useUserStore } from '@/store/modules/user'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000
})

let refreshPromise: Promise<TokenPair> | null = null

async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  const response = await axios.post<ApiResponse<TokenPair>>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { timeout: 15000 }
  )
  if (response.data.code !== ErrorCode.SUCCESS) {
    throw new Error(response.data.message || '刷新令牌失败')
  }
  return response.data.data
}

/** 并发请求共用一次刷新，失败时所有调用者都能收到拒绝。 */
function refreshSession(): Promise<TokenPair> {
  if (!refreshPromise) {
    const userStore = useUserStore()
    const refreshToken = userStore.refreshToken
    refreshPromise = (async () => {
      try {
        const tokens = await refreshAccessToken(refreshToken)
        if (userStore.refreshToken !== refreshToken) {
          throw new Error('登录状态已变化，请重试')
        }
        userStore.setToken(tokens.accessToken, tokens.refreshToken)
        return tokens
      } catch (error) {
        if (userStore.refreshToken === refreshToken) userStore.logOut()
        throw error
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

instance.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.accessToken) {
    config.headers.Authorization = `Bearer ${userStore.accessToken}`
  }
  return config
})

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    const url = originalRequest.url ?? ''
    if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
      return Promise.reject(error)
    }

    const userStore = useUserStore()
    if (!userStore.refreshToken) {
      userStore.logOut()
      return Promise.reject(error)
    }

    // 每个等待者都标记重试，避免重放请求再次触发刷新循环。
    originalRequest._retry = true
    const tokens = await refreshSession()
    originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
    return instance.request(originalRequest)
  }
)

function unwrapResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const payload = response.data
  if (payload.code !== ErrorCode.SUCCESS) {
    throw new Error(payload.message || '请求失败')
  }
  return payload.data
}

export async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<ApiResponse<T>>(config)
  return unwrapResponse(response)
}

export default instance
