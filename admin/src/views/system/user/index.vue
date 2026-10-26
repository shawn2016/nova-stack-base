<template>
  <div class="user-page art-full-height">
    <ArtListPanel
      title="用户管理"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      @refresh="refreshData"
    >
      <template #search>
        <UserSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />
      </template>
      <template #head-actions>
        <ElButton
          v-permission="'system:user:create'"
          type="primary"
          @click="showDialog('add')"
          v-ripple
        >
          新增用户
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

    <UserDialog
      v-model:visible="dialogVisible"
      :type="dialogType"
      :user-data="currentUserData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { deleteUser as deleteUserApi, fetchUserList } from '@/api/system-manage'
  import type { UserListQuery } from '@/api/system-manage'
  import type { SysUserListItem } from '@nova/shared-types'
  import UserSearch from './modules/user-search.vue'
  import UserDialog from './modules/user-dialog.vue'
  import { ElTag, ElMessageBox } from 'element-plus'

  defineOptions({ name: 'User' })

  const dialogType = ref<'add' | 'edit'>('add')
  const dialogVisible = ref(false)
  const currentUserData = ref<Partial<SysUserListItem>>({})
  const showSearchBar = ref(true)

  const searchForm = ref<UserListQuery>({
    keyword: undefined
  })

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
      apiFn: fetchUserList,
      apiParams: {
        current: 1,
        size: 20,
        ...searchForm.value
      },
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'username', label: '用户名', minWidth: 120 },
        { prop: 'nickname', label: '昵称', minWidth: 120 },
        { prop: 'deptName', label: '部门', minWidth: 120, formatter: (row) => row.deptName || '-' },
        {
          prop: 'roleCodes',
          label: '角色',
          minWidth: 160,
          formatter: (row) => (row.roleCodes?.length ? row.roleCodes.join(', ') : '-')
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row) => {
            const enabled = row.status === 1
            return h(ElTag, { type: enabled ? 'success' : 'info' }, () =>
              enabled ? '启用' : '禁用'
            )
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 120,
          fixed: 'right',
          formatter: (row) =>
            h(ArtTableActions, {
              items: [
                {
                  key: 'edit',
                  label: '编辑',
                  auth: 'system:user:update',
                  onClick: () => showDialog('edit', row)
                },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  auth: 'system:user:delete',
                  onClick: () => handleDeleteUser(row)
                }
              ] satisfies TableActionItem[]
            })
        }
      ]
    }
  })

  const handleSearch = (params: UserListQuery) => {
    replaceSearchParams(params)
    getData()
  }

  const showDialog = (type: 'add' | 'edit', row?: SysUserListItem): void => {
    dialogType.value = type
    currentUserData.value = row ? { ...row } : {}
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  const handleDeleteUser = (row: SysUserListItem): void => {
    ElMessageBox.confirm(`确定要删除用户「${row.username}」吗？`, '删除用户', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        await deleteUserApi(row.id)
        ElMessage.success('删除成功')
        refreshData()
      })
      .catch(() => undefined)
  }
</script>
