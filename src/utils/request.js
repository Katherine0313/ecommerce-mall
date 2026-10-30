import axios from 'axios'

/**
 * 统一请求实例：走 Vite 代理到网关（/api -> http://127.0.0.1:8080）
 * 后端统一响应结构：{ success, data, message, code }
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求头自动带 token（后端接受 Authorization: Bearer xxx）
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
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
    // 401 未登录/令牌过期：清 token 并通知布局层弹登录框
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      // 登录/注册接口的 401 是「密码或验证码错误」，交给弹窗提示，不当作登录态失效
      const isAuthRequest = ['/user/login', '/user/login-code', '/user/register'].some((path) =>
        url.includes(path)
      )
      if (!isAuthRequest) {
        localStorage.removeItem('token')
        window.dispatchEvent(new Event('auth-expired'))
      }
    }
    return Promise.reject(err.response?.data || err)
  }
)

export default request
