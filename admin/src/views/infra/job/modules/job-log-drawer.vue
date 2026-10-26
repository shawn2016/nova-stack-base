<template>
  <ElDrawer v-model="drawerVisible" title="执行日志" size="640px">
    <ArtTable
      :loading="loading"
      :data="data"
      :columns="columns"
      :pagination="pagination"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    />
  </ElDrawer>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { fetchJobLogList } from '@/api/job'
  import type { JobLogListItem } from '@nova/shared-types'
  import { ElTag } from 'element-plus'

  interface Props {
    visible: boolean
    jobId: string
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

  const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const {
    columns,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchJobLogList,
      apiParams: { current: 1, size: 20, jobId: '' },
      immediate: false,
      columnsFactory: () => [
        {
          prop: 'startTime',
          label: '开始时间',
          minWidth: 160,
          formatter: (row: JobLogListItem) => new Date(row.startTime).toLocaleString('zh-CN')
        },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (row: JobLogListItem) =>
            h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
              row.status === 1 ? '成功' : '失败'
            )
        },
        { prop: 'durationMs', label: '耗时(ms)', width: 100 },
        { prop: 'message', label: '消息', minWidth: 140, showOverflowTooltip: true }
      ]
    }
  })

  watch(
    () => [props.visible, props.jobId] as const,
    ([visible, jobId]) => {
      if (visible && jobId) {
        replaceSearchParams({ jobId, current: 1, size: pagination.size })
        getData()
      }
    }
  )
</script>
