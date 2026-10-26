<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增模板' : '编辑模板'"
    width="520px"
    align-center
    @closed="handleClosed"
  >
    <ElForm :model="form" label-width="88px">
      <ElFormItem label="Code" required>
        <ElInput v-model="form.code" :disabled="dialogType === 'edit'" />
      </ElFormItem>
      <ElFormItem label="名称" required>
        <ElInput v-model="form.name" />
      </ElFormItem>
      <ElFormItem label="通道" required>
        <ElSelect v-model="form.channelId" style="width: 100%">
          <ElOption v-for="c in channels" :key="c.id" :label="c.name" :value="c.id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="主题" required>
        <ElInput v-model="form.subject" placeholder="欢迎加入 {siteName}" />
      </ElFormItem>
      <ElFormItem label="内容" required>
        <ElInput
          v-model="form.content"
          type="textarea"
          :rows="3"
          placeholder="您好，欢迎加入 {siteName}！"
        />
      </ElFormItem>
      <ElFormItem label="启用">
        <ElSwitch v-model="form.enabled" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { createEmailTemplate, updateEmailTemplate } from '@/api/email'
  import type { EmailChannelListItem, EmailTemplateListItem } from '@nova/shared-types'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    templateData?: EmailTemplateListItem
    channels: EmailChannelListItem[]
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
    id: '',
    code: '',
    name: '',
    channelId: '',
    subject: '',
    content: '',
    enabled: true
  })

  function initForm() {
    if (props.dialogType === 'edit' && props.templateData) {
      Object.assign(form, {
        id: props.templateData.id,
        code: props.templateData.code,
        name: props.templateData.name,
        channelId: props.templateData.channelId,
        subject: props.templateData.subject,
        content: props.templateData.content,
        enabled: props.templateData.status === 1
      })
      return
    }
    Object.assign(form, {
      id: '',
      code: '',
      name: '',
      channelId: props.channels[0]?.id ?? '',
      subject: '欢迎加入 {siteName}',
      content: '您好，欢迎加入 {siteName}！',
      enabled: true
    })
  }

  function handleClosed() {
    Object.assign(form, {
      id: '',
      code: '',
      name: '',
      channelId: '',
      subject: '',
      content: '',
      enabled: true
    })
  }

  watch(
    () => [props.visible, props.dialogType, props.templateData, props.channels] as const,
    ([visible]) => {
      if (visible) initForm()
    }
  )

  async function handleSubmit() {
    submitting.value = true
    try {
      const payload = {
        code: form.code,
        name: form.name,
        channelId: form.channelId,
        subject: form.subject,
        content: form.content,
        status: (form.enabled ? 1 : 0) as 0 | 1
      }
      if (props.dialogType === 'add') {
        await createEmailTemplate(payload)
        ElMessage.success('新增成功')
      } else {
        await updateEmailTemplate(form.id, payload)
        ElMessage.success('更新成功')
      }
      dialogVisible.value = false
      emit('success')
    } finally {
      submitting.value = false
    }
  }
</script>
