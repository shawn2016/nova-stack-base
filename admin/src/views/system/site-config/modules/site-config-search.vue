<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
    embedded
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  import type { SiteConfigListQuery } from '@/api/site-config'

  interface Props {
    modelValue: SiteConfigListQuery
  }

  interface Emits {
    (e: 'update:modelValue', value: SiteConfigListQuery): void
    (e: 'search', params: SiteConfigListQuery): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const searchBarRef = ref()

  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const rules = {}

  const formItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      placeholder: '配置键或名称',
      clearable: true
    },
    {
      label: '分组',
      key: 'group',
      type: 'input',
      placeholder: '如 site',
      clearable: true
    }
  ])

  const handleReset = () => {
    emit('reset')
  }

  const handleSearch = async (params: SiteConfigListQuery) => {
    await searchBarRef.value.validate()
    emit('search', params)
  }
</script>
