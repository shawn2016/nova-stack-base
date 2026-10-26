<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
    embedded
    :showExpand="false"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  import type { OperLogListQuery } from '@/api/audit-log'

  export interface OperLogSearchForm extends Omit<OperLogListQuery, 'startTime' | 'endTime'> {
    dateRange?: [string, string]
  }

  interface Props {
    modelValue: OperLogSearchForm
  }

  interface Emits {
    (e: 'update:modelValue', value: OperLogSearchForm): void
    (e: 'search', params: OperLogListQuery): void
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

  const statusOptions = [
    { label: '成功', value: 1 },
    { label: '失败', value: 0 }
  ]

  const formItems = computed(() => [
    {
      label: '用户名',
      key: 'username',
      type: 'input',
      placeholder: '请输入用户名',
      clearable: true
    },
    {
      label: '模块',
      key: 'module',
      type: 'input',
      placeholder: '如 dict、users',
      clearable: true
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        options: statusOptions,
        clearable: true
      }
    },
    {
      label: '时间范围',
      key: 'dateRange',
      type: 'datetimerange',
      props: {
        type: 'datetimerange',
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
        startPlaceholder: '开始时间',
        endPlaceholder: '结束时间',
        clearable: true
      }
    }
  ])

  function toQueryParams(params: OperLogSearchForm): OperLogListQuery {
    const { dateRange, ...rest } = params
    return {
      ...rest,
      ...(dateRange?.[0] ? { startTime: dateRange[0] } : {}),
      ...(dateRange?.[1] ? { endTime: dateRange[1] } : {})
    }
  }

  const handleReset = () => {
    emit('reset')
  }

  const handleSearch = async (params: OperLogSearchForm) => {
    await searchBarRef.value.validate()
    emit('search', toQueryParams(params))
  }
</script>
