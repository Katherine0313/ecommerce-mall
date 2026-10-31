import request from '@/utils/request'

// ===== 下单 / 支付 =====
export const createOrder = (data) => request.post('/orders', data)
export const getOrder = (id) => request.get(`/orders/${id}`)
export const payOrder = (id, data) => request.put(`/orders/${id}/pay`, data)

// ===== 我的订单 =====
// 注意：后端 GET /api/orders 只支持 keyword，不支持按状态筛选，
// 订单列表的状态 tab 由前端按 orderStatus 过滤。
export const getOrderList = (keyword) => request.get('/orders', { params: { keyword } })

// 订单状态流转（状态码见后端 OrderStatusEnum）
export const cancelOrder = (id) => request.put(`/orders/${id}/cancel`)
export const confirmOrder = (id) => request.put(`/orders/${id}/confirm`)
export const finishOrder = (id) => request.put(`/orders/${id}/finish`)

// 物流轨迹
export const getOrderLogistics = (id) => request.get(`/orders/${id}/logistics`)
