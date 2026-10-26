/**
 * 用户状态管理模块
 *
 * nova RBAC 鉴权 + art-design-pro 模板能力（语言、锁屏、工作台等）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AdminInfo, MenuNode } from '@nova/shared-types'
import { LanguageEnum } from '@/enums/appEnum'
import { router } from '@/router'
import { useSettingStore } from './setting'
import { useWorktabStore } from './worktab'
import { AppRouteRecord } from '@/types/router'
import { setPageTitle } from '@/utils/router'
import { resetRouterState } from '@/router/guards/beforeEach'
import { useMenuStore } from './menu'
import { StorageConfig } from '@/utils/storage/storage-config'
import * as authApi from '@/api/auth'
import { resetDynamicRoutes } from '@/router/permission'

const TOKEN_KEY = 'nova_admin_token'
const REFRESH_TOKEN_KEY = 'nova_admin_refresh_token'

function readStorage(key: string): string | null {
  return localStorage.getItem(key)
}

function writeStorage(key: string, value: string | null) {
  if (value) {
    localStorage.setItem(key, value)
  } else {
    localStorage.removeItem(key)
  }
}

export const useUserStore = defineStore(
  'userStore',
  () => {
    const language = ref(LanguageEnum.ZH)
    const isLock = ref(false)
    const lockPassword = ref('')
    const searchHistory = ref<AppRouteRecord[]>([])

    const accessToken = ref<string>(readStorage(TOKEN_KEY) ?? '')
    const refreshToken = ref<string>(readStorage(REFRESH_TOKEN_KEY) ?? '')
    const adminInfo = ref<AdminInfo | null>(null)
    const menus = ref<MenuNode[]>([])
    const routesLoaded = ref(false)

    const isLogin = computed(() => !!accessToken.value)
    const permissions = computed(() => adminInfo.value?.permissions ?? [])
    const info = computed(() => adminInfo.value)
    const getUserInfo = computed(() => adminInfo.value)
    const getSettingState = computed(() => useSettingStore().$state)
    const getWorktabState = computed(() => useWorktabStore().$state)

    function setUserInfo(newInfo: AdminInfo) {
      adminInfo.value = newInfo
    }

    function setLoginStatus(status: boolean) {
      if (!status) {
        accessToken.value = ''
        refreshToken.value = ''
      }
    }

    function setLanguage(lang: LanguageEnum) {
      setPageTitle(router.currentRoute.value)
      language.value = lang
    }

    function setSearchHistory(list: AppRouteRecord[]) {
      searchHistory.value = list
    }

    function setLockStatus(status: boolean) {
      isLock.value = status
    }

    function setLockPassword(password: string) {
      lockPassword.value = password
    }

    function setToken(newAccessToken: string, newRefreshToken?: string) {
      accessToken.value = newAccessToken
      writeStorage(TOKEN_KEY, newAccessToken)
      if (newRefreshToken) {
        refreshToken.value = newRefreshToken
        writeStorage(REFRESH_TOKEN_KEY, newRefreshToken)
      }
    }

    function setMenus(value: MenuNode[]) {
      menus.value = value
    }

    function setRoutesLoaded(value: boolean) {
      routesLoaded.value = value
    }

    function hasPermission(code: string) {
      return permissions.value.includes(code)
    }

    async function login(username: string, password: string) {
      const data = await authApi.login({ username, password })
      setToken(data.tokens.accessToken, data.tokens.refreshToken)
      setUserInfo(data.user)
    }

    async function logout() {
      try {
        if (accessToken.value) {
          await authApi.logout()
        }
      } catch {
        // ignore logout API errors
      } finally {
        logOut()
      }
    }

    function resetSession() {
      accessToken.value = ''
      refreshToken.value = ''
      adminInfo.value = null
      menus.value = []
      routesLoaded.value = false
      writeStorage(TOKEN_KEY, null)
      writeStorage(REFRESH_TOKEN_KEY, null)
      resetDynamicRoutes()
    }

    function logOut() {
      const currentUserId = adminInfo.value?.id
      if (currentUserId) {
        localStorage.setItem(StorageConfig.LAST_USER_ID_KEY, String(currentUserId))
      }

      resetSession()
      isLock.value = false
      lockPassword.value = ''
      sessionStorage.removeItem('iframeRoutes')
      useMenuStore().setHomePath('')
      resetRouterState(500)

      const currentRoute = router.currentRoute.value
      const redirect = currentRoute.path !== '/auth/login' ? currentRoute.fullPath : undefined
      router.push({
        name: 'Login',
        query: redirect ? { redirect } : undefined
      })
    }

    function checkAndClearWorktabs() {
      const lastUserId = localStorage.getItem(StorageConfig.LAST_USER_ID_KEY)
      const currentUserId = adminInfo.value?.id
      if (!currentUserId) return
      if (!lastUserId) return

      if (String(currentUserId) !== lastUserId) {
        const worktabStore = useWorktabStore()
        worktabStore.opened = []
        worktabStore.keepAliveExclude = []
      }

      localStorage.removeItem(StorageConfig.LAST_USER_ID_KEY)
    }

    return {
      language,
      isLogin,
      isLock,
      lockPassword,
      info,
      adminInfo,
      menus,
      routesLoaded,
      permissions,
      searchHistory,
      accessToken,
      refreshToken,
      getUserInfo,
      getSettingState,
      getWorktabState,
      setUserInfo,
      setLoginStatus,
      setLanguage,
      setSearchHistory,
      setLockStatus,
      setLockPassword,
      setToken,
      setMenus,
      setRoutesLoaded,
      hasPermission,
      login,
      logout,
      resetSession,
      logOut,
      checkAndClearWorktabs
    }
  },
  {
    persist: {
      key: 'user',
      storage: localStorage,
      pick: ['language', 'isLock', 'lockPassword', 'searchHistory']
    }
  }
)
