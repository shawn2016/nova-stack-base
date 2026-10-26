<template>
  <ElDialog
    v-model="dialogVisible"
    title="存储配置"
    width="640px"
    align-center
    @closed="handleClosed"
  >
    <ElForm label-width="140px">
      <ElFormItem label="存储方式">
        <ElRadioGroup v-model="form.provider">
          <ElRadio value="local">本地存储</ElRadio>
          <ElRadio value="aliyun_oss">阿里云 OSS</ElRadio>
          <ElRadio value="tencent_cos">腾讯云 COS</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="上传大小上限">
        <ElInputNumber
          v-model="form.maxSize"
          :min="1024"
          :step="1024 * 1024"
          controls-position="right"
        />
        <span class="settings-hint">字节，当前约 {{ formatSize(form.maxSize) }}</span>
      </ElFormItem>

      <template v-if="form.provider === 'local'">
        <ElFormItem label="访问域名">
          <ElInput v-model="form.local.appPublicUrl" placeholder="http://localhost:3000" />
        </ElFormItem>
        <ElFormItem label="上传目录">
          <ElInput v-model="form.local.uploadsDir" placeholder="/path/to/uploads" />
        </ElFormItem>
      </template>

      <template v-if="form.provider === 'aliyun_oss'">
        <ElFormItem label="Region">
          <ElInput v-model="form.aliyun.region" placeholder="oss-cn-hangzhou" />
        </ElFormItem>
        <ElFormItem label="Bucket">
          <ElInput v-model="form.aliyun.bucket" />
        </ElFormItem>
        <ElFormItem label="AccessKeyId">
          <ElInput v-model="form.aliyun.accessKeyId" />
        </ElFormItem>
        <ElFormItem label="AccessKeySecret">
          <ElInput
            v-model="form.aliyun.accessKeySecret"
            type="password"
            show-password
            placeholder="留空则不修改"
          />
        </ElFormItem>
        <ElFormItem label="CDN 域名">
          <ElInput
            v-model="form.aliyun.publicBaseUrl"
            placeholder="可选，如 https://cdn.example.com"
          />
        </ElFormItem>
      </template>

      <template v-if="form.provider === 'tencent_cos'">
        <ElFormItem label="Region">
          <ElInput v-model="form.tencent.region" placeholder="ap-guangzhou" />
        </ElFormItem>
        <ElFormItem label="Bucket">
          <ElInput v-model="form.tencent.bucket" />
        </ElFormItem>
        <ElFormItem label="SecretId">
          <ElInput v-model="form.tencent.secretId" />
        </ElFormItem>
        <ElFormItem label="SecretKey">
          <ElInput
            v-model="form.tencent.secretKey"
            type="password"
            show-password
            placeholder="留空则不修改"
          />
        </ElFormItem>
        <ElFormItem label="CDN 域名">
          <ElInput
            v-model="form.tencent.publicBaseUrl"
            placeholder="可选，如 https://cdn.example.com"
          />
        </ElFormItem>
      </template>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { UploadSettings, UploadStorageProvider } from '@nova/shared-types'
  import { fetchUploadSettings, updateUploadSettings } from '@/api/upload-settings'

  interface Props {
    visible: boolean
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    'update:visible': [value: boolean]
    success: []
  }>()

  const SECRET_MASK = '******'
  const submitting = ref(false)

  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const form = reactive<UploadSettings>({
    provider: 'local',
    maxSize: 5 * 1024 * 1024,
    local: { appPublicUrl: 'http://localhost:3000', uploadsDir: '' },
    aliyun: {
      region: '',
      bucket: '',
      accessKeyId: '',
      accessKeySecret: '',
      publicBaseUrl: ''
    },
    tencent: {
      region: '',
      bucket: '',
      secretId: '',
      secretKey: '',
      publicBaseUrl: ''
    }
  })

  function formatSize(size: number): string {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  function handleClosed() {
    Object.assign(form, {
      provider: 'local',
      maxSize: 5 * 1024 * 1024,
      local: { appPublicUrl: 'http://localhost:3000', uploadsDir: '' },
      aliyun: {
        region: '',
        bucket: '',
        accessKeyId: '',
        accessKeySecret: '',
        publicBaseUrl: ''
      },
      tencent: {
        region: '',
        bucket: '',
        secretId: '',
        secretKey: '',
        publicBaseUrl: ''
      }
    })
  }

  watch(
    () => props.visible,
    async (visible) => {
      if (!visible) return
      try {
        const settings = await fetchUploadSettings()
        Object.assign(form, settings)
      } catch (error) {
        ElMessage.error(error instanceof Error ? error.message : '加载配置失败')
        dialogVisible.value = false
      }
    }
  )

  async function handleSubmit() {
    submitting.value = true
    try {
      const payload = {
        provider: form.provider as UploadStorageProvider,
        maxSize: form.maxSize,
        local: { ...form.local },
        aliyun: {
          ...form.aliyun,
          ...(form.aliyun.accessKeySecret === SECRET_MASK || !form.aliyun.accessKeySecret
            ? { accessKeySecret: undefined }
            : {})
        },
        tencent: {
          ...form.tencent,
          ...(form.tencent.secretKey === SECRET_MASK || !form.tencent.secretKey
            ? { secretKey: undefined }
            : {})
        }
      }
      await updateUploadSettings(payload)
      ElMessage.success('存储配置已保存')
      dialogVisible.value = false
      emit('success')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .settings-hint {
    margin-left: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
