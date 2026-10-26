import type {
  CreateDeptDto,
  DeptListItem,
  DeptSettings,
  DeptTreeNode,
  PaginationResult,
  UpdateDeptDto,
  UpdateDeptSettingsDto,
  UpdateDeptStatusDto
} from '@nova/shared-types'
import { request } from './request'

export interface DeptListQuery {
  keyword?: string
  status?: 0 | 1
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

export function fetchDeptTree() {
  return request<DeptTreeNode[]>({
    url: '/depts/tree',
    method: 'GET'
  })
}

export function fetchDeptTreeAll() {
  return request<DeptTreeNode[]>({
    url: '/depts/tree/all',
    method: 'GET'
  })
}

export function fetchDeptList(params: DeptListQuery = {}) {
  const { keyword, status, parentId, current = 1, size = 20 } = params
  return request<PaginationResult<DeptListItem>>({
    url: '/depts',
    method: 'GET',
    params: {
      page: current,
      pageSize: size,
      ...(keyword ? { keyword } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(parentId ? { parentId } : {})
    }
  }).then(toTableResponse)
}

export function createDept(data: CreateDeptDto) {
  return request<DeptListItem>({
    url: '/depts',
    method: 'POST',
    data
  })
}

export function updateDept(id: string, data: UpdateDeptDto) {
  return request<DeptListItem>({
    url: `/depts/${id}`,
    method: 'PUT',
    data
  })
}

export function updateDeptStatus(id: string, data: UpdateDeptStatusDto) {
  return request<DeptListItem>({
    url: `/depts/${id}/status`,
    method: 'PUT',
    data
  })
}

export function deleteDept(id: string) {
  return request<{ success: true }>({
    url: `/depts/${id}`,
    method: 'DELETE'
  })
}

export function fetchDeptSettings() {
  return request<DeptSettings>({
    url: '/depts/settings',
    method: 'GET'
  })
}

export function updateDeptSettings(data: UpdateDeptSettingsDto) {
  return request<DeptSettings>({
    url: '/depts/settings',
    method: 'PUT',
    data
  })
}
