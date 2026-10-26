import type { MenuNode } from '@nova/shared-types'
import type { AppRouteRecord } from '@/types/router'
import { RoutesAlias } from './routesAlias'
import { normalizeComponentPath } from './componentPath'

function routeNameFromPath(path: string): string {
  return path.replace(/^\//, '').replace(/\//g, '-') || 'root'
}

function toChildPath(fullPath: string, parentPath: string): string {
  if (parentPath && fullPath.startsWith(`${parentPath}/`)) {
    return fullPath.slice(parentPath.length + 1)
  }
  return fullPath.replace(/^\//, '')
}

function convertMenuNode(menu: MenuNode, parentPath = ''): AppRouteRecord | null {
  if (menu.type === 'button') {
    return null
  }

  const meta: AppRouteRecord['meta'] = {
    title: menu.name,
    icon: menu.icon || undefined
  }

  if (menu.type === 'directory') {
    const children = (menu.children ?? [])
      .map((child) => convertMenuNode(child, menu.path))
      .filter((item): item is AppRouteRecord => item !== null)

    if (!children.length) {
      return null
    }

    return {
      id: menu.id,
      path: menu.path,
      name: routeNameFromPath(menu.path),
      component: RoutesAlias.Layout,
      meta,
      children
    }
  }

  if (menu.type === 'menu' && menu.component) {
    return {
      id: menu.id,
      path: toChildPath(menu.path, parentPath),
      name: routeNameFromPath(menu.path),
      component: `/${normalizeComponentPath(menu.component)}`,
      meta
    }
  }

  return null
}

/** 将后端 MenuNode 树转为 art-design-pro 侧栏/路由结构 */
export function menuNodesToAppRoutes(menus: MenuNode[]): AppRouteRecord[] {
  return menus
    .map((menu) => convertMenuNode(menu))
    .filter((item): item is AppRouteRecord => item !== null)
}
