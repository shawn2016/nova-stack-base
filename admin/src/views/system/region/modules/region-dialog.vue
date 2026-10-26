<template>
  <ElDialog
    :title="dialogTitle"
    :model-value="visible"
    width="560px"
    align-center
    @update:model-value="handleCancel"
    @closed="handleClosed"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="96px">
      <ElFormItem label="上级地区" prop="parentId">
        <ElSelect v-model="form.parentId" placeholder="请选择上级地区" style="width: 100%">
          <ElOption label="顶级（省级）" value="0" />
          <ElOption
            v-for="item in parentOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
            :disabled="isEdit && item.id === form.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="地区名称" prop="name">
        <ElInput v-model="form.name" placeholder="请输入地区名称" />
      </ElFormItem>
      <ElFormItem label="区划代码" prop="code">
        <ElInput v-model="form.code" placeholder="如 110101" :disabled="isEdit" />
      </ElFormItem>
      <ElFormItem label="层级" prop="level">
        <ElSelect v-model="form.level" placeholder="请选择层级" style="width: 100%">
          <ElOption label="省级" :value="1" />
          <ElOption label="市级" :value="2" />
          <ElOption label="区县级" :value="3" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
      </ElFormItem>
      <ElFormItem label="启用">
        <ElSwitch v-model="form.status" :active-value="1" :inactive-value="0" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="handleCancel">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import type { RegionListItem } from '@nova/shared-types'
  import { createRegion, updateRegion } from '@/api/region'

  interface Props {
    visible: boolean
    editData?: RegionListItem | null
    parentId?: string
    regionOptions: RegionListItem[]
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    visible: false,
    editData: null,
    parentId: '0',
    regionOptions: () => []
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const isEdit = ref(false)

  const form = reactive({
    id: '' as string,
    parentId: '0',
    name: '',
    code: '',
    level: 1 as 1 | 2 | 3,
    sort: 0,
    status: 1 as 0 | 1
  })

  const rules: FormRules = {
    parentId: [{ required: true, message: '请选择上级地区', trigger: 'change' }],
    name: [{ required: true, message: '请输入地区名称', trigger: 'blur' }],
    code: [{ required: true, message: '请输入区划代码', trigger: 'blur' }],
    level: [{ required: true, message: '请选择层级', trigger: 'change' }]
  }

  const dialogTitle = computed(() => (isEdit.value ? '编辑地区' : '新增地区'))

  const parentOptions = computed(() =>
    props.regionOptions
      .filter((item) => item.level < 3)
      .map((item) => ({
        id: item.id,
        label: `${'　'.repeat(item.level - 1)}${item.name} (${item.code})`
      }))
  )

  watch(
    () => props.visible,
    (val) => {
      if (!val) return
      if (props.editData) {
        isEdit.value = true
        Object.assign(form, {
          id: props.editData.id,
          parentId: props.editData.parentId,
          name: props.editData.name,
          code: props.editData.code,
          level: props.editData.level,
          sort: props.editData.sort,
          status: props.editData.status
        })
      } else {
        isEdit.value = false
        const parent = props.regionOptions.find((item) => item.id === props.parentId)
        Object.assign(form, {
          id: '',
          parentId: props.parentId || '0',
          name: '',
          code: '',
          level: parent ? ((parent.level + 1) as 1 | 2 | 3) : 1,
          sort: 0,
          status: 1
        })
      }
      nextTick(() => formRef.value?.clearValidate())
    }
  )

  function handleCancel() {
    emit('update:visible', false)
  }

  function handleClosed() {
    formRef.value?.resetFields()
  }

  async function handleSubmit() {
    await formRef.value?.validate()
    submitting.value = true
    try {
      if (isEdit.value) {
        await updateRegion(form.id, {
          parentId: form.parentId,
          name: form.name,
          sort: form.sort,
          status: form.status
        })
        ElMessage.success('更新成功')
      } else {
        await createRegion({
          parentId: form.parentId,
          name: form.name,
          code: form.code,
          level: form.level,
          sort: form.sort,
          status: form.status
        })
        ElMessage.success('创建成功')
      }
      emit('success')
      handleCancel()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      submitting.value = false
    }
  }
</script>
