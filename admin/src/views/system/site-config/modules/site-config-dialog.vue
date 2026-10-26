<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增站点配置' : '编辑站点配置'"
    width="520px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="配置键" prop="configKey">
        <ElInput
          v-model="form.configKey"
          :disabled="dialogType === 'edit'"
          placeholder="如 site.name"
        />
      </ElFormItem>
      <ElFormItem label="配置名称" prop="configName">
        <ElInput v-model="form.configName" placeholder="请输入配置名称" />
      </ElFormItem>
      <ElFormItem label="配置值" prop="configValue">
        <ElInput v-model="form.configValue" type="textarea" :rows="4" placeholder="请输入配置值" />
      </ElFormItem>
      <ElFormItem label="分组">
        <ElInput v-model="form.configGroup" placeholder="如 site（可选）" />
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
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
  import type { SiteConfigListItem } from '@nova/shared-types'
  import { createSiteConfig, updateSiteConfig } from '@/api/site-config'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    configData?: SiteConfigListItem
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    dialogType: 'add',
    configData: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    configKey: [
      { required: true, message: '请输入配置键', trigger: 'blur' },
      { max: 64, message: '最多 64 个字符', trigger: 'blur' }
    ],
    configName: [
      { required: true, message: '请输入配置名称', trigger: 'blur' },
      { max: 64, message: '最多 64 个字符', trigger: 'blur' }
    ],
    configValue: [{ required: true, message: '请输入配置值', trigger: 'blur' }]
  })

  const form = reactive({
    id: '',
    configKey: '',
    configName: '',
    configValue: '',
    configGroup: '',
    remark: ''
  })

  const initForm = () => {
    if (props.dialogType === 'edit' && props.configData) {
      Object.assign(form, {
        id: props.configData.id,
        configKey: props.configData.configKey,
        configName: props.configData.configName,
        configValue: props.configData.configValue,
        configGroup: props.configData.configGroup ?? '',
        remark: props.configData.remark ?? ''
      })
    } else {
      Object.assign(form, {
        id: '',
        configKey: '',
        configName: '',
        configValue: '',
        configGroup: '',
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
    () => props.configData,
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

      const configGroup = form.configGroup.trim() || undefined
      const remark = form.remark.trim() || undefined

      if (props.dialogType === 'add') {
        await createSiteConfig({
          configKey: form.configKey,
          configName: form.configName,
          configValue: form.configValue,
          configGroup,
          remark
        })
        ElMessage.success('新增成功')
      } else {
        await updateSiteConfig(form.id, {
          configName: form.configName,
          configValue: form.configValue,
          configGroup,
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
