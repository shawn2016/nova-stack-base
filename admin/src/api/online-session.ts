import type { OnlineSessionListResult } from '@nova/shared-types'
import { request } from './request'

export interface OnlineSessionListQuery {
  keyword?: string
  current?: number
  size?: number
}

function buildListParams(params: OnlineSessionListQuery = {}) {
  const { current = 1, size = 20, keyword } = params
  return {
    page: current,
    pageSize: size,
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {})
  }
}

export function fetchOnlineSessionList(params: OnlineSessionListQuery = {}) {
  return request<OnlineSessionListResult>({
    url: '/sessions/online',
    method: 'GET',
    params: buildListParams(params)
  })
}

export function kickOnlineSession(tokenId: string) {
  return request<{ success: true }>({
    url: `/sessions/online/${tokenId}`,
    method: 'DELETE'
  })
}
