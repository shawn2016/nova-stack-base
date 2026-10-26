<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增字典项' : '编辑字典项'"
    width="480px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="所属类型">
        <ElInput :model-value="typeName" disabled />
      </ElFormItem>
      <ElFormItem label="显示标签" prop="label">
        <ElInput v-model="form.label" placeholder="请输入显示标签" />
      </ElFormItem>
      <ElFormItem label="存储值" prop="value">
        <ElInput v-model="form.value" placeholder="请输入存储值" />
      </ElFormItem>
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
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
  import type { DictDataListItem } from '@nova/shared-types'
  import { createDictData, updateDictData } from '@/api/dict'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    typeId: string
    typeName: string
    dataItem?: DictDataListItem
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    dialogType: 'add',
    typeId: '',
    typeName: '',
    dataItem: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    label: [
      { required: true, message: '请输入显示标签', trigger: 'blur' },
      { max: 64, message: '最多 64 个字符', trigger: 'blur' }
    ],
    value: [
      { required: true, message: '请输入存储值', trigger: 'blur' },
      { max: 64, message: '最多 64 个字符', trigger: 'blur' }
    ]
  })

  const form = reactive({
    id: '',
    label: '',
    value: '',
    sort: 0,
    enabled: true,
    remark: ''
  })

  const initForm = () => {
    if (props.dialogType === 'edit' && props.dataItem) {
      Object.assign(form, {
        id: props.dataItem.id,
        label: props.dataItem.label,
        value: props.dataItem.value,
        sort: props.dataItem.sort,
        enabled: props.dataItem.status === 1,
        remark: props.dataItem.remark ?? ''
      })
    } else {
      Object.assign(form, {
        id: '',
        label: '',
        value: '',
        sort: 0,
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
    () => props.dataItem,
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
    if (!formRef.value || !props.typeId) return

    try {
      await formRef.value.validate()
      submitting.value = true

      const status = form.enabled ? 1 : 0
      const remark = form.remark.trim() || undefined

      if (props.dialogType === 'add') {
        await createDictData({
          typeId: props.typeId,
          label: form.label,
          value: form.value,
          sort: form.sort,
          status,
          remark
        })
        ElMessage.success('新增成功')
      } else {
        await updateDictData(form.id, {
          label: form.label,
          value: form.value,
          sort: form.sort,
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
