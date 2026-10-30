import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * 登录状态：token 存在 localStorage，key 与 request.js 保持一致。
 * 目前登录接口还没接（P2），后续登录成功后调用 setToken 即可让页面自动切换。
 */
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const isLoggedIn = computed(() => !!token.value)

  function setToken(value) {
    token.value = value || ''
    if (token.value) localStorage.setItem('token', token.value)
    else localStorage.removeItem('token')
  }

  function logout() {
    setToken('')
  }

  return { token, isLoggedIn, setToken, logout }
})
