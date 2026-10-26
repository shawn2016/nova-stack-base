import type {
  CreateRegionDto,
  PaginationResult,
  RegionListItem,
  RegionTreeNode,
  UpdateRegionDto
} from '@nova/shared-types'
import { request } from './request'

export interface RegionListQuery {
  keyword?: string
  level?: 1 | 2 | 3
  parentId?: string
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

export function fetchRegionTree() {
  return request<RegionTreeNode[]>({
    url: '/regions/tree',
    method: 'GET'
  })
}

export function fetchRegionList(params: RegionListQuery = {}) {
  const { keyword, level, parentId, current = 1, size = 20 } = params
  return request<PaginationResult<RegionListItem>>({
    url: '/regions',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(parentId ? { parentId } : {})
    }
  }).then(toTableResponse)
}

export function fetchRegionById(id: string) {
  return request<RegionListItem>({
    url: `/regions/${id}`,
    method: 'GET'
  })
}

export function createRegion(data: CreateRegionDto) {
  return request<RegionListItem>({
    url: '/regions',
    method: 'POST',
    data
  })
}

export function updateRegion(id: string, data: UpdateRegionDto) {
  return request<RegionListItem>({
    url: `/regions/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteRegion(id: string) {
  return request<{ success: true }>({
    url: `/regions/${id}`,
    method: 'DELETE'
  })
}
