<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '新增通道' : '编辑通道'"
    width="480px"
    align-center
    @closed="handleClosed"
  >
    <ElForm :model="form" label-width="88px">
      <ElFormItem label="名称" required>
        <ElInput v-model="form.name" />
      </ElFormItem>
      <ElFormItem label="Provider" required>
        <ElSelect v-model="form.provider" style="width: 100%">
          <ElOption label="mock" value="mock" />
          <ElOption label="smtp" value="smtp" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="配置 JSON" required>
        <ElInput v-model="form.config" type="textarea" :rows="3" />
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
  import { createEmailChannel, updateEmailChannel } from '@/api/email'
  import type { EmailChannelListItem } from '@nova/shared-types'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    channelData?: EmailChannelListItem
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
    name: '',
    provider: 'mock' as 'mock' | 'smtp',
    config: '{}',
    enabled: true
  })

  function initForm() {
    if (props.dialogType === 'edit' && props.channelData) {
      Object.assign(form, {
        id: props.channelData.id,
        name: props.channelData.name,
        provider: props.channelData.provider,
        config: props.channelData.config,
        enabled: props.channelData.status === 1
      })
      return
    }
    Object.assign(form, { id: '', name: '', provider: 'mock', config: '{}', enabled: true })
  }

  function handleClosed() {
    Object.assign(form, { id: '', name: '', provider: 'mock', config: '{}', enabled: true })
  }

  watch(
    () => [props.visible, props.dialogType, props.channelData] as const,
    ([visible]) => {
      if (visible) initForm()
    }
  )

  async function handleSubmit() {
    submitting.value = true
    try {
      const payload = {
        name: form.name,
        provider: form.provider,
        config: form.config,
        status: (form.enabled ? 1 : 0) as 0 | 1
      }
      if (props.dialogType === 'add') {
        await createEmailChannel(payload)
        ElMessage.success('新增成功')
      } else {
        await updateEmailChannel(form.id, payload)
        ElMessage.success('更新成功')
      }
      dialogVisible.value = false
      emit('success')
    } finally {
      submitting.value = false
    }
  }
</script>
