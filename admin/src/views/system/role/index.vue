<template>
  <div class="art-full-height">
    <ArtListPanel
      title="角色管理"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #search>
        <RoleSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />
      </template>
      <template #head-actions>
        <ElButton
          v-permission="'system:role:create'"
          type="primary"
          @click="showDialog('add')"
          v-ripple
        >
          新增角色
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

    <RoleEditDialog
      v-model:visible="dialogVisible"
      :dialog-type="dialogType"
      :role-data="currentRoleData"
      @success="refreshData"
    />

    <RolePermissionDialog
      v-model:visible="permissionDialog"
      :role-data="currentRoleData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteRole as deleteRoleApi, fetchRoleList } from '@/api/system-manage'
  import type { RoleListQuery } from '@/api/system-manage'
  import type { SysRoleListItem } from '@nova/shared-types'
  import { DATA_SCOPE_LABELS, type DataScope } from '@nova/shared-types'
  import RoleSearch from './modules/role-search.vue'
  import RoleEditDialog from './modules/role-edit-dialog.vue'
  import RolePermissionDialog from './modules/role-permission-dialog.vue'
  import { ElTag, ElMessageBox } from 'element-plus'

  defineOptions({ name: 'Role' })

  const searchForm = ref<RoleListQuery>({
    keyword: undefined
  })

  const showSearchBar = ref(true)
  const dialogVisible = ref(false)
  const permissionDialog = ref(false)
  const currentRoleData = ref<SysRoleListItem | undefined>(undefined)
  const dialogType = ref<'add' | 'edit'>('add')

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
      apiFn: fetchRoleList,
      apiParams: {
        current: 1,
        size: 20
      },
      columnsFactory: () => [
        { prop: 'id', label: 'ID', width: 80 },
        { prop: 'name', label: '角色名称', minWidth: 120 },
        { prop: 'code', label: '角色编码', minWidth: 140 },
        {
          prop: 'dataScope',
          label: '数据范围',
          minWidth: 120,
          formatter: (row) => DATA_SCOPE_LABELS[(row.dataScope ?? 1) as DataScope] ?? '-'
        },
        { prop: 'sort', label: '排序', width: 80 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row) => {
            const enabled = row.status === 1
            return h(ElTag, { type: enabled ? 'success' : 'warning' }, () =>
              enabled ? '启用' : '禁用'
            )
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 220,
          fixed: 'right',
          formatter: (row) => {
            const items: TableActionItem[] = [
              {
                key: 'permission',
                label: '分配权限',
                auth: 'system:role:update',
                onClick: () => buttonMoreClick({ key: 'permission' }, row)
              },
              {
                key: 'edit',
                label: '编辑',
                auth: 'system:role:update',
                onClick: () => buttonMoreClick({ key: 'edit' }, row)
              }
            ]
            if (row.code !== 'super_admin') {
              items.push({
                key: 'delete',
                label: '删除',
                danger: true,
                auth: 'system:role:delete',
                onClick: () => buttonMoreClick({ key: 'delete' }, row)
              })
            }
            return h(ArtTableActions, { items })
          }
        }
      ]
    }
  })

  const showDialog = (type: 'add' | 'edit', row?: SysRoleListItem) => {
    dialogVisible.value = true
    dialogType.value = type
    currentRoleData.value = row
  }

  const handleSearch = (params: RoleListQuery) => {
    replaceSearchParams(params)
    getData()
  }

  const buttonMoreClick = (item: Pick<TableActionItem, 'key'>, row: SysRoleListItem) => {
    switch (item.key) {
      case 'permission':
        showPermissionDialog(row)
        break
      case 'edit':
        showDialog('edit', row)
        break
      case 'delete':
        handleDeleteRole(row)
        break
    }
  }

  const showPermissionDialog = (row?: SysRoleListItem) => {
    permissionDialog.value = true
    currentRoleData.value = row
  }

  const handleDeleteRole = (row: SysRoleListItem) => {
    ElMessageBox.confirm(`确定删除角色「${row.name}」吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await deleteRoleApi(row.id)
        ElMessage.success('删除成功')
        refreshData()
      })
      .catch(() => undefined)
  }
</script>
