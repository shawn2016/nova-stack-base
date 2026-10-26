<template>
  <ArtListPanel
    v-model:active-tab="activeTab"
    v-model:show-search-bar="showSearchBar"
    v-model:columns="columnChecks"
    :tabs="AUDIT_LOG_TABS"
    :loading="loading"
    @refresh="refreshData"
  >
    <template #search>
      <OperLogSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />
    </template>

    <ArtTable
      :loading="loading"
      :data="data"
      :columns="columns"
      :pagination="pagination"
      @pagination:size-change="handleSizeChange"
      @pagination:current-change="handleCurrentChange"
    />
  </ArtListPanel>
</template>

<script setup lang="ts">
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchOperLogs } from '@/api/audit-log'
  import type { OperLogListQuery } from '@/api/audit-log'
  import type { OperLogListItem } from '@nova/shared-types'
  import { ElTag } from 'element-plus'
  import OperLogSearch from './oper-log-search.vue'
  import type { OperLogSearchForm } from './oper-log-search.vue'
  import { AUDIT_LOG_TABS, type AuditLogTab } from './audit-log-tabs'

  defineOptions({ name: 'OperLogsPanel' })

  const activeTab = defineModel<AuditLogTab>('activeTab', { required: true })

  const searchForm = ref<OperLogSearchForm>({
    username: undefined,
    module: undefined,
    status: undefined,
    dateRange: undefined
  })

  const showSearchBar = ref(true)

  const actionLabels: Record<string, string> = {
    create: '新增',
    update: '修改',
    delete: '删除'
  }

  function formatDate(value?: string | null) {
    if (!value) return '-'
    return new Date(value).toLocaleString('zh-CN')
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchOperLogs,
      apiParams: {
        current: 1,
        size: 20
      },
      columnsFactory: () => [
        { prop: 'username', label: '用户名', minWidth: 100 },
        { prop: 'module', label: '模块', width: 100 },
        {
          prop: 'action',
          label: '操作',
          width: 90,
          formatter: (row: OperLogListItem) => actionLabels[row.action] ?? row.action
        },
        { prop: 'method', label: '方法', width: 80 },
        {
          prop: 'path',
          label: '路径',
          minWidth: 160,
          showOverflowTooltip: true
        },
        { prop: 'ip', label: 'IP', minWidth: 130 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: OperLogListItem) => {
            const success = row.status === 1
            return h(ElTag, { type: success ? 'success' : 'danger' }, () =>
              success ? '成功' : '失败'
            )
          }
        },
        {
          prop: 'durationMs',
          label: '耗时(ms)',
          width: 100
        },
        {
          prop: 'requestSummary',
          label: '请求摘要',
          minWidth: 160,
          showOverflowTooltip: true,
          formatter: (row: OperLogListItem) => row.requestSummary || '-'
        },
        {
          prop: 'errorMsg',
          label: '错误信息',
          minWidth: 140,
          showOverflowTooltip: true,
          formatter: (row: OperLogListItem) => row.errorMsg || '-'
        },
        {
          prop: 'createdAt',
          label: '操作时间',
          width: 180,
          formatter: (row: OperLogListItem) => formatDate(row.createdAt)
        }
      ]
    }
  })

  const handleSearch = (params: OperLogListQuery) => {
    replaceSearchParams(params)
    getData()
  }
</script>
