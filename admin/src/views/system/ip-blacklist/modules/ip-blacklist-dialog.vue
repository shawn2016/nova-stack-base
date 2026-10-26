<template>
  <ElDialog
    v-model="dialogVisible"
    title="添加 IP 黑名单"
    width="480px"
    align-center
    @closed="handleClosed"
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="88px">
      <ElFormItem label="IP 地址" prop="ip">
        <ElInput v-model="formData.ip" placeholder="例如 203.0.113.50" />
      </ElFormItem>
      <ElFormItem label="过期时间" prop="expiresAt">
        <ElDatePicker
          v-model="formData.expiresAt"
          type="datetime"
          placeholder="留空表示永久封禁"
          style="width: 100%"
          clearable
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
        />
      </ElFormItem>
      <ElFormItem label="备注" prop="remark">
        <ElInput v-model="formData.remark" type="textarea" :rows="3" placeholder="可选" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { createIpBlacklist } from '@/api/ip-blacklist'

  interface Props {
    visible: boolean
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const formData = reactive({
    ip: '',
    remark: '',
    expiresAt: '' as string | null
  })

  const rules: FormRules = {
    ip: [
      { required: true, message: '请输入 IP 地址', trigger: 'blur' },
      {
        pattern: /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/,
        message: '请输入合法 IPv4 地址',
        trigger: 'blur'
      }
    ]
  }

  function handleClosed() {
    formRef.value?.resetFields()
    formData.ip = ''
    formData.remark = ''
    formData.expiresAt = null
  }

  async function handleSubmit() {
    await formRef.value?.validate()
    submitting.value = true
    try {
      await createIpBlacklist({
        ip: formData.ip.trim(),
        remark: formData.remark.trim() || undefined,
        expiresAt: formData.expiresAt || null
      })
      ElMessage.success('已添加黑名单')
      dialogVisible.value = false
      emit('success')
    } finally {
      submitting.value = false
    }
  }
</script>
