<template>
  <div class="menu-icon-picker">
    <ElPopover
      v-model:visible="popoverVisible"
      placement="bottom-start"
      :width="480"
      trigger="click"
      popper-class="menu-icon-picker-popper"
      @show="handlePopoverShow"
    >
      <template #reference>
        <ElInput
          :model-value="modelValue"
          placeholder="请选择或输入图标，如 ri:user-line"
          clearable
          @update:model-value="emit('update:modelValue', $event)"
          @clear="emit('update:modelValue', '')"
        >
          <template #prepend>
            <div class="menu-icon-picker__preview flex-cc">
              <ArtSvgIcon v-if="modelValue" :icon="modelValue" class="text-lg" />
              <span v-else class="text-g-400 text-xs">无</span>
            </div>
          </template>
        </ElInput>
      </template>

      <div class="menu-icon-picker-panel">
        <ElInput
          v-model="keyword"
          placeholder="搜索图标名称，如 user、settings"
          clearable
          :prefix-icon="Search"
        />

        <div class="menu-icon-picker-panel__meta"> 共 {{ filteredIcons.length }} 个图标 </div>

        <div class="menu-icon-picker-panel__grid">
          <button
            v-for="icon in pagedIcons"
            :key="icon"
            type="button"
            class="menu-icon-picker-panel__item flex-cc"
            :class="{ 'is-active': modelValue === icon }"
            :title="icon"
            @click="selectIcon(icon)"
          >
            <ArtSvgIcon :icon="icon" />
          </button>
        </div>

        <ElEmpty v-if="filteredIcons.length === 0" description="未找到匹配图标" :image-size="56" />

        <div v-if="filteredIcons.length > 0" class="menu-icon-picker-panel__pager">
          <ElPagination
            v-model:current-page="currentPage"
            :page-size="MENU_ICON_PAGE_SIZE"
            :total="filteredIcons.length"
            :pager-count="5"
            layout="prev, pager, next"
            small
            background
          />
        </div>
      </div>
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
  import { Search } from '@element-plus/icons-vue'
  import { MENU_ICON_CATALOG, MENU_ICON_PAGE_SIZE } from '@/constants/menu-icons'

  defineOptions({ name: 'MenuIconPicker' })

  defineProps<{
    modelValue: string
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
  }>()

  const popoverVisible = ref(false)
  const keyword = ref('')
  const currentPage = ref(1)

  const filteredIcons = computed(() => {
    const q = keyword.value.trim().toLowerCase()
    if (!q) return MENU_ICON_CATALOG
    return MENU_ICON_CATALOG.filter((icon) => icon.toLowerCase().includes(q))
  })

  const pagedIcons = computed(() => {
    const start = (currentPage.value - 1) * MENU_ICON_PAGE_SIZE
    return filteredIcons.value.slice(start, start + MENU_ICON_PAGE_SIZE)
  })

  watch(keyword, () => {
    currentPage.value = 1
  })

  watch(filteredIcons, (list) => {
    const maxPage = Math.max(1, Math.ceil(list.length / MENU_ICON_PAGE_SIZE))
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  })

  function handlePopoverShow() {
    keyword.value = ''
    currentPage.value = 1
  }

  function selectIcon(icon: string) {
    emit('update:modelValue', icon)
    popoverVisible.value = false
  }
</script>

<style scoped lang="scss">
  .menu-icon-picker {
    width: 100%;
  }

  .menu-icon-picker__preview {
    width: 28px;
    height: 28px;
  }
</style>

<style lang="scss">
  .menu-icon-picker-popper {
    padding: 12px !important;
    overflow: hidden;
    box-sizing: border-box;
  }

  .menu-icon-picker-panel {
    &__meta {
      margin-top: 8px;
      color: var(--el-text-color-secondary);
      font-size: 12px;
      line-height: 1;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      align-content: start;
      align-items: start;
      gap: 6px;
      min-height: 228px;
      margin: 10px 0 8px;
    }

    &__item {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      height: 32px;
      padding: 0;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: calc(var(--custom-radius) / 2 + 2px);
      background: var(--el-fill-color-blank);
      color: var(--el-text-color-regular);
      cursor: pointer;
      transition:
        border-color 0.2s,
        background-color 0.2s,
        color 0.2s;

      .art-svg-icon,
      svg {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }

      &:hover,
      &.is-active {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
    }

    &__pager {
      display: flex;
      justify-content: center;
      padding-top: 4px;
    }
  }
</style>
