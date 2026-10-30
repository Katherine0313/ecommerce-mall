import request from '@/utils/request'

// 下单（需登录）：金额与快照由后端按 products 表计算
export const createOrder = (data) => request.post('/orders', data)

// 订单详情（收银台读取待付款订单）
export const getOrder = (id) => request.get(`/orders/${id}`)

// 支付：{ payType }
export const payOrder = (id, data) => request.put(`/orders/${id}/pay`, data)
