import type {
  CreateSiteConfigDto,
  PaginationResult,
  SiteConfigByKeyResult,
  SiteConfigListItem,
  UpdateSiteConfigDto
} from '@nova/shared-types'
import { request } from './request'

export interface SiteConfigListQuery {
  keyword?: string
  group?: string
  current?: number
  size?: number
}

function toTableResponse<T>(result: PaginationResult<T>) {
  return {
    records: result.list,
    total: result.total,
    current: result.page,
    size: result.pageSize
  }
}

export function fetchSiteConfigList(params: SiteConfigListQuery = {}) {
  const { keyword, group, current = 1, size = 20 } = params
  return request<PaginationResult<SiteConfigListItem>>({
    url: '/config/items',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {}),
      ...(group ? { group } : {})
    }
  }).then(toTableResponse)
}

export function createSiteConfig(data: CreateSiteConfigDto) {
  return request<SiteConfigListItem>({
    url: '/config/items',
    method: 'POST',
    data
  })
}

export function updateSiteConfig(id: string, data: UpdateSiteConfigDto) {
  return request<SiteConfigListItem>({
    url: `/config/items/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteSiteConfig(id: string) {
  return request<{ success: true }>({
    url: `/config/items/${id}`,
    method: 'DELETE'
  })
}

export function fetchSiteConfigByKey(key: string) {
  return request<SiteConfigByKeyResult>({
    url: `/config/by-key/${encodeURIComponent(key)}`,
    method: 'GET'
  })
}
