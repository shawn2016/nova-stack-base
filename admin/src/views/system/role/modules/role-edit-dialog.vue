<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增角色' : '编辑角色'"
    width="520px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="角色名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入角色名称" />
      </ElFormItem>
      <ElFormItem label="角色编码" prop="code">
        <ElInput
          v-model="form.code"
          :disabled="dialogType === 'edit' && form.code === 'super_admin'"
          placeholder="请输入角色编码"
        />
      </ElFormItem>
      <ElFormItem label="数据范围" prop="dataScope">
        <ElSelect
          v-model="form.dataScope"
          :disabled="dialogType === 'edit' && form.code === 'super_admin'"
          placeholder="请选择数据范围"
          style="width: 100%"
        >
          <ElOption
            v-for="(label, value) in dataScopeOptions"
            :key="value"
            :label="label"
            :value="Number(value)"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem
        v-if="form.dataScope === DATA_SCOPE_CUSTOM"
        label="自定义部门"
        prop="customDeptIds"
      >
        <ElTreeSelect
          v-model="form.customDeptIds"
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
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSwitch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import type { DeptTreeNode, SysRoleListItem } from '@nova/shared-types'
  import {
    DATA_SCOPE_ALL,
    DATA_SCOPE_CUSTOM,
    DATA_SCOPE_LABELS,
    type DataScope
  } from '@nova/shared-types'
  import { createRole, fetchRoleDetail, updateRole } from '@/api/system-manage'
  import { fetchDeptTreeAll } from '@/api/dept'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    roleData?: SysRoleListItem
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    dialogType: 'add',
    roleData: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  interface DeptOption {
    id: string
    label: string
    children?: DeptOption[]
  }
  const deptOptions = ref<DeptOption[]>([])

  const dataScopeOptions = DATA_SCOPE_LABELS

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    name: [
      { required: true, message: '请输入角色名称', trigger: 'blur' },
      { min: 2, max: 32, message: '长度在 2 到 32 个字符', trigger: 'blur' }
    ],
    code: [
      { required: true, message: '请输入角色编码', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
    ]
  })

  const form = reactive({
    id: '' as string,
    name: '',
    code: '',
    sort: 0,
    enabled: true,
    dataScope: DATA_SCOPE_ALL as DataScope,
    customDeptIds: [] as string[]
  })

  function mapDeptTree(nodes: DeptTreeNode[]): typeof deptOptions.value {
    return nodes.map((node) => ({
      id: node.id,
      label: node.name,
      ...(node.children?.length ? { children: mapDeptTree(node.children) } : {})
    }))
  }

  async function loadDeptOptions() {
    try {
      const tree = await fetchDeptTreeAll()
      deptOptions.value = mapDeptTree(tree)
    } catch {
      deptOptions.value = []
    }
  }

  async function initForm() {
    await loadDeptOptions()

    if (props.dialogType === 'edit' && props.roleData) {
      const detail = await fetchRoleDetail(props.roleData.id)
      Object.assign(form, {
        id: detail.id,
        name: detail.name,
        code: detail.code,
        sort: detail.sort,
        enabled: detail.status === 1,
        dataScope: detail.dataScope ?? DATA_SCOPE_ALL,
        customDeptIds: [...(detail.customDeptIds ?? [])]
      })
    } else {
      Object.assign(form, {
        id: '',
        name: '',
        code: '',
        sort: 0,
        enabled: true,
        dataScope: DATA_SCOPE_ALL,
        customDeptIds: []
      })
    }
  }

  watch(
    () => props.visible,
    (newVal) => {
      if (newVal) void initForm()
    }
  )

  watch(
    () => props.roleData,
    () => {
      if (props.visible) void initForm()
    },
    { deep: true }
  )

  watch(
    () => form.dataScope,
    (scope) => {
      if (scope !== DATA_SCOPE_CUSTOM) {
        form.customDeptIds = []
      }
    }
  )

  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }

  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      submitting.value = true

      const payload = {
        name: form.name,
        code: form.code,
        sort: form.sort,
        status: (form.enabled ? 1 : 0) as 0 | 1,
        dataScope: form.dataScope,
        customDeptIds: form.dataScope === DATA_SCOPE_CUSTOM ? form.customDeptIds : []
      }

      if (props.dialogType === 'add') {
        await createRole(payload)
        ElMessage.success('新增成功')
      } else {
        await updateRole(form.id, payload)
        ElMessage.success('修改成功')
      }

      emit('success')
      handleClose()
    } catch (error) {
      if (error instanceof Error) {
        ElMessage.error(error.message)
      }
    } finally {
      submitting.value = false
    }
  }
</script>
