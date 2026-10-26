import { addCollection } from '@iconify/vue'
import { icons as remixCollection } from '@iconify-json/ri'
import * as ElementPlusIcons from '@element-plus/icons-vue'

addCollection(remixCollection)

/** 菜单常用 Iconify 图标（Remix Icon），未搜索时优先展示 */
export const MENU_ICON_PRESETS = [
  'ri:settings-3-line',
  'ri:user-line',
  'ri:shield-user-line',
  'ri:menu-line',
  'ri:folder-line',
  'ri:article-line',
  'ri:file-list-3-line',
  'ri:dashboard-line',
  'ri:home-line',
  'ri:lock-line',
  'ri:key-line',
  'ri:team-line',
  'ri:group-line',
  'ri:shopping-bag-line',
  'ri:store-line',
  'ri:bar-chart-line',
  'ri:pie-chart-line',
  'ri:notification-line',
  'ri:mail-line',
  'ri:image-line',
  'ri:video-line',
  'ri:tools-line',
  'ri:database-line',
  'ri:cloud-line'
] as const

function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/** Remix Icon 全集（Iconify ri: 前缀） */
export function buildRemixIconIds(): string[] {
  return Object.keys(remixCollection.icons)
    .map((id) => `ri:${id}`)
    .sort((a, b) => a.localeCompare(b))
}

/** Element Plus 图标（Iconify ep: 前缀） */
export function buildElementPlusIconIds(): string[] {
  return Object.keys(ElementPlusIcons)
    .filter((key) => /^[A-Z]/.test(key))
    .map((key) => `ep:${toKebabCase(key)}`)
    .sort((a, b) => a.localeCompare(b))
}

const REMIX_ICON_IDS = buildRemixIconIds()
const ELEMENT_PLUS_ICON_IDS = buildElementPlusIconIds()

/** 可选图标全集：常用 ri 优先，后接 Remix 全集与 Element Plus */
export const MENU_ICON_CATALOG: string[] = [
  ...new Set([...MENU_ICON_PRESETS, ...REMIX_ICON_IDS, ...ELEMENT_PLUS_ICON_IDS])
]

/** 每页展示数量（8 列 × 6 行） */
export const MENU_ICON_PAGE_SIZE = 48
