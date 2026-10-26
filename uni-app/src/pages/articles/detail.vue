<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" />
    </view>
    <u-empty v-else-if="!article" mode="data" text="文章不存在或已下架" />
    <view v-else class="article">
      <text class="title">{{ article.title }}</text>
      <text v-if="article.publishedAt" class="meta">{{ formatDate(article.publishedAt) }}</text>
      <image v-if="article.coverUrl" class="cover" :src="article.coverUrl" mode="widthFix" />
      <text v-if="article.summary" class="summary">{{ article.summary }}</text>
      <text class="content">{{ article.content }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { Article } from '@nova/shared-types';
import * as articleApi from '@/api/article';
import { useMemberStore } from '@/store/member';

const memberStore = useMemberStore();
const article = ref<Article | null>(null);
const loading = ref(true);
const articleId = ref<number | null>(null);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ensureLoggedIn() {
  if (!memberStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    uni.navigateTo({ url: '/pages/login/login' });
    return false;
  }
  return true;
}

async function loadArticle() {
  if (articleId.value == null) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    article.value = await articleApi.getArticle(articleId.value);
  } catch (error) {
    article.value = null;
    const message = error instanceof Error ? error.message : '加载失败';
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onLoad((query) => {
  if (!ensureLoggedIn()) {
    loading.value = false;
    return;
  }

  const id = Number(query?.id);
  if (!id || Number.isNaN(id)) {
    loading.value = false;
    uni.showToast({ title: '无效的文章 ID', icon: 'none' });
    return;
  }

  articleId.value = id;
  loadArticle();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.article {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.meta {
  font-size: 24rpx;
  color: #909399;
}

.cover {
  width: 100%;
  border-radius: 12rpx;
}

.summary {
  padding: 24rpx;
  font-size: 28rpx;
  color: #606266;
  line-height: 1.6;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.content {
  font-size: 30rpx;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
