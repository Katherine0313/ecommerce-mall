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
    // 401 未登录/令牌过期：清 token 并带 redirect 跳登录页
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      if (!location.pathname.startsWith('/login')) {
        const redirect = encodeURIComponent(location.pathname + location.search)
        location.href = `/login?redirect=${redirect}`
      }
    }
    return Promise.reject(err.response?.data || err)
  }
)

export default request
