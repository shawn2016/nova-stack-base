import type { ComponentSize } from 'element-plus'

/**
 * 全局 UI 配置
 *
 * 与 App.vue ElConfigProvider、CSS 变量 (--el-component-custom-height) 保持一致。
 */
export const uiConfig = {
  /** Element Plus 全局组件尺寸 */
  elementSize: 'default' as ComponentSize,
  /** 主内容区四边统一内边距（px） */
  contentInset: 10
} as const

export type UiConfig = typeof uiConfig
