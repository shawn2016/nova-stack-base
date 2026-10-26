import type {
  CreateIpBlacklistDto,
  IpBlacklistListResult,
  UpdateIpBlacklistStatusDto
} from '@nova/shared-types'
import { request } from './request'

export interface IpBlacklistListQuery {
  keyword?: string
  source?: 'manual' | 'auto'
  status?: number
  current?: number
  size?: number
}

function buildListParams(params: IpBlacklistListQuery = {}) {
  const { current = 1, size = 20, keyword, source, status } = params
  return {
    page: current,
    pageSize: size,
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    ...(source ? { source } : {}),
    ...(status !== undefined ? { status } : {})
  }
}

export function fetchIpBlacklistList(params: IpBlacklistListQuery = {}) {
  return request<IpBlacklistListResult>({
    url: '/security/ip-blacklist',
    method: 'GET',
    params: buildListParams(params)
  })
}

export function createIpBlacklist(data: CreateIpBlacklistDto) {
  return request({
    url: '/security/ip-blacklist',
    method: 'POST',
    data
  })
}

export function deleteIpBlacklist(id: string) {
  return request({
    url: `/security/ip-blacklist/${id}`,
    method: 'DELETE'
  })
}

export function updateIpBlacklistStatus(id: string, data: UpdateIpBlacklistStatusDto) {
  return request({
    url: `/security/ip-blacklist/${id}/status`,
    method: 'PUT',
    data
  })
}
