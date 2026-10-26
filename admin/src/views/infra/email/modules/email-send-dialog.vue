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
      <ElFormItem label="收件人" required>
        <ElInput v-model="form.to" placeholder="user@example.com" />
      </ElFormItem>
      <ElFormItem label="参数 JSON" required>
        <ElInput
          v-model="form.paramsJson"
          type="textarea"
          :rows="3"
          placeholder='{"siteName":"Nova Stack"}'
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
  import { sendEmail } from '@/api/email'
  import type { EmailTemplateListItem } from '@nova/shared-types'

  interface Props {
    visible: boolean
    templates: EmailTemplateListItem[]
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
    to: 'user@example.com',
    paramsJson: '{"siteName":"Nova Stack"}'
  })

  function initForm() {
    form.templateCode = props.templates[0]?.code ?? ''
    form.to = 'user@example.com'
    form.paramsJson = '{"siteName":"Nova Stack"}'
  }

  function handleClosed() {
    form.templateCode = ''
    form.to = 'user@example.com'
    form.paramsJson = '{"siteName":"Nova Stack"}'
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
      await sendEmail({
        to: form.to,
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
