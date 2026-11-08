/**
 * 匿名访客标识：AI 聊天等免登录功能使用。
 * 首次访问生成 UUID 存入 localStorage，后续请求带 X-Anonymous-Id 头。
 */
const STORAGE_KEY = 'jm_anonymous_id'

function genId() {
  // 32 位十六进制（去掉连字符，与后端 32~64 位校验对齐）
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getAnonymousId() {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id || id.length < 32) {
    id = genId()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
