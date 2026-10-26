<template>
  <div class="art-full-height">
    <ArtListPanel
      title="IP 黑名单"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #head-actions>
        <ElButton
          v-permission="'security:ip-blacklist:create'"
          type="primary"
          @click="showDialog = true"
        >
          添加封禁
        </ElButton>
      </template>

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

    <IpBlacklistDialog v-model:visible="showDialog" @success="refreshData" />
  </div>
</template>

<script setup lang="ts">
  import type { IpBlacklistListQuery } from '@/api/ip-blacklist'
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteIpBlacklist, fetchIpBlacklistList } from '@/api/ip-blacklist'
  import type { IpBlacklistListItem } from '@nova/shared-types'
  import { ElMessageBox, ElTag } from 'element-plus'
  import IpBlacklistDialog from './modules/ip-blacklist-dialog.vue'

  defineOptions({ name: 'IpBlacklist' })

  const showSearchBar = ref(true)
  const showDialog = ref(false)
  const searchForm = reactive({
    keyword: '',
    source: '' as '' | 'manual' | 'auto',
    status: undefined as number | undefined
  })

  const formItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: 'IP 或备注' }
    },
    {
      label: '来源',
      key: 'source',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '手动', value: 'manual' },
          { label: '自动', value: 'auto' }
        ]
      }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '启用', value: 1 },
          { label: '停用', value: 0 }
        ]
      }
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
    (params: IpBlacklistListQuery) => Promise<Api.Common.PaginatedResponse<IpBlacklistListItem>>
  >({
    core: {
      apiFn: async (params): Promise<Api.Common.PaginatedResponse<IpBlacklistListItem>> => {
        const result = await fetchIpBlacklistList(params)
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
        { prop: 'ip', label: 'IP', minWidth: 140 },
        {
          prop: 'source',
          label: '来源',
          width: 100,
          formatter: (row: IpBlacklistListItem) =>
            h(ElTag, { type: row.source === 'auto' ? 'warning' : 'info', size: 'small' }, () =>
              row.source === 'auto' ? '自动' : '手动'
            )
        },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: IpBlacklistListItem) =>
            h(ElTag, { type: row.status === 1 ? 'danger' : 'info', size: 'small' }, () =>
              row.status === 1 ? '封禁中' : '已停用'
            )
        },
        {
          prop: 'expiresAt',
          label: '过期时间',
          minWidth: 180,
          formatter: (row: IpBlacklistListItem) =>
            row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : '永久'
        },
        {
          prop: 'remark',
          label: '备注',
          minWidth: 160,
          formatter: (row: IpBlacklistListItem) => row.remark || '-'
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          minWidth: 180,
          formatter: (row: IpBlacklistListItem) => new Date(row.createdAt).toLocaleString('zh-CN')
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right',
          formatter: (row: IpBlacklistListItem) =>
            h(ArtTableActions, {
              items: [
                {
                  key: 'delete',
                  label: '解除',
                  danger: true,
                  auth: 'security:ip-blacklist:delete',
                  onClick: () => handleDelete(row)
                }
              ] satisfies TableActionItem[]
            })
        }
      ]
    }
  })

  function handleReset() {
    searchForm.keyword = ''
    searchForm.source = ''
    searchForm.status = undefined
    handleSearch()
  }

  function handleSearch() {
    replaceSearchParams({
      keyword: searchForm.keyword || undefined,
      source: searchForm.source || undefined,
      status: searchForm.status
    })
    getData()
  }

  async function handleDelete(row: IpBlacklistListItem) {
    await ElMessageBox.confirm(`确定解除对 ${row.ip} 的封禁吗？`, '解除确认', {
      type: 'warning'
    })
    await deleteIpBlacklist(row.id)
    ElMessage.success('已解除封禁')
    refreshData()
  }
</script>
