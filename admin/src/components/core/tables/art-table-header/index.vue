<!-- 表格头部，包含表格大小、刷新、全屏、列设置、其他设置 -->
<template>
  <div class="flex-cb max-md:!block" id="art-table-header">
    <div class="flex-wrap">
      <slot name="left"></slot>
    </div>

    <div v-if="!compactTools" class="flex-c md:justify-end max-md:mt-3 max-sm:!hidden">
      <ArtTableTools
        variant="inline"
        v-model:columns="columns"
        v-model:show-search-bar="showSearchBarModel"
        :show-zebra="showZebra"
        :show-border="showBorder"
        :show-header-background="showHeaderBackground"
        :full-class="fullClass"
        :layout="layout"
        :loading="loading"
        @refresh="emit('refresh')"
        @search="emit('search')"
      />
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import type { ColumnOption } from '@/types/component'

  defineOptions({ name: 'ArtTableHeader' })

  interface Props {
    showZebra?: boolean
    showBorder?: boolean
    showHeaderBackground?: boolean
    fullClass?: string
    layout?: string
    loading?: boolean
    showSearchBar?: boolean
    compactTools?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    showZebra: true,
    showBorder: true,
    showHeaderBackground: true,
    fullClass: 'art-page-view',
    layout: 'search,refresh,size,fullscreen,columns,settings',
    showSearchBar: undefined,
    compactTools: false
  })

  const columns = defineModel<ColumnOption[]>('columns', {
    required: false,
    default: () => []
  })

  const emit = defineEmits<{
    refresh: []
    search: []
    'update:showSearchBar': [value: boolean]
  }>()

  const showSearchBarModel = computed({
    get: () => props.showSearchBar,
    set: (value: boolean | undefined) => {
      if (value !== undefined) emit('update:showSearchBar', value)
    }
  })
</script>
