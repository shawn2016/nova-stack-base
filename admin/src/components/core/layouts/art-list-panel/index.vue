<!-- 列表页一体化容器：Tab + 搜索 + 表格，区块间分割线分隔 -->
<template>
  <div class="art-list-panel art-full-height">
    <ElCard class="art-list-panel__card art-table-card">
      <header
        v-if="tabs.length"
        class="art-list-panel__head art-list-panel__head--tabs"
        :class="`is-size-${componentSize}`"
      >
        <nav class="art-list-panel__tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            type="button"
            role="tab"
            class="art-list-panel__tab"
            :class="{ 'is-active': activeTab === tab.name }"
            :aria-selected="activeTab === tab.name"
            @click="handleTabChange(tab.name)"
          >
            {{ tab.label }}
          </button>
        </nav>
        <div v-if="$slots['head-actions']" class="art-list-panel__head-actions">
          <slot name="head-actions" />
        </div>
      </header>

      <header v-else-if="title" class="art-list-panel__head" :class="`is-size-${componentSize}`">
        <h2 class="art-list-panel__title">{{ title }}</h2>
        <div v-if="$slots['head-actions']" class="art-list-panel__head-actions">
          <slot name="head-actions" />
        </div>
      </header>

      <div v-if="showSearchSection" class="art-list-panel__search">
        <slot name="search" :embedded="true" />
      </div>

      <div class="art-list-panel__body">
        <ArtTableHeader
          v-if="showTableHeader"
          v-model:columns="columns"
          v-model:showSearchBar="headerSearchToggle"
          :loading="loading"
          :show-zebra="showZebra"
          :layout="tableHeaderLayout"
          :compact-tools="compactTools"
          @refresh="emit('refresh')"
        >
          <template v-if="$slots['toolbar-left']" #left>
            <slot name="toolbar-left" />
          </template>
        </ArtTableHeader>

        <div class="art-list-panel__table">
          <slot />
        </div>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import type { ColumnOption } from '@/types/component'
  import { useSlots } from 'vue'
  import { useGlobalConfig } from 'element-plus'
  import { listPanelConfig } from '@/config/modules/listPanel'
  import { ART_LIST_PANEL_TOOLS_KEY, type ArtListPanelToolsContext } from './context'

  defineOptions({ name: 'ArtListPanel' })

  export interface ArtListPanelTab {
    name: string
    label: string
  }

  interface Props {
    /** 页面标题（无 Tab 时显示在左上角，样式同 Tab 栏） */
    title?: string
    /** 顶部分页签，不传则不渲染 Tab 区 */
    tabs?: readonly ArtListPanelTab[]
    loading?: boolean
    /** 无搜索 slot 时可关闭搜索折叠按钮 */
    showSearchToggle?: boolean
    tableHeaderLayout?: string
    /** 表格斑马纹开关（树形表等可设为 false） */
    showZebra?: boolean
    /** 工具栏收起到操作列表头的设置按钮，默认见 listPanelConfig */
    compactTools?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    title: '',
    tabs: () => [],
    loading: false,
    showSearchToggle: listPanelConfig.showSearchToggle,
    tableHeaderLayout: listPanelConfig.tableHeaderLayout,
    showZebra: listPanelConfig.showZebra,
    compactTools: listPanelConfig.compactTools
  })

  const globalConfig = useGlobalConfig()
  const componentSize = computed(() => globalConfig.value?.size || 'default')

  const activeTab = defineModel<string>('activeTab')
  const showSearchBar = defineModel<boolean>('showSearchBar', { default: true })
  const columns = defineModel<ColumnOption[]>('columns', { default: () => [] })

  const emit = defineEmits<{
    refresh: []
    'tab-change': [name: string]
  }>()

  const slots = useSlots()

  const hasSearchSlot = computed(() => Boolean(slots.search))

  const showSearchSection = computed(
    () => hasSearchSlot.value && showSearchBar.value !== false && showSearchBar.value
  )

  const headerSearchToggle = computed({
    get: () => (hasSearchSlot.value ? showSearchBar.value : undefined),
    set: (value: boolean | undefined) => {
      if (hasSearchSlot.value && value !== undefined) {
        showSearchBar.value = value
      }
    }
  })

  function handleTabChange(name: string) {
    if (activeTab.value !== name) {
      activeTab.value = name
      emit('tab-change', name)
    }
  }

  const compactTools = computed(() => props.compactTools)

  const showTableHeader = computed(() => !(props.compactTools && !slots['toolbar-left']))

  provide(ART_LIST_PANEL_TOOLS_KEY, {
    compactTools,
    columns,
    showSearchBar: headerSearchToggle,
    loading: computed(() => props.loading),
    layout: computed(() => props.tableHeaderLayout),
    showZebra: computed(() => props.showZebra),
    onRefresh: () => emit('refresh')
  } satisfies ArtListPanelToolsContext)
</script>

<style lang="scss" scoped>
  .art-list-panel {
    min-height: 0;

    &__card {
      flex: 1;
      min-height: 0;
      margin-top: 0 !important;
      border-radius: calc(var(--custom-radius) / 2 + 2px) !important;

      :deep(.el-card__body) {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        padding: 0;
      }
    }

    &__tabs {
      display: flex;
      flex: 1;
      gap: 0;
      align-items: stretch;
      min-width: 0;
      padding: 0;
      background: transparent;
      border-bottom: none;
    }

    &__head {
      display: flex;
      flex-shrink: 0;
      align-items: stretch;
      justify-content: space-between;
      min-height: 48px;
      background: var(--el-fill-color-lighter);
      border-bottom: 1px solid var(--el-border-color-lighter);

      &--tabs {
        .art-list-panel__head-actions {
          align-self: center;
        }
      }

      &.is-size-small {
        min-height: 56px;

        .art-list-panel__title {
          padding: 16px 20px;
          font-size: 17px;
        }

        .art-list-panel__head-actions {
          padding: 12px 16px;
        }
      }

      &.is-size-large {
        min-height: 52px;

        .art-list-panel__title {
          padding: 14px 20px;
          font-size: 17px;
        }

        .art-list-panel__head-actions {
          padding: 10px 16px;
        }
      }
    }

    &__title {
      display: flex;
      align-items: center;
      margin: 0;
      padding: 13px 20px;
      font-size: 16px;
      font-weight: 500;
      line-height: 1;
      color: var(--el-text-color-primary);
      background: transparent;
    }

    &__head-actions {
      display: flex;
      flex-shrink: 0;
      gap: 8px;
      align-items: center;
      padding: 8px 16px;
    }

    &__tab {
      position: relative;
      padding: 13px 20px;
      font-size: 16px;
      font-weight: 400;
      line-height: 1;
      color: var(--el-text-color-regular);
      cursor: pointer;
      background: transparent;
      border: none;
      transition:
        color 0.2s ease,
        background-color 0.2s ease;

      &:hover:not(.is-active) {
        color: var(--el-color-primary);
      }

      &.is-active {
        font-weight: 500;
        color: var(--el-color-primary);
        background: var(--default-box-color);

        &::after {
          position: absolute;
          right: 0;
          bottom: -1px;
          left: 0;
          height: 2px;
          content: '';
          background: var(--el-color-primary);
        }
      }
    }

    &__search {
      flex-shrink: 0;

      :deep(.art-search-bar) {
        padding: 16px 20px 0;
        background: transparent;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0;

        .action-buttons-wrapper {
          margin-bottom: 6px;
        }
      }
    }

    &__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      padding: 6px 16px 16px;
    }

    &__table {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;

      :deep(.art-table) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;

        .el-table {
          flex: 1;
          min-height: 0;
        }

        .pagination {
          flex-shrink: 0;
          margin-top: auto;
          padding-top: 8px;
        }
      }
    }
  }
</style>
