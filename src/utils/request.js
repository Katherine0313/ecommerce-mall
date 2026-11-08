import axios from 'axios'
import router from '@/router/index.js'
import { getToken, removeToken } from '@/utils/token.js'
import { getAnonymousId } from '@/utils/anonymous.js'

/**
 * 统一请求实例：走 Vite 代理到网关（/api -> http://127.0.0.1:8080）
 * 后端统一响应结构：{ success, data, message, code }
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求头自动带 token（后端接受 Authorization: Bearer xxx）
// AI 接口额外带 X-Anonymous-Id，支持未登录用户匿名使用
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.url?.startsWith('/mall/ai/')) {
    config.headers['X-Anonymous-Id'] = getAnonymousId()
  }
  return config
})

// 响应拦截：成功直接返回 data，失败统一 reject
request.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && body.success === false) return Promise.reject(body)
    return body ? body.data : res.data
  },
  (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''
    // 登录/注册接口的 401 是「密码或验证码错误」，交给登录页提示，不当作登录态失效
    // AI 接口支持匿名访问（X-Anonymous-Id），401/403 不强制跳登录页
    const isAuthRequest = ['/user/login', '/user/login-code', '/user/register'].some((path) =>
      url.includes(path)
    )
    const isAiAnonymous = url.startsWith('/mall/ai/')
    if (!isAuthRequest && !isAiAnonymous) {
      // 401：未登录 / 令牌过期 → 清 token 跳登录页
      // 403：令牌类型不对（后台 token 串进来了）或已失效 → 同样清掉跳登录页
      if (status === 401 || status === 403) {
        removeToken()
        router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
      }
    }
    return Promise.reject(err.response?.data || err)
  }
)

export default request
