<template>
  <ElDialog v-model="visible" title="分配权限" width="680px" align-center @close="handleClose">
    <ElAlert
      type="info"
      :closable="false"
      show-icon
      title="功能权限变更后，相关用户需重新登录后菜单与按钮权限才会生效。"
      class="mb-4"
    />

    <div v-loading="loading" class="permission-dialog">
      <section class="permission-dialog__section">
        <div class="permission-dialog__title">功能权限</div>
        <ElScrollbar height="36vh">
          <ElTree
            ref="treeRef"
            :data="permissionTree"
            show-checkbox
            node-key="id"
            default-expand-all
            :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
          />
        </ElScrollbar>
      </section>

      <section class="permission-dialog__section">
        <div class="permission-dialog__title">数据范围</div>
        <ElForm label-width="96px">
          <ElFormItem label="数据范围">
            <ElSelect
              v-model="dataScope"
              :disabled="isSuperAdmin"
              placeholder="请选择数据范围"
              style="width: 100%"
            >
              <ElOption
                v-for="(label, value) in DATA_SCOPE_LABELS"
                :key="value"
                :label="label"
                :value="Number(value)"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem v-if="dataScope === DATA_SCOPE_CUSTOM" label="自定义部门">
            <ElTreeSelect
              v-model="customDeptIds"
              :data="deptOptions"
              multiple
              show-checkbox
              check-strictly
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择部门"
              style="width: 100%"
              node-key="id"
              :props="{ label: 'label', children: 'children' }"
            />
          </ElFormItem>
        </ElForm>
      </section>
    </div>

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="savePermission">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { ElTree } from 'element-plus'
  import type { DeptTreeNode, SysRoleListItem } from '@nova/shared-types'
  import {
    DATA_SCOPE_ALL,
    DATA_SCOPE_CUSTOM,
    DATA_SCOPE_LABELS,
    type DataScope
  } from '@nova/shared-types'
  import {
    assignRolePermissions,
    fetchMenuList,
    fetchPermissionOptions,
    fetchRoleDetail,
    updateRole
  } from '@/api/system-manage'
  import { fetchDeptTreeAll } from '@/api/dept'
  import {
    buildPermissionTree,
    permissionCodesToTreeKeys,
    type PermissionTreeNode
  } from '@/utils/permission-tree'

  interface Props {
    visible: boolean
    roleData?: SysRoleListItem
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    roleData: undefined
  })

  const emit = defineEmits<Emits>()

  const treeRef = ref<InstanceType<typeof ElTree>>()
  const loading = ref(false)
  const submitting = ref(false)
  const permissionTree = ref<PermissionTreeNode[]>([])
  interface DeptOption {
    id: string
    label: string
    children?: DeptOption[]
  }
  const deptOptions = ref<DeptOption[]>([])
  const dataScope = ref<DataScope>(DATA_SCOPE_ALL)
  const customDeptIds = ref<string[]>([])

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const isSuperAdmin = computed(() => props.roleData?.code === 'super_admin')

  function mapDeptTree(nodes: DeptTreeNode[]): typeof deptOptions.value {
    return nodes.map((node) => ({
      id: node.id,
      label: node.name,
      ...(node.children?.length ? { children: mapDeptTree(node.children) } : {})
    }))
  }

  async function loadPermissionTree() {
    const [menus, permissions] = await Promise.all([fetchMenuList(), fetchPermissionOptions()])
    permissionTree.value = buildPermissionTree(menus, permissions)
  }

  async function loadRolePermissions() {
    if (!props.roleData?.id) return

    loading.value = true
    try {
      const [detail] = await Promise.all([
        fetchRoleDetail(props.roleData.id),
        loadPermissionTree(),
        fetchDeptTreeAll().then((tree) => {
          deptOptions.value = mapDeptTree(tree)
        })
      ])

      dataScope.value = detail.dataScope ?? DATA_SCOPE_ALL
      customDeptIds.value = [...(detail.customDeptIds ?? [])]

      await nextTick()
      treeRef.value?.setCheckedKeys(permissionCodesToTreeKeys(detail.permissionCodes), false)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载权限失败')
    } finally {
      loading.value = false
    }
  }

  watch(
    () => props.visible,
    (newVal) => {
      if (newVal && props.roleData) {
        void loadRolePermissions()
      }
    }
  )

  watch(dataScope, (scope) => {
    if (scope !== DATA_SCOPE_CUSTOM) {
      customDeptIds.value = []
    }
  })

  const handleClose = () => {
    visible.value = false
    permissionTree.value = []
    dataScope.value = DATA_SCOPE_ALL
    customDeptIds.value = []
    treeRef.value?.setCheckedKeys([], false)
  }

  const savePermission = async () => {
    if (!props.roleData?.id) return

    const checkedNodes = (treeRef.value?.getCheckedNodes(false, true) ?? []) as PermissionTreeNode[]
    const permissionCodes = checkedNodes
      .filter((node) => node.nodeType === 'permission' && node.permissionCode)
      .map((node) => node.permissionCode!)

    submitting.value = true
    try {
      await assignRolePermissions(props.roleData.id, { permissionCodes })

      if (!isSuperAdmin.value) {
        await updateRole(props.roleData.id, {
          dataScope: dataScope.value,
          customDeptIds: dataScope.value === DATA_SCOPE_CUSTOM ? customDeptIds.value : []
        })
      }

      ElMessage.success('保存成功，相关用户需重新登录后生效')
      emit('success')
      handleClose()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .permission-dialog__section + .permission-dialog__section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .permission-dialog__title {
    margin-bottom: 10px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
</style>
