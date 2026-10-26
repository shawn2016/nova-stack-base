<template>
  <ElDialog
    :title="dialogTitle"
    :model-value="visible"
    width="640px"
    align-center
    @update:model-value="handleCancel"
    @closed="handleClosed"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="上级菜单" prop="parentId">
        <ElSelect v-model="form.parentId" placeholder="请选择上级菜单" style="width: 100%">
          <ElOption label="顶级菜单" value="0" />
          <ElOption
            v-for="item in parentOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
            :disabled="isEdit && item.id === form.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="菜单类型" prop="type">
        <ElRadioGroup v-model="form.type" :disabled="isEdit">
          <ElRadio value="directory">目录</ElRadio>
          <ElRadio value="menu">菜单</ElRadio>
          <ElRadio value="button">按钮</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="菜单名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入菜单名称" />
      </ElFormItem>
      <ElFormItem v-if="form.type !== 'button'" label="路由路径" prop="path">
        <ElInput v-model="form.path" placeholder="如 /system/user" />
      </ElFormItem>
      <ElFormItem v-if="form.type === 'menu'" label="组件路径" prop="component">
        <ElInput v-model="form.component" placeholder="如 views/system/user/index" />
      </ElFormItem>
      <ElFormItem v-if="form.type !== 'button'" label="图标" prop="icon">
        <MenuIconPicker v-model="form.icon" />
      </ElFormItem>
      <ElFormItem label="权限码" prop="permissionCode">
        <ElInput v-model="form.permissionCode" placeholder="如 system:user:list" />
      </ElFormItem>
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
      </ElFormItem>
      <ElFormItem label="可见">
        <ElSwitch v-model="form.visible" :active-value="1" :inactive-value="0" />
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
  import type { SysMenuListItem } from '@nova/shared-types'
  import { createMenu, updateMenu } from '@/api/system-manage'
  import MenuIconPicker from './menu-icon-picker.vue'

  interface Props {
    visible: boolean
    editData?: SysMenuListItem | null
    menuOptions: SysMenuListItem[]
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    editData: null,
    menuOptions: () => []
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const isEdit = ref(false)

  const form = reactive({
    id: '' as string,
    parentId: '0',
    name: '',
    path: '',
    component: '',
    icon: '',
    type: 'menu' as 'directory' | 'menu' | 'button',
    permissionCode: '',
    sort: 0,
    visible: 1 as 0 | 1,
    status: 1 as 0 | 1
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }]
  }

  const dialogTitle = computed(() => (isEdit.value ? '编辑菜单' : '新增菜单'))

  const parentOptions = computed(() =>
    props.menuOptions
      .filter((item) => item.type !== 'button')
      .map((item) => ({
        id: item.id,
        label: `${item.name}${item.path ? ` (${item.path})` : ''}`
      }))
  )

  function resetForm() {
    Object.assign(form, {
      id: '',
      parentId: '0',
      name: '',
      path: '',
      component: '',
      icon: '',
      type: 'menu',
      permissionCode: '',
      sort: 0,
      visible: 1,
      status: 1
    })
  }

  function loadFormData() {
    if (!props.editData) {
      isEdit.value = false
      resetForm()
      return
    }

    isEdit.value = true
    Object.assign(form, {
      id: props.editData.id,
      parentId: props.editData.parentId,
      name: props.editData.name,
      path: props.editData.path,
      component: props.editData.component,
      icon: props.editData.icon,
      type: props.editData.type,
      permissionCode: props.editData.permissionCode,
      sort: props.editData.sort,
      visible: props.editData.visible,
      status: props.editData.status
    })
  }

  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        nextTick(() => {
          loadFormData()
          formRef.value?.clearValidate()
        })
      }
    }
  )

  function handleCancel() {
    emit('update:visible', false)
  }

  function handleClosed() {
    resetForm()
    isEdit.value = false
  }

  async function handleSubmit() {
    if (!formRef.value) return

    await formRef.value.validate()
    submitting.value = true

    const payload = {
      parentId: form.parentId,
      name: form.name,
      path: form.path || undefined,
      component: form.component || undefined,
      icon: form.icon || undefined,
      type: form.type,
      permissionCode: form.permissionCode || undefined,
      sort: form.sort,
      visible: form.visible,
      status: form.status
    }

    try {
      if (isEdit.value) {
        await updateMenu(form.id, payload)
        ElMessage.success('更新成功')
      } else {
        await createMenu(payload)
        ElMessage.success('创建成功')
      }
      emit('success')
      handleCancel()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      submitting.value = false
    }
  }
</script>
