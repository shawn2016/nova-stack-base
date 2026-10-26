<template>
  <div class="region-page art-full-height">
    <ArtListPanel
      title="地区管理"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      :show-zebra="false"
      @refresh="loadRegionTree"
    >
      <template #search>
        <ArtSearchBar
          v-model="formFilters"
          :items="formItems"
          :showExpand="false"
          embedded
          @reset="handleReset"
          @search="handleSearch"
        />
      </template>
      <template #head-actions>
        <ElButton v-permission="'system:region:create'" type="primary" @click="handleAdd" v-ripple>
          新增地区
        </ElButton>
        <ElButton @click="toggleExpand" v-ripple>
          {{ isExpanded ? '收起' : '展开' }}
        </ElButton>
      </template>

      <ArtTable
        ref="tableRef"
        rowKey="id"
        :loading="loading"
        :columns="columns"
        :data="filteredTableData"
        :stripe="false"
        :tree-props="{ children: 'children' }"
        :default-expand-all="false"
      />
    </ArtListPanel>

    <RegionDialog
      v-model:visible="dialogVisible"
      :edit-data="editData"
      :parent-id="defaultParentId"
      :region-options="flatRegionList"
      @success="loadRegionTree"
    />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import type { RegionListItem, RegionTreeNode } from '@nova/shared-types'
  import RegionDialog from './modules/region-dialog.vue'
  import { deleteRegion, fetchRegionTree } from '@/api/region'
  import { ElTag, ElMessageBox } from 'element-plus'

  defineOptions({ name: 'Regions' })

  type RegionTreeItem = RegionTreeNode & { children?: RegionTreeItem[] }

  const showSearchBar = ref(true)
  const loading = ref(false)
  const isExpanded = ref(false)
  const tableRef = ref()
  const dialogVisible = ref(false)
  const editData = ref<RegionListItem | null>(null)
  const defaultParentId = ref('0')
  const treeData = ref<RegionTreeItem[]>([])
  const flatRegionList = ref<RegionListItem[]>([])

  const formFilters = reactive({
    keyword: ''
  })

  const appliedFilters = reactive({
    keyword: ''
  })

  const formItems = computed(() => [
    {
      label: '名称/代码',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: '搜索名称或区划代码' }
    }
  ])

  const levelLabel: Record<1 | 2 | 3, string> = {
    1: '省级',
    2: '市级',
    3: '区县级'
  }

  onMounted(() => {
    loadRegionTree()
  })

  function flattenTree(nodes: RegionTreeNode[], result: RegionListItem[] = []): RegionListItem[] {
    for (const { children, ...item } of nodes) {
      result.push(item)
      if (children?.length) {
        flattenTree(children, result)
      }
    }
    return result
  }

  async function loadRegionTree() {
    loading.value = true
    try {
      treeData.value = await fetchRegionTree()
      flatRegionList.value = flattenTree(treeData.value)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '获取地区失败')
    } finally {
      loading.value = false
    }
  }

  const { columnChecks, columns } = useTableColumns(() => [
    { prop: 'name', label: '地区名称', minWidth: 180 },
    { prop: 'code', label: '区划代码', width: 120 },
    {
      prop: 'level',
      label: '层级',
      width: 100,
      formatter: (row: RegionTreeItem) =>
        h(
          ElTag,
          { type: row.level === 1 ? 'primary' : row.level === 2 ? 'success' : 'info' },
          () => levelLabel[row.level]
        )
    },
    { prop: 'sort', label: '排序', width: 80 },
    {
      prop: 'status',
      label: '状态',
      width: 100,
      formatter: (row: RegionTreeItem) => {
        const enabled = row.status === 1
        return h(ElTag, { type: enabled ? 'success' : 'info' }, () => (enabled ? '启用' : '禁用'))
      }
    },
    {
      prop: 'operation',
      label: '操作',
      width: 180,
      formatter: (row: RegionTreeItem) => {
        const items: TableActionItem[] = []
        if (row.level < 3) {
          items.push({
            key: 'add',
            label: '新增子级',
            auth: 'system:region:create',
            onClick: () => handleAddChild(row)
          })
        }
        items.push(
          {
            key: 'edit',
            label: '编辑',
            auth: 'system:region:update',
            onClick: () => handleEdit(row)
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            auth: 'system:region:delete',
            onClick: () => handleDelete(row)
          }
        )
        return h(ArtTableActions, { items })
      }
    }
  ])

  function filterTree(nodes: RegionTreeItem[], keyword: string): RegionTreeItem[] {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return nodes

    const result: RegionTreeItem[] = []
    for (const node of nodes) {
      const children = node.children ? filterTree(node.children, kw) : []
      const matched = node.name.toLowerCase().includes(kw) || node.code.toLowerCase().includes(kw)
      if (matched || children.length) {
        result.push({
          ...node,
          ...(children.length ? { children } : {})
        })
      }
    }
    return result
  }

  const filteredTableData = computed(() => filterTree(treeData.value, appliedFilters.keyword))

  function handleReset() {
    Object.assign(formFilters, { keyword: '' })
    Object.assign(appliedFilters, { keyword: '' })
  }

  function handleSearch() {
    Object.assign(appliedFilters, { ...formFilters })
  }

  function handleAdd() {
    editData.value = null
    defaultParentId.value = '0'
    dialogVisible.value = true
  }

  function handleAddChild(row: RegionListItem) {
    editData.value = null
    defaultParentId.value = row.id
    dialogVisible.value = true
  }

  function handleEdit(row: RegionListItem) {
    editData.value = { ...row }
    dialogVisible.value = true
  }

  async function handleDelete(row: RegionListItem) {
    try {
      await ElMessageBox.confirm(`确定要删除地区「${row.name}」吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteRegion(row.id)
      ElMessage.success('删除成功')
      await loadRegionTree()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error instanceof Error ? error.message : '删除失败')
      }
    }
  }

  function toggleExpand() {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      if (tableRef.value?.elTableRef && filteredTableData.value) {
        const processRows = (rows: RegionTreeItem[]) => {
          rows.forEach((row) => {
            if (row.children?.length) {
              tableRef.value.elTableRef.toggleRowExpansion(row, isExpanded.value)
              processRows(row.children)
            }
          })
        }
        processRows(filteredTableData.value)
      }
    })
  }
</script>
