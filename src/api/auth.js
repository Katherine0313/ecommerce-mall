import request from '@/utils/request'

// PC 商城登录/注册
export const loginByPassword = (data) => request.post('/user/login', data)
export const loginByCode = (data) => request.post('/user/login-code', data)
export const registerAccount = (data) => request.post('/user/register', data)
export const sendLoginCode = (data) => request.post('/user/send-code', data)
