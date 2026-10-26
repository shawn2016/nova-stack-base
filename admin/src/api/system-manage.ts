import type {
  AssignRolePermissionsDto,
  AssignUserRolesDto,
  CreateMenuDto,
  CreateRoleDto,
  CreateUserDto,
  PaginationResult,
  SysMenuListItem,
  SysPermissionOption,
  SysRoleDetail,
  SysRoleListItem,
  SysUserDetail,
  SysUserListItem,
  UpdateMenuDto,
  UpdateRoleDto,
  UpdateUserDto
} from '@nova/shared-types'
import { request } from './request'

export interface UserListQuery {
  keyword?: string
  current?: number
  size?: number
}

export interface RoleListQuery {
  keyword?: string
  current?: number
  size?: number
}

export interface MenuListQuery {
  keyword?: string
  page?: number
  pageSize?: number
}

function toTableResponse<T>(result: PaginationResult<T>) {
  return {
    records: result.list,
    total: result.total,
    current: result.page,
    size: result.pageSize
  }
}

function buildListParams(params: { current?: number; size?: number; keyword?: string }) {
  const { current = 1, size = 20, keyword } = params
  return {
    page: current,
    pageSize: size,
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {})
  }
}

export function fetchUserList(params: UserListQuery = {}) {
  return request<PaginationResult<SysUserListItem>>({
    url: '/users',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function fetchUserDetail(id: string) {
  return request<SysUserDetail>({
    url: `/users/${id}`,
    method: 'GET'
  })
}

export function createUser(data: CreateUserDto) {
  return request<SysUserDetail>({
    url: '/users',
    method: 'POST',
    data
  })
}

export function updateUser(id: string, data: UpdateUserDto) {
  return request<SysUserDetail>({
    url: `/users/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteUser(id: string) {
  return request<{ success: true }>({
    url: `/users/${id}`,
    method: 'DELETE'
  })
}

export function assignUserRoles(id: string, data: AssignUserRolesDto) {
  return request<SysUserDetail>({
    url: `/users/${id}/roles`,
    method: 'PUT',
    data
  })
}

export function fetchRoleList(params: RoleListQuery = {}) {
  return request<PaginationResult<SysRoleListItem>>({
    url: '/roles',
    method: 'GET',
    params: buildListParams(params)
  }).then(toTableResponse)
}

export function fetchRoleDetail(id: string) {
  return request<SysRoleDetail>({
    url: `/roles/${id}`,
    method: 'GET'
  })
}

export function fetchPermissionOptions() {
  return request<SysPermissionOption[]>({
    url: '/roles/permission-options',
    method: 'GET'
  })
}

export function createRole(data: CreateRoleDto) {
  return request<SysRoleDetail>({
    url: '/roles',
    method: 'POST',
    data
  })
}

export function updateRole(id: string, data: UpdateRoleDto) {
  return request<SysRoleDetail>({
    url: `/roles/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteRole(id: string) {
  return request<{ success: true }>({
    url: `/roles/${id}`,
    method: 'DELETE'
  })
}

export function assignRolePermissions(id: string, data: AssignRolePermissionsDto) {
  return request<SysRoleDetail>({
    url: `/roles/${id}/permissions`,
    method: 'PUT',
    data
  })
}

/** 菜单管理需完整列表以构建树，默认拉取较大 pageSize */
export function fetchMenuList(params: MenuListQuery = {}) {
  const { keyword, page = 1, pageSize = 500 } = params
  return request<PaginationResult<SysMenuListItem>>({
    url: '/menus',
    method: 'GET',
    params: {
      page,
      pageSize,
      ...(keyword?.trim() ? { keyword: keyword.trim() } : {})
    }
  }).then((result) => result.list)
}

export function createMenu(data: CreateMenuDto) {
  return request<SysMenuListItem>({
    url: '/menus',
    method: 'POST',
    data
  })
}

export function updateMenu(id: string, data: UpdateMenuDto) {
  return request<SysMenuListItem>({
    url: `/menus/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteMenu(id: string) {
  return request<{ success: true }>({
    url: `/menus/${id}`,
    method: 'DELETE'
  })
}
