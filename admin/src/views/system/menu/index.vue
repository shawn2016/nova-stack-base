<template>
  <div class="menu-page art-full-height">
    <ArtListPanel
      title="菜单管理"
      v-model:show-search-bar="showSearchBar"
      v-model:columns="columnChecks"
      :loading="loading"
      :show-zebra="false"
      @refresh="loadMenuList"
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
        <ElButton
          v-permission="'system:menu:create'"
          type="primary"
          @click="handleAddMenu"
          v-ripple
        >
          添加菜单
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

    <MenuDialog
      v-model:visible="dialogVisible"
      :edit-data="editData"
      :menu-options="flatMenuList"
      @success="handleMenuSaved"
    />
  </div>
</template>

<script setup lang="ts">
  import ArtTableActions from '@/components/core/tables/art-table-actions/index.vue'
  import type { TableActionItem } from '@/components/core/tables/art-table-actions/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import type { SysMenuListItem } from '@nova/shared-types'
  import MenuDialog from './modules/menu-dialog.vue'
  import { deleteMenu, fetchMenuList } from '@/api/system-manage'
  import { refreshAppMenus } from '@/utils/menuRefresh'
  import { ElTag, ElMessageBox } from 'element-plus'

  defineOptions({ name: 'Menus' })

  type MenuTreeItem = SysMenuListItem & { children?: MenuTreeItem[] }

  const showSearchBar = ref(true)
  const loading = ref(false)
  const isExpanded = ref(false)
  const tableRef = ref()
  const dialogVisible = ref(false)
  const editData = ref<SysMenuListItem | null>(null)
  const flatMenuList = ref<SysMenuListItem[]>([])

  const formFilters = reactive({
    name: '',
    path: ''
  })

  const appliedFilters = reactive({
    name: '',
    path: ''
  })

  const formItems = computed(() => [
    {
      label: '菜单名称',
      key: 'name',
      type: 'input',
      props: { clearable: true }
    },
    {
      label: '路由地址',
      key: 'path',
      type: 'input',
      props: { clearable: true }
    }
  ])

  onMounted(() => {
    loadMenuList()
  })

  function buildMenuTree(items: SysMenuListItem[], parentId = '0'): MenuTreeItem[] {
    return items
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map((item) => {
        const children = buildMenuTree(items, item.id)
        return children.length ? { ...item, children } : { ...item }
      })
  }

  async function loadMenuList() {
    loading.value = true
    try {
      flatMenuList.value = await fetchMenuList()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '获取菜单失败')
    } finally {
      loading.value = false
    }
  }

  const menuTypeLabel: Record<SysMenuListItem['type'], string> = {
    directory: '目录',
    menu: '菜单',
    button: '按钮'
  }

  const menuTypeTag: Record<
    SysMenuListItem['type'],
    'primary' | 'success' | 'warning' | 'info' | 'danger'
  > = {
    directory: 'info',
    menu: 'primary',
    button: 'danger'
  }

  const { columnChecks, columns } = useTableColumns(() => [
    { prop: 'name', label: '菜单名称', minWidth: 160 },
    {
      prop: 'icon',
      label: '图标',
      width: 72,
      formatter: (row: MenuTreeItem) =>
        row.icon
          ? h('div', { class: 'flex-cc' }, [h(ArtSvgIcon, { icon: row.icon, class: 'text-lg' })])
          : h('span', { class: 'text-g-400' }, '-')
    },
    {
      prop: 'type',
      label: '类型',
      width: 100,
      formatter: (row: MenuTreeItem) =>
        h(ElTag, { type: menuTypeTag[row.type] }, () => menuTypeLabel[row.type])
    },
    { prop: 'path', label: '路由', minWidth: 160 },
    { prop: 'component', label: '组件', minWidth: 180, showOverflowTooltip: true },
    { prop: 'permissionCode', label: '权限码', minWidth: 160, showOverflowTooltip: true },
    { prop: 'sort', label: '排序', width: 80 },
    {
      prop: 'status',
      label: '状态',
      width: 100,
      formatter: (row: MenuTreeItem) => {
        const enabled = row.status === 1
        return h(ElTag, { type: enabled ? 'success' : 'info' }, () => (enabled ? '启用' : '禁用'))
      }
    },
    {
      prop: 'operation',
      label: '操作',
      width: 120,
      formatter: (row: MenuTreeItem) =>
        h(ArtTableActions, {
          items: [
            {
              key: 'edit',
              label: '编辑',
              auth: 'system:menu:update',
              onClick: () => handleEditMenu(row)
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              auth: 'system:menu:delete',
              onClick: () => handleDeleteMenu(row)
            }
          ] satisfies TableActionItem[]
        })
    }
  ])

  const filteredTableData = computed(() => {
    const name = appliedFilters.name.trim().toLowerCase()
    const path = appliedFilters.path.trim().toLowerCase()

    const filtered = flatMenuList.value.filter((item) => {
      const matchName = !name || item.name.toLowerCase().includes(name)
      const matchPath = !path || (item.path || '').toLowerCase().includes(path)
      return matchName && matchPath
    })

    if (!name && !path) {
      return buildMenuTree(flatMenuList.value)
    }

    const idSet = new Set(filtered.map((item) => item.id))
    flatMenuList.value.forEach((item) => {
      if (idSet.has(item.id)) {
        let parentId = item.parentId
        while (parentId && parentId !== '0') {
          idSet.add(parentId)
          parentId = flatMenuList.value.find((menu) => menu.id === parentId)?.parentId ?? '0'
        }
      }
    })

    return buildMenuTree(flatMenuList.value.filter((item) => idSet.has(item.id)))
  })

  function handleReset() {
    Object.assign(formFilters, { name: '', path: '' })
    Object.assign(appliedFilters, { name: '', path: '' })
  }

  function handleSearch(filters?: { name?: string; path?: string }) {
    if (filters) {
      Object.assign(formFilters, filters)
    }
    Object.assign(appliedFilters, { ...formFilters })
  }

  function handleAddMenu() {
    editData.value = null
    dialogVisible.value = true
  }

  function handleEditMenu(row: SysMenuListItem) {
    editData.value = { ...row }
    dialogVisible.value = true
  }

  async function handleMenuSaved() {
    await loadMenuList()
    try {
      await refreshAppMenus()
      ElMessage.info('侧栏菜单已刷新；新增路由需重新登录或刷新页面后生效')
    } catch {
      ElMessage.warning('菜单列表已更新，请重新登录或刷新页面以同步侧栏')
    }
  }

  async function handleDeleteMenu(row: SysMenuListItem) {
    try {
      await ElMessageBox.confirm(`确定要删除菜单「${row.name}」吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteMenu(row.id)
      ElMessage.success('删除成功')
      await handleMenuSaved()
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
        const processRows = (rows: MenuTreeItem[]) => {
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
