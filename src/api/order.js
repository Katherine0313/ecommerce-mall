import request from '@/utils/request'

// ===== 下单 / 支付 =====
export const createOrder = (data) => request.post('/orders', data)
export const getOrder = (id) => request.get(`/orders/${id}`)
export const payOrder = (id, data) => request.put(`/orders/${id}/pay`, data)

// ===== 我的订单 =====
// 全量列表：个人中心首页取待办数量等场景使用
export const getOrderList = (keyword) => request.get('/orders', { params: { keyword } })

// 分页列表：status 为空查全部；page 从 1 开始
export const getOrderPage = (params) => request.get('/orders/page', { params })
// 各状态订单数量，用于订单 Tab 角标
export const getOrderCounts = () => request.get('/orders/counts')

// 订单状态流转（状态码见后端 OrderStatusEnum）
export const cancelOrder = (id) => request.put(`/orders/${id}/cancel`)
// 确认收货：已发货(4) → 已完成(5)
export const finishOrder = (id) => request.put(`/orders/${id}/finish`)

// 物流轨迹
export const getOrderLogistics = (id) => request.get(`/orders/${id}/logistics`)
