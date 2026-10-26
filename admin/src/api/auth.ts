import type {
  AdminInfo,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminMeResponse,
  ChangePasswordDto,
  MenuNode,
  TokenPair,
  UpdateProfileDto
} from '@nova/shared-types'
import { request } from './request'

export function login(data: AdminLoginRequest) {
  return request<AdminLoginResponse>({
    url: '/auth/login',
    method: 'POST',
    data
  })
}

export function logout() {
  return request<void>({
    url: '/auth/logout',
    method: 'POST'
  })
}

export function refreshToken(refreshTokenValue: string) {
  return request<TokenPair>({
    url: '/auth/refresh',
    method: 'POST',
    data: { refreshToken: refreshTokenValue }
  })
}

export function getMe() {
  return request<AdminMeResponse>({
    url: '/auth/me',
    method: 'GET'
  })
}

export function updateProfile(data: UpdateProfileDto) {
  return request<AdminInfo>({
    url: '/auth/me',
    method: 'PUT',
    data
  })
}

export function changePassword(data: ChangePasswordDto) {
  return request<{ success: true }>({
    url: '/auth/me/password',
    method: 'PUT',
    data
  })
}

export function getMenus() {
  return request<MenuNode[]>({
    url: '/auth/me/menus',
    method: 'GET'
  })
}

/** 兼容模板旧命名 */
export function fetchLogin(params: { userName: string; password: string }) {
  return login({ username: params.userName, password: params.password }).then((data) => ({
    token: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
    user: data.user
  }))
}

/** 兼容模板旧命名 */
export function fetchGetUserInfo(): Promise<AdminInfo> {
  return getMe()
}
