<template>
  <view class="page">
    <view class="card">
      <text class="title">会员注册</text>
      <view class="form">
        <u-input
          v-model="form.phone"
          placeholder="手机号"
          type="number"
          maxlength="11"
          border="surround"
        />
        <u-input
          v-model="form.password"
          placeholder="密码（至少 6 位）"
          password
          border="surround"
        />
        <u-input v-model="form.nickname" placeholder="昵称（可选）" border="surround" />
        <u-button type="primary" text="注册" :loading="loading" @click="handleRegister" />
        <view class="link-row">
          <text class="link" @click="goLogin">已有账号？去登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useMemberStore } from '@/store/member';

const memberStore = useMemberStore();
const loading = ref(false);

const form = reactive({
  phone: '',
  password: '',
  nickname: '',
});

async function handleRegister() {
  if (!form.phone || !form.password) {
    uni.showToast({ title: '请输入手机号和密码', icon: 'none' });
    return;
  }

  if (form.password.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    await memberStore.register(form.phone, form.password, form.nickname.trim() || undefined);
    uni.showToast({ title: '注册成功', icon: 'success' });
    uni.reLaunch({ url: '/pages/index/index' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败';
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goLogin() {
  uni.navigateBack();
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: #f5f7fa;
}

.card {
  width: 100%;
  max-width: 640rpx;
  padding: 48rpx 40rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.title {
  display: block;
  margin-bottom: 40rpx;
  font-size: 40rpx;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.link-row {
  display: flex;
  justify-content: center;
  margin-top: 8rpx;
}

.link {
  font-size: 26rpx;
  color: #2979ff;
}
</style>
