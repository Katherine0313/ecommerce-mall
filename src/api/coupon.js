import request from '@/utils/request'

// 我的优惠券（status：AVAILABLE 可用 / USED 已使用 / EXPIRED 已过期）
export const getMyCoupons = (status) => request.get('/coupons/mine', { params: { status } })

// 领券中心（可领取的券）
export const getCouponCenter = () => request.get('/coupons/center')

// 领取优惠券
export const claimCoupon = (templateId) => request.post(`/coupons/${templateId}/claim`)

// 商品详情页“国家补贴”横幅；没有可领模板时返回 null，未登录 claimed 恒为 false
export const getProductSubsidy = (productId) =>
  request.get(`/coupons/product/${productId}/subsidy`)
