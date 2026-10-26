<!-- 个人中心页面 -->
<template>
  <div class="w-full h-full p-0 bg-transparent border-none shadow-none">
    <div class="relative flex-b mt-2.5 max-md:block max-md:mt-1">
      <div class="w-112 mr-5 max-md:w-full max-md:mr-0">
        <div class="art-card-sm relative p-9 pb-6 overflow-hidden text-center">
          <img class="absolute top-0 left-0 w-full h-50 object-cover" src="@imgs/user/bg.webp" />
          <ElUpload
            class="avatar-uploader relative z-10 mt-30 mx-auto"
            :show-file-list="false"
            accept="image/jpeg,image/png,image/gif,image/webp"
            :http-request="handleAvatarUpload"
            :disabled="avatarUploading"
          >
            <img
              class="w-20 h-20 object-cover border-2 border-white rounded-full cursor-pointer"
              :src="avatarPreview"
              alt="avatar"
            />
          </ElUpload>
          <p v-if="avatarUploading" class="relative z-10 mt-2 text-xs text-g-500">头像上传中...</p>
          <h2 class="mt-5 text-xl font-normal">{{ userInfo?.username }}</h2>
          <p class="mt-2 text-sm text-g-500">{{ form.nickname || '未设置昵称' }}</p>
        </div>
      </div>

      <div class="flex-1 overflow-hidden max-md:w-full max-md:mt-3.5">
        <div class="art-card-sm">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">基本设置</h1>

          <ElForm
            :model="form"
            class="box-border p-5 [&_.el-input]:w-full"
            ref="profileFormRef"
            :rules="profileRules"
            label-width="86px"
            label-position="top"
          >
            <ElFormItem label="昵称" prop="nickname">
              <ElInput v-model="form.nickname" placeholder="请输入昵称" maxlength="50" />
            </ElFormItem>

            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton
                type="primary"
                class="w-22.5"
                v-ripple
                :loading="profileSaving"
                @click="saveProfile"
              >
                保存
              </ElButton>
            </div>
          </ElForm>
        </div>

        <div class="art-card-sm my-5">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">更改密码</h1>

          <ElForm
            :model="pwdForm"
            class="box-border p-5 [&_.el-input]:w-full"
            ref="pwdFormRef"
            :rules="pwdRules"
            label-width="86px"
            label-position="top"
          >
            <ElFormItem label="当前密码" prop="oldPassword">
              <ElInput
                v-model="pwdForm.oldPassword"
                type="password"
                show-password
                autocomplete="current-password"
              />
            </ElFormItem>

            <ElFormItem label="新密码" prop="newPassword">
              <ElInput
                v-model="pwdForm.newPassword"
                type="password"
                show-password
                autocomplete="new-password"
              />
            </ElFormItem>

            <ElFormItem label="确认新密码" prop="confirmPassword">
              <ElInput
                v-model="pwdForm.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
              />
            </ElFormItem>

            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton
                type="primary"
                class="w-22.5"
                v-ripple
                :loading="pwdSaving"
                @click="savePassword"
              >
                保存
              </ElButton>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { UploadAjaxError } from 'element-plus/es/components/upload/src/ajax'
  import type { UploadRequestOptions } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import defaultAvatar from '@imgs/user/avatar.webp'
  import { getMe, updateProfile, changePassword } from '@/api/auth'
  import { uploadFile } from '@/api/upload'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'UserCenter' })

  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo)

  const profileFormRef = ref<FormInstance>()
  const pwdFormRef = ref<FormInstance>()
  const avatarUploading = ref(false)
  const profileSaving = ref(false)
  const pwdSaving = ref(false)
  const avatarPreview = ref(defaultAvatar)

  const form = reactive({
    nickname: ''
  })

  const pwdForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const profileRules = reactive<FormRules>({
    nickname: [
      { required: true, message: '请输入昵称', trigger: 'blur' },
      { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
    ]
  })

  const validateConfirmPassword = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void
  ) => {
    if (!value) {
      callback(new Error('请再次输入新密码'))
      return
    }
    if (value !== pwdForm.newPassword) {
      callback(new Error('两次输入的新密码不一致'))
      return
    }
    callback()
  }

  const pwdRules = reactive<FormRules>({
    oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, message: '新密码长度不能少于 6 位', trigger: 'blur' }
    ],
    confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
  })

  function syncFormFromStore() {
    form.nickname = userInfo.value?.nickname ?? ''
    avatarPreview.value = userInfo.value?.avatar || defaultAvatar
  }

  async function refreshUserInfo() {
    const data = await getMe()
    userStore.setUserInfo(data)
    syncFormFromStore()
  }

  async function handleAvatarUpload(options: UploadRequestOptions) {
    const file = options.file as File
    avatarUploading.value = true
    try {
      const result = await uploadFile(file)
      avatarPreview.value = result.url
      await updateProfile({ avatar: result.url })
      await refreshUserInfo()
      ElMessage.success('头像已更新')
      options.onSuccess?.(result)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '头像上传失败')
      options.onError?.(
        new UploadAjaxError(
          error instanceof Error ? error.message : '上传失败',
          0,
          'POST',
          '/api/upload'
        )
      )
    } finally {
      avatarUploading.value = false
    }
  }

  async function saveProfile() {
    const valid = await profileFormRef.value?.validate().catch(() => false)
    if (!valid) return

    profileSaving.value = true
    try {
      await updateProfile({ nickname: form.nickname })
      await refreshUserInfo()
      ElMessage.success('资料已保存')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      profileSaving.value = false
    }
  }

  async function savePassword() {
    const valid = await pwdFormRef.value?.validate().catch(() => false)
    if (!valid) return

    pwdSaving.value = true
    try {
      await changePassword({
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword
      })
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
      pwdFormRef.value?.clearValidate()
      ElMessage.success('密码已修改')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '修改密码失败')
    } finally {
      pwdSaving.value = false
    }
  }

  onMounted(() => {
    syncFormFromStore()
  })

  watch(userInfo, () => {
    syncFormFromStore()
  })
</script>

<style scoped>
  .avatar-uploader :deep(.el-upload) {
    border-radius: 9999px;
    cursor: pointer;
    overflow: hidden;
  }
</style>
