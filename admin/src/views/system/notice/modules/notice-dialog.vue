<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增公告' : '编辑公告'"
    width="560px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="88px">
      <ElFormItem label="标题" prop="title">
        <ElInput v-model="form.title" placeholder="请输入标题" />
      </ElFormItem>
      <ElFormItem label="类型" prop="type">
        <ElSelect v-model="form.type" style="width: 100%">
          <ElOption label="通知" :value="1" />
          <ElOption label="公告" :value="2" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="内容" prop="content">
        <ElInput v-model="form.content" type="textarea" :rows="6" placeholder="请输入内容" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import type { NoticeListItem } from '@nova/shared-types'
  import { createNotice, updateNotice } from '@/api/notice'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    noticeData?: NoticeListItem
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    dialogType: 'add',
    noticeData: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    type: [{ required: true, message: '请选择类型', trigger: 'change' }],
    content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
  })

  const form = reactive({
    id: '',
    title: '',
    content: '',
    type: 1 as 1 | 2
  })

  function initForm() {
    if (props.dialogType === 'edit' && props.noticeData) {
      Object.assign(form, {
        id: props.noticeData.id,
        title: props.noticeData.title,
        content: props.noticeData.content,
        type: props.noticeData.type
      })
    } else {
      Object.assign(form, { id: '', title: '', content: '', type: 1 as 1 | 2 })
    }
  }

  watch(
    () => props.visible,
    (val) => {
      if (val) initForm()
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
      if (props.dialogType === 'add') {
        await createNotice({
          title: form.title,
          content: form.content,
          type: form.type
        })
        ElMessage.success('创建成功')
      } else {
        await updateNotice(form.id, {
          title: form.title,
          content: form.content,
          type: form.type
        })
        ElMessage.success('更新成功')
      }
      emit('success')
      handleClose()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      submitting.value = false
    }
  }
</script>
