import request from '@/utils/request'

// ===== 用户资料 =====
export const getProfile = () => request.get('/user/profile')

// 上传头像（multipart）
export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/user/avatar', formData)
}

// 设置昵称
export const setName = (name) => request.post('/user/name', { name })

// 绑定手机号
export const bindPhone = (phone, code) => request.post('/user/phone', { phone, code })

// 注销账号
export const deactivate = () => request.post('/user/deactivate')

// ===== 会员中心 =====
export const getMemberProfile = () => request.get('/member/profile')
export const getMemberLevels = () => request.get('/member/levels')
