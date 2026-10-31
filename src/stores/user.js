import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getToken, setToken as saveToken, removeToken } from '@/utils/token.js'

/**
 * 登录状态：token 存在 localStorage，存取统一走 utils/token.js。
 * 注意 key 是 'mall_token'（不是后台那个 'token'），详见 utils/token.js 里的说明。
 */
export const useUserStore = defineStore('user', () => {
  const token = ref(getToken() || '')
  const isLoggedIn = computed(() => !!token.value)

  function setToken(value) {
    token.value = value || ''
    if (token.value) saveToken(token.value)
    else removeToken()
  }

  function logout() {
    setToken('')
  }

  return { token, isLoggedIn, setToken, logout }
})
