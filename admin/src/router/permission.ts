import type { AppRouteRecord } from '@/types/router'

/** 不进侧栏菜单的静态补充路由 */
export const hiddenRoutes: AppRouteRecord[] = []

let removeHiddenRouteFns: Array<() => void> = []

export function appendHiddenRoutes(menuList: AppRouteRecord[]): AppRouteRecord[] {
  return [...menuList, ...hiddenRoutes]
}

export function trackHiddenRouteRemovers(fns: Array<() => void>): void {
  removeHiddenRouteFns = fns
}

export function resetDynamicRoutes(): void {
  removeHiddenRouteFns.forEach((fn) => fn())
  removeHiddenRouteFns = []
}
