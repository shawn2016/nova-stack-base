<template>
  <div class="art-full-height">
    <ArtListPanel
      title="在线会话"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #search>
        <ArtSearchBar
          v-model="searchForm"
          :items="formItems"
          :showExpand="false"
          embedded
          @reset="handleReset"
          @search="handleSearch"
        />
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
  </div>
</template>

<script setup lang="ts">
  import type { OnlineSessionListQuery } from '@/api/online-session'
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { fetchOnlineSessionList, kickOnlineSession } from '@/api/online-session'
  import type { OnlineSessionListItem } from '@nova/shared-types'
  import { ElMessageBox } from 'element-plus'

  defineOptions({ name: 'OnlineSession' })

  const showSearchBar = ref(true)
  const searchForm = reactive({ keyword: '' })
  const currentTokenId = ref('')

  const formItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: '用户名或 IP' }
    }
  ])

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable<
    (params: OnlineSessionListQuery) => Promise<Api.Common.PaginatedResponse<OnlineSessionListItem>>
  >({
    core: {
      apiFn: async (params): Promise<Api.Common.PaginatedResponse<OnlineSessionListItem>> => {
        const result = await fetchOnlineSessionList(params)
        currentTokenId.value = result.currentTokenId
        return {
          records: result.list,
          total: result.total,
          current: result.page,
          size: result.pageSize
        }
      },
      apiParams: {
        current: 1,
        size: 20
      },
      columnsFactory: () => [
        { prop: 'username', label: '用户名', minWidth: 120 },
        { prop: 'ip', label: 'IP', minWidth: 140 },
        {
          prop: 'userAgent',
          label: '浏览器',
          minWidth: 200,
          formatter: (row: OnlineSessionListItem) => row.userAgent || '-'
        },
        {
          prop: 'loginAt',
          label: '登录时间',
          minWidth: 180,
          formatter: (row: OnlineSessionListItem) => new Date(row.loginAt).toLocaleString('zh-CN')
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row: OnlineSessionListItem) => {
            const isCurrent = row.tokenId === currentTokenId.value
            if (isCurrent) return h('span', { class: 'text-muted' }, '当前会话')
            return h(ArtTableActions, {
              items: [
                {
                  key: 'kick',
                  label: '踢下线',
                  danger: true,
                  auth: 'system:session:kick',
                  onClick: () => handleKick(row)
                }
              ] satisfies TableActionItem[]
            })
          }
        }
      ]
    }
  })

  function handleReset() {
    searchForm.keyword = ''
    handleSearch()
  }

  function handleSearch() {
    replaceSearchParams({ keyword: searchForm.keyword || undefined })
    getData()
  }

  async function handleKick(row: OnlineSessionListItem) {
    await ElMessageBox.confirm(`确定强制「${row.username}」下线吗？`, '踢下线确认', {
      type: 'warning'
    })
    await kickOnlineSession(row.tokenId)
    ElMessage.success('已踢下线')
    refreshData()
  }
</script>

<style scoped>
  .text-muted {
    color: var(--el-text-color-secondary);
  }
</style>
