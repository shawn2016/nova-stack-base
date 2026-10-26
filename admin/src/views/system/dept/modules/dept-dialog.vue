<template>
  <ElDialog
    :title="dialogTitle"
    :model-value="visible"
    width="560px"
    align-center
    @update:model-value="handleCancel"
    @closed="handleClosed"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="上级部门" prop="parentId">
        <ElSelect v-model="form.parentId" placeholder="请选择上级部门" style="width: 100%">
          <ElOption label="顶级部门" value="0" />
          <ElOption
            v-for="item in parentOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
            :disabled="isEdit && item.id === form.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="部门名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入部门名称" />
      </ElFormItem>
      <ElFormItem label="负责人" prop="leader">
        <ElInput v-model="form.leader" placeholder="可选" />
      </ElFormItem>
      <ElFormItem label="联系电话" prop="phone">
        <ElInput v-model="form.phone" placeholder="可选" />
      </ElFormItem>
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
      </ElFormItem>
      <ElFormItem label="启用">
        <ElSwitch v-model="form.status" :active-value="1" :inactive-value="0" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="handleCancel">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import type { DeptTreeNode } from '@nova/shared-types'
  import { createDept, updateDept } from '@/api/dept'

  interface Props {
    visible: boolean
    editData?: DeptTreeNode | null
    parentId?: string
    deptOptions: DeptTreeNode[]
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    editData: null,
    parentId: '0',
    deptOptions: () => []
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const isEdit = ref(false)

  const form = reactive({
    id: '',
    parentId: '0',
    name: '',
    leader: '',
    phone: '',
    sort: 0,
    status: 1 as 0 | 1
  })

  const rules: FormRules = {
    parentId: [{ required: true, message: '请选择上级部门', trigger: 'change' }],
    name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
  }

  const dialogTitle = computed(() => (isEdit.value ? '编辑部门' : '新增部门'))

  const parentOptions = computed(() =>
    props.deptOptions.map((item) => ({
      id: item.id,
      label: item.name
    }))
  )

  watch(
    () => [props.visible, props.editData, props.parentId] as const,
    ([visible, editData, parentId]) => {
      if (!visible) return
      isEdit.value = !!editData
      Object.assign(form, {
        id: editData?.id ?? '',
        parentId: editData?.parentId ?? parentId ?? '0',
        name: editData?.name ?? '',
        leader: editData?.leader ?? '',
        phone: editData?.phone ?? '',
        sort: editData?.sort ?? 0,
        status: editData?.status ?? 1
      })
      nextTick(() => formRef.value?.clearValidate())
    },
    { immediate: true }
  )

  function handleCancel() {
    emit('update:visible', false)
  }

  function handleClosed() {
    formRef.value?.resetFields()
  }

  async function handleSubmit() {
    if (!formRef.value) return
    await formRef.value.validate()
    submitting.value = true
    try {
      const payload = {
        parentId: form.parentId,
        name: form.name,
        leader: form.leader || null,
        phone: form.phone || null,
        sort: form.sort,
        status: form.status
      }
      if (isEdit.value && form.id) {
        await updateDept(form.id, payload)
        ElMessage.success('更新成功')
      } else {
        await createDept(payload)
        ElMessage.success('创建成功')
      }
      emit('update:visible', false)
      emit('success')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      submitting.value = false
    }
  }
</script>
