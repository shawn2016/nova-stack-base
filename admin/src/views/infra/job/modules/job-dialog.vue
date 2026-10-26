<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增任务' : '编辑任务'"
    width="520px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="108px">
      <ElFormItem label="任务名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入任务名称" />
      </ElFormItem>
      <ElFormItem label="分组" prop="jobGroup">
        <ElInput v-model="form.jobGroup" placeholder="default" />
      </ElFormItem>
      <ElFormItem label="Handler" prop="invokeTarget">
        <ElSelect v-model="form.invokeTarget" placeholder="请选择 Handler" style="width: 100%">
          <ElOption
            v-for="item in handlers"
            :key="item.key"
            :label="`${item.key} (${item.description})`"
            :value="item.key"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="Cron 表达式" prop="cronExpression">
        <ElInput v-model="form.cronExpression" placeholder="0 */6 * * *" />
      </ElFormItem>
      <ElFormItem label="允许并发">
        <ElSwitch v-model="form.concurrentEnabled" active-text="是" inactive-text="否" />
      </ElFormItem>
      <ElFormItem label="启用">
        <ElSwitch v-model="form.enabled" active-text="是" inactive-text="否" />
      </ElFormItem>
      <ElFormItem label="备注">
        <ElInput v-model="form.remark" type="textarea" :rows="2" />
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
  import type { JobHandlerInfo, JobListItem } from '@nova/shared-types'
  import { createJob, updateJob } from '@/api/job'

  interface Props {
    visible: boolean
    dialogType: 'add' | 'edit'
    jobData?: JobListItem
    handlers: JobHandlerInfo[]
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    dialogType: 'add',
    jobData: undefined,
    handlers: () => []
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const rules = reactive<FormRules>({
    name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
    invokeTarget: [{ required: true, message: '请选择 Handler', trigger: 'change' }],
    cronExpression: [{ required: true, message: '请输入 Cron 表达式', trigger: 'blur' }]
  })

  const form = reactive({
    id: '',
    name: '',
    jobGroup: 'default',
    invokeTarget: '',
    cronExpression: '',
    concurrentEnabled: false,
    enabled: false,
    remark: ''
  })

  function initForm() {
    if (props.dialogType === 'edit' && props.jobData) {
      Object.assign(form, {
        id: props.jobData.id,
        name: props.jobData.name,
        jobGroup: props.jobData.jobGroup,
        invokeTarget: props.jobData.invokeTarget,
        cronExpression: props.jobData.cronExpression,
        concurrentEnabled: props.jobData.concurrent === 1,
        enabled: props.jobData.status === 1,
        remark: props.jobData.remark ?? ''
      })
    } else {
      Object.assign(form, {
        id: '',
        name: '',
        jobGroup: 'default',
        invokeTarget: props.handlers[0]?.key ?? '',
        cronExpression: '0 */6 * * *',
        concurrentEnabled: false,
        enabled: false,
        remark: ''
      })
    }
  }

  watch(
    () => props.visible,
    (val) => {
      if (val) initForm()
    }
  )

  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }

  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate()
    submitting.value = true
    try {
      const payload = {
        name: form.name,
        jobGroup: form.jobGroup,
        invokeTarget: form.invokeTarget,
        cronExpression: form.cronExpression,
        concurrent: (form.concurrentEnabled ? 1 : 0) as 0 | 1,
        status: (form.enabled ? 1 : 0) as 0 | 1,
        remark: form.remark || null
      }
      if (props.dialogType === 'add') {
        await createJob(payload)
        ElMessage.success('新增成功')
      } else {
        await updateJob(form.id, payload)
        ElMessage.success('修改成功')
      }
      emit('success')
      handleClose()
    } finally {
      submitting.value = false
    }
  }
</script>
