<template>
  <div class="dept-page art-full-height">
    <ArtListPanel
      title="部门管理"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      :show-zebra="false"
      @refresh="loadDeptTree"
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
        <ElButton v-permission="'system:dept:create'" type="primary" @click="handleAdd" v-ripple>
          新增部门
        </ElButton>
        <ElButton v-permission="'system:dept:settings'" @click="settingsVisible = true" v-ripple>
          功能开关
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

    <DeptDialog
      v-model:visible="dialogVisible"
      :edit-data="editData"
      :parent-id="defaultParentId"
      :dept-options="flatDeptList"
      @success="loadDeptTree"
    />

    <ElDialog v-model="settingsVisible" title="部门模块功能开关" width="480px" align-center>
      <ElForm label-width="140px">
        <ElFormItem label="模块总开关">
          <ElSwitch v-model="settingsForm.moduleEnabled" />
        </ElFormItem>
        <ElFormItem label="用户部门绑定">
          <ElSwitch v-model="settingsForm.userBindingEnabled" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="settingsVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="settingsSaving" @click="handleSaveSettings">
          保存
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import type { DeptTreeNode } from '@nova/shared-types'
  import DeptDialog from './modules/dept-dialog.vue'
  import {
    deleteDept,
    fetchDeptSettings,
    fetchDeptTreeAll,
    updateDeptSettings,
    updateDeptStatus
  } from '@/api/dept'
  import { ElMessageBox, ElSwitch, ElTag } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'Depts' })

  type DeptTreeItem = DeptTreeNode & { children?: DeptTreeItem[] }

  const userStore = useUserStore()
  const showSearchBar = ref(true)
  const loading = ref(false)
  const isExpanded = ref(false)
  const tableRef = ref()
  const dialogVisible = ref(false)
  const settingsVisible = ref(false)
  const settingsSaving = ref(false)
  const editData = ref<DeptTreeNode | null>(null)
  const defaultParentId = ref('0')
  const treeData = ref<DeptTreeItem[]>([])
  const flatDeptList = ref<DeptTreeNode[]>([])
  const settingsForm = reactive({
    moduleEnabled: true,
    userBindingEnabled: true
  })

  const formFilters = reactive({ keyword: '' })
  const appliedFilters = reactive({ keyword: '' })

  const formItems = computed(() => [
    {
      label: '部门名称',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: '搜索部门名称' }
    }
  ])

  onMounted(() => {
    loadDeptTree()
    loadSettings()
  })

  function flattenTree(nodes: DeptTreeNode[], result: DeptTreeNode[] = []): DeptTreeNode[] {
    for (const { children, ...item } of nodes) {
      result.push(item)
      if (children?.length) flattenTree(children, result)
    }
    return result
  }

  async function loadDeptTree() {
    loading.value = true
    try {
      treeData.value = await fetchDeptTreeAll()
      flatDeptList.value = flattenTree(treeData.value)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '获取部门失败')
    } finally {
      loading.value = false
    }
  }

  async function loadSettings() {
    try {
      const settings = await fetchDeptSettings()
      Object.assign(settingsForm, settings)
    } catch {
      // 无权限时忽略
    }
  }

  async function handleStatusChange(row: DeptTreeItem, status: 0 | 1) {
    try {
      await updateDeptStatus(row.id, { status })
      row.status = status
      ElMessage.success('状态已更新')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '更新失败')
      await loadDeptTree()
    }
  }

  const { columnChecks, columns } = useTableColumns(() => [
    { prop: 'name', label: '部门名称', minWidth: 180 },
    {
      prop: 'leader',
      label: '负责人',
      width: 120,
      formatter: (row: DeptTreeItem) => row.leader || '-'
    },
    { prop: 'sort', label: '排序', width: 80 },
    {
      prop: 'status',
      label: '状态',
      width: 120,
      formatter: (row: DeptTreeItem) => {
        if (userStore.hasPermission('system:dept:update')) {
          return h(ElSwitch, {
            modelValue: row.status === 1,
            onChange: (value: string | number | boolean) => handleStatusChange(row, value ? 1 : 0)
          })
        }
        return h(ElTag, { type: row.status === 1 ? 'success' : 'info' }, () =>
          row.status === 1 ? '启用' : '停用'
        )
      }
    },
    {
      prop: 'operation',
      label: '操作',
      width: 180,
      formatter: (row: DeptTreeItem) => {
        const items: TableActionItem[] = [
          {
            key: 'add',
            label: '新增子级',
            auth: 'system:dept:create',
            onClick: () => handleAddChild(row)
          },
          {
            key: 'edit',
            label: '编辑',
            auth: 'system:dept:update',
            onClick: () => handleEdit(row)
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            auth: 'system:dept:delete',
            onClick: () => handleDelete(row)
          }
        ]
        return h(ArtTableActions, { items })
      }
    }
  ])

  function filterTree(nodes: DeptTreeItem[], keyword: string): DeptTreeItem[] {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return nodes
    const result: DeptTreeItem[] = []
    for (const node of nodes) {
      const children = node.children ? filterTree(node.children, kw) : []
      const matched = node.name.toLowerCase().includes(kw)
      if (matched || children.length) {
        result.push({ ...node, ...(children.length ? { children } : {}) })
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

  function handleAddChild(row: DeptTreeNode) {
    editData.value = null
    defaultParentId.value = row.id
    dialogVisible.value = true
  }

  function handleEdit(row: DeptTreeNode) {
    editData.value = { ...row }
    dialogVisible.value = true
  }

  async function handleDelete(row: DeptTreeNode) {
    try {
      await ElMessageBox.confirm(`确定要删除部门「${row.name}」吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteDept(row.id)
      ElMessage.success('删除成功')
      await loadDeptTree()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error instanceof Error ? error.message : '删除失败')
      }
    }
  }

  async function handleSaveSettings() {
    settingsSaving.value = true
    try {
      await updateDeptSettings({ ...settingsForm })
      ElMessage.success('功能开关已保存')
      settingsVisible.value = false
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      settingsSaving.value = false
    }
  }

  function toggleExpand() {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      if (tableRef.value?.elTableRef && filteredTableData.value) {
        const processRows = (rows: DeptTreeItem[]) => {
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
