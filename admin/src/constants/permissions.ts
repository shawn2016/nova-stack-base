/** 与 server seed 对齐的可分配权限码 */
export interface PermissionOption {
  code: string
  name: string
  group: string
}

export const PERMISSION_OPTIONS: PermissionOption[] = [
  { group: '用户管理', code: 'system:user:list', name: '用户列表' },
  { group: '用户管理', code: 'system:user:create', name: '用户新增' },
  { group: '用户管理', code: 'system:user:update', name: '用户编辑' },
  { group: '用户管理', code: 'system:user:delete', name: '用户删除' },
  { group: '角色管理', code: 'system:role:list', name: '角色列表' },
  { group: '角色管理', code: 'system:role:create', name: '角色新增' },
  { group: '角色管理', code: 'system:role:update', name: '角色编辑' },
  { group: '角色管理', code: 'system:role:delete', name: '角色删除' },
  { group: '菜单管理', code: 'system:menu:list', name: '菜单列表' },
  { group: '菜单管理', code: 'system:menu:create', name: '菜单新增' },
  { group: '菜单管理', code: 'system:menu:update', name: '菜单编辑' },
  { group: '菜单管理', code: 'system:menu:delete', name: '菜单删除' }
]

export const PERMISSION_GROUPS = [...new Set(PERMISSION_OPTIONS.map((item) => item.group))]
