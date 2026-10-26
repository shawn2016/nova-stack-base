<template>
  <ElDialog
    v-model="dialogVisible"
    title="测试发送"
    width="480px"
    align-center
    @closed="handleClosed"
  >
    <ElForm :model="form" label-width="88px">
      <ElFormItem label="模板" required>
        <ElSelect v-model="form.templateCode" style="width: 100%">
          <ElOption
            v-for="t in templates"
            :key="t.code"
            :label="`${t.code} (${t.name})`"
            :value="t.code"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="手机号" required>
        <ElInput v-model="form.phone" placeholder="13800138000" />
      </ElFormItem>
      <ElFormItem label="参数 JSON" required>
        <ElInput
          v-model="form.paramsJson"
          type="textarea"
          :rows="3"
          placeholder='{"code":"123456"}'
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">发送</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { sendSms } from '@/api/sms'
  import type { SmsTemplateListItem } from '@nova/shared-types'

  interface Props {
    visible: boolean
    templates: SmsTemplateListItem[]
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    'update:visible': [value: boolean]
    success: []
  }>()

  const submitting = ref(false)

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const form = reactive({
    templateCode: '',
    phone: '13800138000',
    paramsJson: '{"code":"123456"}'
  })

  function initForm() {
    form.templateCode = props.templates[0]?.code ?? ''
    form.phone = '13800138000'
    form.paramsJson = '{"code":"123456"}'
  }

  function handleClosed() {
    form.templateCode = ''
    form.phone = '13800138000'
    form.paramsJson = '{"code":"123456"}'
  }

  watch(
    () => [props.visible, props.templates] as const,
    ([visible]) => {
      if (visible) initForm()
    }
  )

  async function handleSubmit() {
    submitting.value = true
    try {
      const params = JSON.parse(form.paramsJson) as Record<string, string>
      await sendSms({
        phone: form.phone,
        templateCode: form.templateCode,
        params
      })
      ElMessage.success('发送成功')
      dialogVisible.value = false
      emit('success')
    } catch {
      ElMessage.error('发送失败，请检查参数 JSON')
    } finally {
      submitting.value = false
    }
  }
</script>
