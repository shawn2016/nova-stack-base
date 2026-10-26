import type { SysMenuListItem, SysPermissionOption } from '@nova/shared-types'

export type PermissionTreeNodeType = 'directory' | 'menu' | 'permission'

export interface PermissionTreeNode {
  id: string
  label: string
  nodeType: PermissionTreeNodeType
  permissionCode?: string
  disabled?: boolean
  children?: PermissionTreeNode[]
}

function permissionModulePrefix(code: string | null): string | null {
  if (!code) return null
  const parts = code.split(':')
  if (parts.length < 2) return null
  return `${parts.slice(0, -1).join(':')}:`
}

function buildMenuBranch(
  menus: SysMenuListItem[],
  permissions: SysPermissionOption[],
  usedCodes: Set<string>,
  parentId = '0'
): PermissionTreeNode[] {
  return menus
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((menu) => {
      const childMenus = buildMenuBranch(menus, permissions, usedCodes, menu.id)
      const prefix = permissionModulePrefix(menu.permissionCode)
      const permissionChildren: PermissionTreeNode[] = []

      if (prefix) {
        for (const permission of permissions) {
          if (permission.code.startsWith(prefix)) {
            usedCodes.add(permission.code)
            permissionChildren.push({
              id: `perm:${permission.code}`,
              label: permission.name,
              nodeType: 'permission',
              permissionCode: permission.code
            })
          }
        }
      }

      const children = [...childMenus, ...permissionChildren]
      return {
        id: `menu:${menu.id}`,
        label: menu.name,
        nodeType: menu.type === 'directory' ? 'directory' : 'menu',
        disabled: true,
        ...(children.length ? { children } : {})
      }
    })
}

/** 按菜单树挂载权限；未匹配菜单的权限归入「其他权限」 */
export function buildPermissionTree(
  menus: SysMenuListItem[],
  permissions: SysPermissionOption[]
): PermissionTreeNode[] {
  const usedCodes = new Set<string>()
  const tree = buildMenuBranch(menus, permissions, usedCodes)

  const orphanPermissions = permissions
    .filter((item) => !usedCodes.has(item.code))
    .map((item) => ({
      id: `perm:${item.code}`,
      label: item.name,
      nodeType: 'permission' as const,
      permissionCode: item.code
    }))

  if (orphanPermissions.length) {
    tree.push({
      id: 'orphan-root',
      label: '其他权限',
      nodeType: 'directory',
      disabled: true,
      children: orphanPermissions
    })
  }

  return tree
}

export function permissionCodesToTreeKeys(codes: string[]): string[] {
  return codes.map((code) => `perm:${code}`)
}

export function treeKeysToPermissionCodes(keys: string[]): string[] {
  return keys.filter((key) => key.startsWith('perm:')).map((key) => key.slice(5))
}
