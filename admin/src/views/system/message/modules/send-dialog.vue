<template>
  <ElDialog v-model="visible" title="发送消息" width="520px" align-center @close="handleClose">
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="88px">
      <ElFormItem label="收件人" prop="receiverId">
        <ElSelect
          v-model="form.receiverId"
          filterable
          placeholder="请选择收件人"
          style="width: 100%"
        >
          <ElOption
            v-for="user in userOptions"
            :key="user.id"
            :label="`${user.nickname} (${user.username})`"
            :value="user.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="标题" prop="title">
        <ElInput v-model="form.title" placeholder="请输入标题" />
      </ElFormItem>
      <ElFormItem label="内容" prop="content">
        <ElInput v-model="form.content" type="textarea" :rows="5" placeholder="请输入内容" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">发送</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { sendMessage } from '@/api/notice'
  import { fetchUserList } from '@/api/system-manage'

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
  const userOptions = ref<{ id: string; username: string; nickname: string }[]>([])

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    receiverId: [{ required: true, message: '请选择收件人', trigger: 'change' }],
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
  })

  const form = reactive({
    receiverId: '',
    title: '',
    content: ''
  })

  watch(
    () => props.visible,
    async (val) => {
      if (!val) return
      Object.assign(form, { receiverId: '', title: '', content: '' })
      const res = await fetchUserList({ current: 1, size: 200 })
      userOptions.value = res.records.map((u) => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname
      }))
    }
  )

  function handleClose() {
    visible.value = false
    formRef.value?.resetFields()
  }

  async function handleSubmit() {
    await formRef.value?.validate()
    submitting.value = true
    try {
      await sendMessage({ ...form })
      ElMessage.success('发送成功')
      emit('success')
      handleClose()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '发送失败')
    } finally {
      submitting.value = false
    }
  }
</script>
