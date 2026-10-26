<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增字典类型' : '编辑字典类型'"
    width="480px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="类型名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入类型名称" />
      </ElFormItem>
      <ElFormItem label="类型编码" prop="code">
        <ElInput
          v-model="form.code"
          :disabled="dialogType === 'edit'"
          placeholder="如 user_status"
        />
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSwitch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput v-model="form.remark" type="textarea" :rows="3" placeholder="可选" />
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
  import type { DictTypeListItem } from '@nova/shared-types'
  import { createDictType, updateDictType } from '@/api/dict'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    typeData?: DictTypeListItem
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    dialogType: 'add',
    typeData: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    name: [
      { required: true, message: '请输入类型名称', trigger: 'blur' },
      { max: 64, message: '最多 64 个字符', trigger: 'blur' }
    ],
    code: [
      { required: true, message: '请输入类型编码', trigger: 'blur' },
      { max: 64, message: '最多 64 个字符', trigger: 'blur' }
    ]
  })

  const form = reactive({
    id: '',
    name: '',
    code: '',
    enabled: true,
    remark: ''
  })

  const initForm = () => {
    if (props.dialogType === 'edit' && props.typeData) {
      Object.assign(form, {
        id: props.typeData.id,
        name: props.typeData.name,
        code: props.typeData.code,
        enabled: props.typeData.status === 1,
        remark: props.typeData.remark ?? ''
      })
    } else {
      Object.assign(form, {
        id: '',
        name: '',
        code: '',
        enabled: true,
        remark: ''
      })
    }
  }

  watch(
    () => props.visible,
    (newVal) => {
      if (newVal) initForm()
    }
  )

  watch(
    () => props.typeData,
    () => {
      if (props.visible) initForm()
    },
    { deep: true }
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

      const status = form.enabled ? 1 : 0
      const remark = form.remark.trim() || undefined

      if (props.dialogType === 'add') {
        await createDictType({
          name: form.name,
          code: form.code,
          status,
          remark
        })
        ElMessage.success('新增成功')
      } else {
        await updateDictType(form.id, {
          name: form.name,
          status,
          remark
        })
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
