/**
 * 未登录时触发的操作（加购、结算）先记在这里，登录成功后再自动继续。
 *
 * 为什么需要：点「加入购物车」时如果没登录，会跳到登录页。
 * 登录页是独立路由，跳过去再跳回来时原来的点击意图已经丢了，
 * 所以先把「要加购哪个商品、加几件」记下来，跳回来后自动补上。
 *
 * 用 sessionStorage：关掉标签页就没了，不会误触发。
 */

const KEY = 'pendingLoginAction'

/** 记下一个待登录后继续的操作 */
export function savePendingAction(action) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(action))
  } catch (e) {
    // 隐私模式等场景 sessionStorage 可能不可用，忽略即可（登录后不自动继续）
  }
}

/**
 * 取出并清除待办操作。
 * 取出即清除，避免刷新页面时重复执行。
 */
export function takePendingAction() {
  let raw = null
  try {
    raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch (e) {
    return null
  }
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}
