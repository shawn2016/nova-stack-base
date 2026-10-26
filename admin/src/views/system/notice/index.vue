<template>
  <div class="art-full-height">
    <ArtListPanel
      title="公告管理"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #search>
        <ArtSearchBar
          v-model="searchForm"
          :items="searchItems"
          :showExpand="false"
          embedded
          @reset="handleSearchReset"
          @search="handleSearch"
        />
      </template>
      <template #head-actions>
        <ElButton
          v-permission="'system:notice:create'"
          type="primary"
          @click="showDialog('add')"
          v-ripple
        >
          新增公告
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

    <NoticeDialog
      v-model:visible="dialogVisible"
      :dialog-type="dialogType"
      :notice-data="currentNotice"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteNotice, fetchNoticeList, publishNotice } from '@/api/notice'
  import type { NoticeListQuery } from '@/api/notice'
  import type { NoticeListItem } from '@nova/shared-types'
  import { ElMessageBox, ElTag } from 'element-plus'
  import NoticeDialog from './modules/notice-dialog.vue'

  defineOptions({ name: 'Notices' })

  const showSearchBar = ref(true)
  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const currentNotice = ref<NoticeListItem | undefined>(undefined)

  const searchForm = reactive<NoticeListQuery>({
    keyword: undefined,
    status: undefined,
    type: undefined
  })

  const searchItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: '标题' }
    },
    {
      label: '类型',
      key: 'type',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '请选择类型',
        options: [
          { label: '通知', value: 1 },
          { label: '公告', value: 2 }
        ]
      }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        clearable: true,
        placeholder: '请选择状态',
        options: [
          { label: '草稿', value: 0 },
          { label: '已发布', value: 1 }
        ]
      }
    }
  ])

  const statusTag: Record<0 | 1, { type: 'info' | 'success'; label: string }> = {
    0: { type: 'info', label: '草稿' },
    1: { type: 'success', label: '已发布' }
  }

  const typeLabel: Record<1 | 2, string> = {
    1: '通知',
    2: '公告'
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchNoticeList,
      apiParams: { current: 1, size: 20 },
      columnsFactory: () => [
        { prop: 'title', label: '标题', minWidth: 180 },
        {
          prop: 'type',
          label: '类型',
          width: 90,
          formatter: (row: NoticeListItem) => typeLabel[row.type]
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: NoticeListItem) => {
            const tag = statusTag[row.status]
            return h(ElTag, { type: tag.type }, () => tag.label)
          }
        },
        {
          prop: 'publishedAt',
          label: '发布时间',
          minWidth: 160,
          formatter: (row: NoticeListItem) => row.publishedAt ?? '-'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 180,
          formatter: (row: NoticeListItem) => {
            const items: TableActionItem[] = [
              {
                key: 'edit',
                label: '编辑',
                auth: 'system:notice:update',
                onClick: () => showDialog('edit', row)
              }
            ]
            if (row.status === 0) {
              items.push(
                {
                  key: 'publish',
                  label: '发布',
                  auth: 'system:notice:publish',
                  onClick: () => handlePublish(row)
                },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  auth: 'system:notice:delete',
                  onClick: () => handleDelete(row)
                }
              )
            }
            return h(ArtTableActions, { items })
          }
        }
      ]
    }
  })

  function refreshData() {
    getData()
  }

  function handleSearch() {
    replaceSearchParams({
      keyword: searchForm.keyword || undefined,
      status: searchForm.status,
      type: searchForm.type,
      current: 1,
      size: pagination.size
    })
    getData()
  }

  function handleSearchReset() {
    searchForm.keyword = undefined
    searchForm.status = undefined
    searchForm.type = undefined
    handleSearch()
  }

  function showDialog(type: 'add' | 'edit', row?: NoticeListItem) {
    dialogType.value = type
    currentNotice.value = row
    dialogVisible.value = true
  }

  async function handlePublish(row: NoticeListItem) {
    try {
      await ElMessageBox.confirm(`确定发布「${row.title}」吗？`, '提示', { type: 'warning' })
      await publishNotice(row.id)
      ElMessage.success('发布成功')
      refreshData()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error instanceof Error ? error.message : '发布失败')
      }
    }
  }

  async function handleDelete(row: NoticeListItem) {
    try {
      await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' })
      await deleteNotice(row.id)
      ElMessage.success('删除成功')
      refreshData()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error instanceof Error ? error.message : '删除失败')
      }
    }
  }
</script>
