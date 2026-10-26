<template>
  <view class="container">
    <text class="title">{{ appStore.title }}</text>

    <view v-if="memberStore.isLoggedIn" class="member-card">
      <text class="member-label">已登录会员</text>

      <text class="member-name">{{ memberStore.memberInfo?.nickname }}</text>

      <text class="member-phone">{{ memberStore.memberInfo?.phone }}</text>

      <u-button type="error" plain text="退出登录" @click="handleLogout" />
    </view>

    <view v-else class="member-card">
      <text class="member-label">未登录</text>

      <u-button type="primary" text="去登录" @click="goLogin" />
    </view>

    <u-button type="primary" text="文章列表" @click="goArticles" />

    <u-button type="primary" plain text="检查服务健康" @click="checkHealth" />

    <text v-if="healthStatus" class="status">{{ healthStatus }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useAppStore } from '@/store/modules/app';

import { useMemberStore } from '@/store/member';

import { request } from '@/utils/request';

const appStore = useAppStore();

const memberStore = useMemberStore();

const healthStatus = ref('');

interface HealthData {
  status: string;
}

async function checkHealth() {
  healthStatus.value = '请求中...';

  try {
    const data = await request<HealthData>({
      url: '/health',

      method: 'GET',
    });

    healthStatus.value = `服务状态：${data.status}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败';

    healthStatus.value = message;
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' });
}

function goArticles() {
  if (!memberStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' });

    uni.navigateTo({ url: '/pages/login/login' });

    return;
  }

  uni.navigateTo({ url: '/pages/articles/list' });
}

async function handleLogout() {
  await memberStore.logout();

  uni.showToast({ title: '已退出登录', icon: 'success' });
}
</script>

<style scoped>
.container {
  display: flex;

  flex-direction: column;

  align-items: center;

  padding: 80rpx 40rpx;

  gap: 32rpx;
}

.title {
  font-size: 40rpx;

  font-weight: 600;

  color: #303133;
}

.member-card {
  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 16rpx;

  width: 100%;

  padding: 32rpx;

  background: #fff;

  border-radius: 16rpx;

  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.member-label {
  font-size: 26rpx;

  color: #909399;
}

.member-name {
  font-size: 32rpx;

  font-weight: 600;

  color: #303133;
}

.member-phone {
  font-size: 28rpx;

  color: #606266;
}

.status {
  font-size: 28rpx;

  color: #606266;

  text-align: center;
}
</style>
