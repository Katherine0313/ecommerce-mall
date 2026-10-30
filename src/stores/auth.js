import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 登录弹窗状态。
 * 任意页面都可以 await openLogin()：登录成功 resolve(true)，用户关闭 resolve(false)，
 * 调用方据此决定是否继续原来的加购/结算等操作。
 */
export const useAuthStore = defineStore('auth', () => {
  const visible = ref(false)
  // login | register
  const mode = ref('login')
  let resolver = null

  function openLogin(tab = 'login') {
    mode.value = tab
    visible.value = true
    // 连续触发时先结束上一次等待，避免 Promise 悬空
    resolver?.(false)
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function finish(ok) {
    visible.value = false
    const resolve = resolver
    resolver = null
    resolve?.(ok)
  }

  return { visible, mode, openLogin, finish }
})
