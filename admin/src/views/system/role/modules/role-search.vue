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
  import type { RoleListQuery } from '@/api/system-manage'

  interface Props {
    modelValue: RoleListQuery
  }

  interface Emits {
    (e: 'update:modelValue', value: RoleListQuery): void
    (e: 'search', params: RoleListQuery): void
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
      placeholder: '角色名称或编码',
      clearable: true
    }
  ])

  const handleReset = () => {
    emit('reset')
  }

  const handleSearch = async (params: RoleListQuery) => {
    await searchBarRef.value.validate()
    emit('search', params)
  }
</script>
