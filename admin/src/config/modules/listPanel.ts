/**
 * 列表页一体化布局全局配置
 *
 * ArtListPanel 的默认行为由此集中管理，页面可按需覆盖单个 prop。
 *
 * @module config/modules/listPanel
 */

export const listPanelConfig = {
  /** 工具栏收起到操作列表头设置按钮 */
  compactTools: true,
  /** 无搜索 slot 时是否显示搜索折叠按钮 */
  showSearchToggle: true,
  /** 表格工具栏按钮布局 */
  tableHeaderLayout: 'search,refresh,size,fullscreen,columns,settings',
  /** 默认开启表格斑马纹 */
  showZebra: true
} as const

export type ListPanelConfig = typeof listPanelConfig
