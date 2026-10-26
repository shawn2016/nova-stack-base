import type {
  CreateDictDataDto,
  CreateDictTypeDto,
  DictDataListItem,
  DictOption,
  DictTypeListItem,
  PaginationResult,
  UpdateDictDataDto,
  UpdateDictTypeDto
} from '@nova/shared-types'
import { request } from './request'

export interface DictTypeListQuery {
  keyword?: string
  current?: number
  size?: number
}

export interface DictDataListQuery {
  typeId?: string
  typeCode?: string
  keyword?: string
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

export function fetchDictTypeList(params: DictTypeListQuery = {}) {
  const { keyword, current = 1, size = 20 } = params
  return request<PaginationResult<DictTypeListItem>>({
    url: '/dict/types',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {})
    }
  }).then(toTableResponse)
}

export function createDictType(data: CreateDictTypeDto) {
  return request<DictTypeListItem>({
    url: '/dict/types',
    method: 'POST',
    data
  })
}

export function updateDictType(id: string, data: UpdateDictTypeDto) {
  return request<DictTypeListItem>({
    url: `/dict/types/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteDictType(id: string) {
  return request<{ success: true }>({
    url: `/dict/types/${id}`,
    method: 'DELETE'
  })
}

export function fetchDictDataList(params: DictDataListQuery = {}) {
  const { typeId, typeCode, keyword, current = 1, size = 20 } = params
  return request<PaginationResult<DictDataListItem>>({
    url: '/dict/data',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(typeId ? { typeId } : {}),
      ...(typeCode ? { typeCode } : {}),
      ...(keyword ? { keyword } : {})
    }
  }).then(toTableResponse)
}

export function createDictData(data: CreateDictDataDto) {
  return request<DictDataListItem>({
    url: '/dict/data',
    method: 'POST',
    data
  })
}

export function updateDictData(id: string, data: UpdateDictDataDto) {
  return request<DictDataListItem>({
    url: `/dict/data/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteDictData(id: string) {
  return request<{ success: true }>({
    url: `/dict/data/${id}`,
    method: 'DELETE'
  })
}

export function fetchDictOptionsByType(code: string) {
  return request<DictOption[]>({
    url: `/dict/data/by-type/${encodeURIComponent(code)}`,
    method: 'GET'
  })
}
