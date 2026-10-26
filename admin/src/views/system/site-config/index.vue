<template>
  <div class="art-full-height">
    <ArtListPanel
      title="站点配置"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #search>
        <SiteConfigSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />
      </template>
      <template #head-actions>
        <ElButton
          v-permission="'system:config:create'"
          type="primary"
          @click="showDialog('add')"
          v-ripple
        >
          新增配置
        </ElButton>
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

    <SiteConfigDialog
      v-model:visible="dialogVisible"
      :dialog-type="dialogType"
      :config-data="currentConfigData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteSiteConfig, fetchSiteConfigList } from '@/api/site-config'
  import type { SiteConfigListQuery } from '@/api/site-config'
  import type { SiteConfigListItem } from '@nova/shared-types'
  import { ElMessageBox } from 'element-plus'
  import SiteConfigSearch from './modules/site-config-search.vue'
  import SiteConfigDialog from './modules/site-config-dialog.vue'

  defineOptions({ name: 'SiteConfig' })

  const searchForm = ref<SiteConfigListQuery>({
    keyword: undefined,
    group: undefined
  })

  const showSearchBar = ref(true)
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const currentConfigData = ref<SiteConfigListItem | undefined>(undefined)

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
      apiFn: fetchSiteConfigList,
      apiParams: {
        current: 1,
        size: 20
      },
      columnsFactory: () => [
        { prop: 'configKey', label: '配置键', minWidth: 140 },
        { prop: 'configName', label: '配置名称', minWidth: 120 },
        {
          prop: 'configValue',
          label: '配置值',
          minWidth: 180,
          showOverflowTooltip: true
        },
        {
          prop: 'configGroup',
          label: '分组',
          width: 100,
          formatter: (row) => row.configGroup || '-'
        },
        {
          prop: 'remark',
          label: '备注',
          minWidth: 120,
          showOverflowTooltip: true,
          formatter: (row) => row.remark || '-'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          fixed: 'right',
          formatter: (row) =>
            h(ArtTableActions, {
              items: [
                {
                  key: 'edit',
                  label: '编辑',
                  auth: 'system:config:update',
                  onClick: () => buttonMoreClick({ key: 'edit' }, row)
                },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  auth: 'system:config:delete',
                  onClick: () => buttonMoreClick({ key: 'delete' }, row)
                }
              ] satisfies TableActionItem[]
            })
        }
      ]
    }
  })

  const showDialog = (type: 'add' | 'edit', row?: SiteConfigListItem) => {
    dialogVisible.value = true
    dialogType.value = type
    currentConfigData.value = row
  }

  const handleSearch = (params: SiteConfigListQuery) => {
    replaceSearchParams(params)
    getData()
  }

  const buttonMoreClick = (item: Pick<TableActionItem, 'key'>, row: SiteConfigListItem) => {
    switch (item.key) {
      case 'edit':
        showDialog('edit', row)
        break
      case 'delete':
        handleDelete(row)
        break
    }
  }

  const handleDelete = (row: SiteConfigListItem) => {
    ElMessageBox.confirm(`确定删除配置「${row.configName}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await deleteSiteConfig(row.id)
        ElMessage.success('删除成功')
        refreshData()
      })
      .catch(() => undefined)
  }
</script>
