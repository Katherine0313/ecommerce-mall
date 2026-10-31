// ==================== token 存取工具 ====================
// token 由后端 JWT 生成，前端只负责存取，不依赖 pinia。
// 统一封装 localStorage，key 为 'mall_token'。
//
// ⚠️ 为什么不用 'token'：
//   后台管理端（e-commerce）也用 localStorage['token']，而两个前端的 dev server
//   都是 5173 端口 = 同源 = localStorage 共享。后台的 token 是 type=admin，
//   拿到 C 端接口（/api/cart 等）会被 JwtInterceptor 判成身份不匹配 → 403 无权访问。
//   所以商城用独立 key 'mall_token'，跟后台彻底隔离。

const TOKEN_KEY = 'mall_token'

/** 读取 token（未登录时返回 null） */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/** 写入 token；传空值等价于清除 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/** 清除 token（登出 / 令牌失效用） */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}
