<!-- 列设置对话框：显隐、排序、列宽、冻结列 -->
<template>
  <ElDialog
    v-model="visible"
    :title="t('table.columnSettings.title')"
    width="760px"
    align-center
    destroy-on-close
    class="art-column-settings-dialog"
    @closed="handleClosed"
  >
    <div class="art-column-settings">
      <div class="art-column-settings__head">
        <div class="art-column-settings__cell art-column-settings__cell--check">
          <ElCheckbox
            :model-value="allSelected"
            :indeterminate="indeterminate"
            @update:model-value="toggleAll"
          >
            {{ t('table.columnSettings.selectAll') }}
          </ElCheckbox>
        </div>
        <div class="art-column-settings__cell art-column-settings__cell--title">
          {{ t('table.columnSettings.columnTitle') }}
        </div>
        <div class="art-column-settings__cell art-column-settings__cell--width">
          {{ t('table.columnSettings.columnWidth') }}
        </div>
        <div class="art-column-settings__cell art-column-settings__cell--freeze">
          {{ t('table.columnSettings.freezeColumn') }}
        </div>
      </div>

      <ElScrollbar max-height="420px">
        <VueDraggable
          v-model="draftColumns"
          item-key="dragKey"
          handle=".art-column-settings__drag"
          filter=".is-fixed-row"
          :prevent-on-filter="false"
          @move="checkColumnMove"
        >
          <div
            v-for="item in draftColumns"
            :key="item.dragKey"
            class="art-column-settings__row"
            :class="{ 'is-fixed-row': isFixedRow(item) }"
          >
            <div class="art-column-settings__cell art-column-settings__cell--check">
              <ElCheckbox
                :model-value="getColumnVisibility(item)"
                :disabled="item.disabled"
                @update:model-value="(val) => updateVisibility(item, val)"
              />
            </div>
            <div class="art-column-settings__cell art-column-settings__cell--title">
              <span class="art-column-settings__drag" :class="{ 'is-disabled': isFixedRow(item) }">
                <ArtSvgIcon icon="ri:drag-move-2-fill" />
              </span>
              <span class="art-column-settings__label">
                {{ getColumnLabel(item) }}
              </span>
            </div>
            <div class="art-column-settings__cell art-column-settings__cell--width">
              <ElInputNumber
                :model-value="getColumnWidth(item)"
                :min="60"
                :max="800"
                :step="1"
                controls-position="right"
                @update:model-value="(val) => setColumnWidth(item, val)"
              />
            </div>
            <div class="art-column-settings__cell art-column-settings__cell--freeze">
              <ElRadioGroup
                :model-value="getFreezeValue(item)"
                size="small"
                @update:model-value="(val) => setFreezeValue(item, val as FreezeValue)"
              >
                <ElRadioButton value="left">
                  {{ t('table.columnSettings.freezeLeft') }}
                </ElRadioButton>
                <ElRadioButton value="none">
                  {{ t('table.columnSettings.freezeNone') }}
                </ElRadioButton>
                <ElRadioButton value="right">
                  {{ t('table.columnSettings.freezeRight') }}
                </ElRadioButton>
              </ElRadioGroup>
            </div>
          </div>
        </VueDraggable>
      </ElScrollbar>
    </div>

    <template #footer>
      <ElButton @click="handleReset">{{ t('table.columnSettings.restoreDefault') }}</ElButton>
      <ElButton @click="handleCancel">{{ t('common.cancel') }}</ElButton>
      <ElButton type="primary" @click="handleConfirm">{{ t('common.confirm') }}</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { VueDraggable } from 'vue-draggable-plus'
  import { useI18n } from 'vue-i18n'
  import { getColumnKey, getColumnVisibility } from '@/hooks/core/useTableColumns'
  import type { ColumnOption } from '@/types/component'

  defineOptions({ name: 'ArtTableColumnSettings' })

  type FreezeValue = 'left' | 'none' | 'right'

  type DraftColumn = ColumnOption & { dragKey: string }

  const MAX_FREEZE_COLUMNS = 4

  const props = defineProps<{
    modelValue: boolean
    columns: ColumnOption[]
    defaultColumns: ColumnOption[]
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    confirm: [columns: ColumnOption[]]
  }>()

  const { t } = useI18n()

  const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
  })

  const draftColumns = ref<DraftColumn[]>([])

  const selectableColumns = computed(() => draftColumns.value.filter((col) => !col.disabled))

  const allSelected = computed(
    () =>
      selectableColumns.value.length > 0 &&
      selectableColumns.value.every((col) => getColumnVisibility(col))
  )

  const indeterminate = computed(() => {
    const checkedCount = selectableColumns.value.filter((col) => getColumnVisibility(col)).length
    return checkedCount > 0 && checkedCount < selectableColumns.value.length
  })

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        draftColumns.value = cloneColumns(props.columns)
      }
    }
  )

  function cloneColumns(columns: ColumnOption[]): DraftColumn[] {
    return columns.map((col) => ({
      ...col,
      dragKey: getColumnKey(col)
    }))
  }

  function stripDraftColumns(columns: DraftColumn[]): ColumnOption[] {
    return columns.map(({ dragKey: _dragKey, ...col }) => ({ ...col }))
  }

  function getColumnLabel(col: ColumnOption): string {
    if (col.label) return col.label
    if (col.type === 'selection') return t('table.selection')
    if (col.type === 'index' || col.type === 'globalIndex') return t('table.column.index')
    if (col.type === 'expand') return t('table.column.expand')
    return col.prop || '-'
  }

  function getColumnWidth(col: ColumnOption): number {
    const raw = col.width ?? col.minWidth
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string') {
      const parsed = Number.parseInt(raw, 10)
      return Number.isFinite(parsed) ? parsed : 120
    }
    return 120
  }

  function setColumnWidth(col: DraftColumn, value: number | undefined) {
    if (value === undefined) return
    col.width = value
    col.minWidth = undefined
  }

  function getFreezeValue(col: ColumnOption): FreezeValue {
    if (col.fixed === 'left') return 'left'
    if (col.fixed === 'right') return 'right'
    return 'none'
  }

  function countFrozenColumns(columns: DraftColumn[]): number {
    return columns.filter((col) => col.fixed === 'left' || col.fixed === 'right').length
  }

  function setFreezeValue(col: DraftColumn, value: FreezeValue) {
    if (value === 'none') {
      col.fixed = undefined
      return
    }

    const wasFrozen = col.fixed === 'left' || col.fixed === 'right'
    if (!wasFrozen && countFrozenColumns(draftColumns.value) >= MAX_FREEZE_COLUMNS) {
      ElMessage.warning(t('table.columnSettings.maxFreezeTip'))
      return
    }

    col.fixed = value
  }

  function updateVisibility(col: DraftColumn, value: boolean | string | number) {
    const visibleValue = !!value
    col.checked = visibleValue
    col.visible = visibleValue
  }

  function toggleAll(value: boolean | string | number) {
    const visibleValue = !!value
    draftColumns.value.forEach((col) => {
      if (!col.disabled) {
        col.checked = visibleValue
        col.visible = visibleValue
      }
    })
  }

  function isFixedRow(col: DraftColumn): boolean {
    return Boolean(col.fixed)
  }

  function checkColumnMove(event: { related: HTMLElement }) {
    return !event.related?.classList.contains('is-fixed-row')
  }

  function handleReset() {
    draftColumns.value = cloneColumns(props.defaultColumns)
  }

  function handleCancel() {
    visible.value = false
  }

  function handleConfirm() {
    emit('confirm', stripDraftColumns(draftColumns.value))
    visible.value = false
  }

  function handleClosed() {
    draftColumns.value = []
  }
</script>

<style scoped lang="scss">
  .art-column-settings {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: calc(var(--custom-radius) / 2 + 2px);
    overflow: hidden;

    &__head,
    &__row {
      display: grid;
      grid-template-columns: 88px minmax(160px, 1fr) 140px minmax(220px, 280px);
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
    }

    &__head {
      font-size: 13px;
      font-weight: 500;
      color: var(--el-text-color-regular);
      background: var(--el-fill-color-lighter);
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    &__row {
      font-size: 13px;
      color: var(--el-text-color-primary);
      border-bottom: 1px solid var(--el-border-color-extra-light);

      &:last-child {
        border-bottom: none;
      }
    }

    &__cell {
      display: flex;
      align-items: center;
      min-width: 0;

      &--title {
        gap: 8px;
      }

      &--width {
        :deep(.el-input-number) {
          width: 100%;
        }
      }

      &--freeze {
        :deep(.el-radio-group) {
          display: flex;
          width: 100%;
        }

        :deep(.el-radio-button) {
          flex: 1;
        }

        :deep(.el-radio-button__inner) {
          width: 100%;
          padding-inline: 8px;
        }
      }
    }

    &__drag {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: var(--el-text-color-secondary);
      cursor: move;

      &.is-disabled {
        color: var(--el-text-color-disabled);
        cursor: default;
      }
    }

    &__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
