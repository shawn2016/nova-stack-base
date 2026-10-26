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
      <LoginLogSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />
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
  import { fetchLoginLogs } from '@/api/audit-log'
  import type { LoginLogListQuery } from '@/api/audit-log'
  import type { LoginLogListItem } from '@nova/shared-types'
  import { ElTag } from 'element-plus'
  import LoginLogSearch from './login-log-search.vue'
  import type { LoginLogSearchForm } from './login-log-search.vue'
  import { AUDIT_LOG_TABS, type AuditLogTab } from './audit-log-tabs'

  defineOptions({ name: 'LoginLogsPanel' })

  const activeTab = defineModel<AuditLogTab>('activeTab', { required: true })

  const searchForm = ref<LoginLogSearchForm>({
    username: undefined,
    status: undefined,
    dateRange: undefined
  })

  const showSearchBar = ref(true)

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
      apiFn: fetchLoginLogs,
      apiParams: {
        current: 1,
        size: 20
      },
      columnsFactory: () => [
        { prop: 'username', label: '用户名', minWidth: 120 },
        { prop: 'ip', label: 'IP', minWidth: 130 },
        {
          prop: 'userAgent',
          label: 'User-Agent',
          minWidth: 180,
          showOverflowTooltip: true,
          formatter: (row: LoginLogListItem) => row.userAgent || '-'
        },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: LoginLogListItem) => {
            const success = row.status === 1
            return h(ElTag, { type: success ? 'success' : 'danger' }, () =>
              success ? '成功' : '失败'
            )
          }
        },
        {
          prop: 'message',
          label: '说明',
          minWidth: 140,
          showOverflowTooltip: true,
          formatter: (row: LoginLogListItem) => row.message || '-'
        },
        {
          prop: 'createdAt',
          label: '登录时间',
          width: 180,
          formatter: (row: LoginLogListItem) => formatDate(row.createdAt)
        }
      ]
    }
  })

  const handleSearch = (params: LoginLogListQuery) => {
    replaceSearchParams(params)
    getData()
  }
</script>
