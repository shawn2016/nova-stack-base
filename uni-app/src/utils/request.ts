import { ErrorCode, type ApiResponse, type TokenPair } from '@nova/shared-types';
import { useMemberStore } from '@/store/member';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface RequestOptions extends Omit<UniApp.RequestOptions, 'url'> {
  url: string;
  _retry?: boolean;
  _skipAuth?: boolean;
}

let refreshPromise: Promise<TokenPair> | null = null;

function resolveUrl(url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  return `${baseURL}${url}`;
}

function unwrapResponse<T>(payload: ApiResponse<T>): T {
  if (payload.code !== ErrorCode.SUCCESS) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

function shouldAttemptRefresh(url: string): boolean {
  return (
    !url.includes('/member/auth/refresh') &&
    !url.includes('/member/auth/login') &&
    !url.includes('/member/auth/register')
  );
}

function redirectToLogin() {
  uni.reLaunch({ url: '/pages/login/login' });
}

function buildHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.header as Record<string, string> | undefined),
  };

  if (!options._skipAuth) {
    const memberStore = useMemberStore();
    if (memberStore.token) {
      headers.Authorization = `Bearer ${memberStore.token}`;
    }
  }

  return headers;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: resolveUrl('/member/auth/refresh'),
      method: 'POST',
      timeout: 15000,
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken },
      success: (res) => {
        try {
          const payload = res.data as ApiResponse<TokenPair>;
          if (res.statusCode === 401 || payload.code !== ErrorCode.SUCCESS) {
            reject(new Error(payload.message || '刷新令牌失败'));
            return;
          }
          resolve(unwrapResponse(payload));
        } catch (error) {
          reject(error);
        }
      },
      fail: reject,
    });
  });
}

/** 共享刷新结果，同时阻止退出或切换账号后的迟到响应恢复旧会话。 */
function refreshSession(): Promise<TokenPair> {
  if (!refreshPromise) {
    const memberStore = useMemberStore();
    const refreshToken = memberStore.refreshToken!;
    refreshPromise = (async () => {
      try {
        const tokens = await refreshAccessToken(refreshToken);
        if (memberStore.refreshToken !== refreshToken) {
          throw new Error('登录状态已变化，请重试');
        }
        memberStore.setTokens(tokens.accessToken, tokens.refreshToken);
        return tokens;
      } catch (error) {
        if (memberStore.refreshToken === refreshToken) {
          memberStore.resetSession();
          redirectToLogin();
        }
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function handleUnauthorized<T>(options: RequestOptions): Promise<T> {
  if (!shouldAttemptRefresh(options.url) || options._retry) {
    throw new Error('未授权');
  }

  const memberStore = useMemberStore();

  if (!memberStore.refreshToken) {
    memberStore.resetSession();
    redirectToLogin();
    throw new Error('登录已过期，请重新登录');
  }

  await refreshSession();
  // 原 header 原样保留，由 buildHeaders 注入刷新后的 Authorization。
  return request<T>({ ...options, _retry: true });
}

export function request<T = unknown>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      timeout: 15000,
      ...options,
      url: resolveUrl(options.url),
      header: buildHeaders(options),
      success: async (res) => {
        const payload = res.data as ApiResponse<T>;
        const statusCode = res.statusCode ?? 200;

        if (statusCode === 401 && !options._skipAuth) {
          try {
            const data = await handleUnauthorized<T>(options);
            resolve(data);
          } catch (error) {
            reject(error);
          }
          return;
        }

        if (statusCode >= 400) {
          reject(new Error(payload?.message || `请求失败 (${statusCode})`));
          return;
        }

        try {
          resolve(unwrapResponse(payload));
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}
