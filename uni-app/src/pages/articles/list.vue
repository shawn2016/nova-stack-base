<template>
  <view class="page">
    <view v-if="initialLoading" class="loading-wrap">
      <u-loading-icon mode="circle" />
    </view>
    <u-empty v-else-if="list.length === 0" mode="list" text="暂无文章" />
    <view v-else class="list">
      <view v-for="item in list" :key="item.id" class="article-card" @click="goDetail(item.id)">
        <image v-if="item.coverUrl" class="cover" :src="item.coverUrl" mode="aspectFill" />
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text v-if="item.summary" class="summary">{{ item.summary }}</text>
          <text v-if="item.publishedAt" class="date">{{ formatDate(item.publishedAt) }}</text>
        </view>
      </view>
      <u-loadmore :status="loadStatus" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import type { ArticleListItem } from '@nova/shared-types';
import * as articleApi from '@/api/article';
import { useMemberStore } from '@/store/member';

const PAGE_SIZE = 10;

const memberStore = useMemberStore();
const list = ref<ArticleListItem[]>([]);
const page = ref(1);
const total = ref(0);
const initialLoading = ref(true);
const loadingMore = ref(false);
const refreshing = ref(false);

const hasMore = computed(() => list.value.length < total.value);

const loadStatus = computed(() => {
  if (loadingMore.value) {
    return 'loading';
  }
  if (!hasMore.value && list.value.length > 0) {
    return 'nomore';
  }
  return 'loadmore';
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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

async function fetchPage(nextPage: number, append: boolean) {
  const result = await articleApi.listArticles({
    page: nextPage,
    pageSize: PAGE_SIZE,
  });

  total.value = result.total;
  page.value = result.page;
  list.value = append ? [...list.value, ...result.list] : result.list;
}

async function loadInitial() {
  initialLoading.value = true;
  try {
    await fetchPage(1, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载失败';
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    initialLoading.value = false;
  }
}

async function loadMore() {
  if (initialLoading.value || loadingMore.value || refreshing.value || !hasMore.value) {
    return;
  }

  loadingMore.value = true;
  try {
    await fetchPage(page.value + 1, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载失败';
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    loadingMore.value = false;
  }
}

async function refreshList() {
  refreshing.value = true;
  try {
    await fetchPage(1, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : '刷新失败';
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    refreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/articles/detail?id=${id}` });
}

onShow(() => {
  if (!ensureLoggedIn()) {
    return;
  }
  if (list.value.length === 0) {
    loadInitial();
  }
});

onReachBottom(() => {
  loadMore();
});

onPullDownRefresh(() => {
  if (!ensureLoggedIn()) {
    uni.stopPullDownRefresh();
    return;
  }
  refreshList();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.list {
  padding: 24rpx;
}

.article-card {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.cover {
  flex-shrink: 0;
  width: 200rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #eef1f6;
}

.info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.summary {
  display: -webkit-box;
  overflow: hidden;
  font-size: 26rpx;
  color: #606266;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.date {
  margin-top: auto;
  font-size: 24rpx;
  color: #909399;
}
</style>
