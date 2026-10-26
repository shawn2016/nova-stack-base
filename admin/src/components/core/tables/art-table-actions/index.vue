<!-- 表格文字型操作：编辑 | 删除 | 更多，最多展示 3 项 -->
<template>
  <div v-if="visibleItems.length" class="art-table-actions">
    <template v-for="(item, index) in inlineItems" :key="item.key">
      <span v-if="index > 0" class="art-table-actions__divider">|</span>
      <span
        class="art-table-actions__link"
        :class="{ 'is-danger': item.danger, 'is-disabled': item.disabled }"
        @click="handleItemClick(item)"
      >
        {{ item.label }}
      </span>
    </template>

    <template v-if="overflowItems.length">
      <span class="art-table-actions__divider">|</span>
      <ElDropdown trigger="hover" @command="handleOverflowCommand">
        <span class="art-table-actions__link">更多</span>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem
              v-for="item in overflowItems"
              :key="item.key"
              :command="item.key"
              :disabled="item.disabled"
            >
              <span :class="{ 'text-danger': item.danger }">{{ item.label }}</span>
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </template>
  </div>
  <span v-else class="art-table-actions__empty">-</span>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'ArtTableActions' })

  export interface TableActionItem {
    key: string | number
    label: string
    danger?: boolean
    disabled?: boolean
    auth?: string
    onClick?: () => void
  }

  interface Props {
    items: TableActionItem[]
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    (e: 'action', item: TableActionItem): void
  }>()

  const userStore = useUserStore()
  const MAX_INLINE = 3

  const visibleItems = computed(() =>
    props.items.filter((item) => !item.auth || userStore.hasPermission(item.auth))
  )

  const inlineItems = computed(() => {
    const items = visibleItems.value
    if (items.length <= MAX_INLINE) return items
    return items.slice(0, MAX_INLINE - 1)
  })

  const overflowItems = computed(() => {
    const items = visibleItems.value
    if (items.length <= MAX_INLINE) return []
    return items.slice(MAX_INLINE - 1)
  })

  const itemMap = computed(() => {
    const map = new Map<string | number, TableActionItem>()
    visibleItems.value.forEach((item) => map.set(item.key, item))
    return map
  })

  function handleItemClick(item: TableActionItem) {
    if (item.disabled) return
    item.onClick?.()
    emit('action', item)
  }

  function handleOverflowCommand(key: string | number) {
    const item = itemMap.value.get(key)
    if (item) handleItemClick(item)
  }
</script>

<style lang="scss" scoped>
  .art-table-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: nowrap;
    white-space: nowrap;
    line-height: 1;
    max-width: 100%;

    &__divider {
      flex-shrink: 0;
      margin: 0 6px;
      color: var(--el-border-color-lighter);
      user-select: none;
    }

    &__link {
      flex-shrink: 0;
      font-size: 13px;
      line-height: 1.4;
      color: var(--el-color-primary);
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        opacity: 0.85;
      }

      &.is-danger {
        color: var(--el-color-danger);
      }

      &.is-disabled {
        color: var(--el-text-color-disabled);
        cursor: not-allowed;
      }
    }

    &__empty {
      color: var(--el-text-color-placeholder);
    }
  }

  .text-danger {
    color: var(--el-color-danger);
  }
</style>
