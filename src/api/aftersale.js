import request from '@/utils/request'

// ===== 售后接口（需登录）=====

// 售后状态/颜色/原因/类型/货物状态常量（免登录）
export const getAfterSaleStatusConstants = () => request.get('/after-sales/status-constants')

// 我的售后列表（可选 status / search / startDate / endDate / dateField）
export const getAfterSaleList = (params = {}) => request.get('/after-sales', { params })

// 按订单查售后单（判断订单是否已申请售后，无则返回 null）
export const getAfterSaleByOrder = (orderId) =>
  request.get('/after-sales/by-order', { params: { orderId } })

// 售后详情
export const getAfterSale = (id) => request.get(`/after-sales/${id}`)

// 申请售后
// 字段：orderId / orderItemId? / afterSaleType / reason / goodsStatus? /
//       returnWay? / returnTimeSlot? / shipAddress? / remark / images[]
export const createAfterSale = (data) => request.post('/after-sales', data)

// 回填退货物流（退货退款·自行寄回）
export const submitAfterSaleReturn = (id, data) =>
  request.post(`/after-sales/${id}/submit-return`, data)

// 上传售后图片凭证（multipart），返回 { url }
export const uploadAfterSaleImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload', formData, { params: { type: 'after-sale' } })
}
