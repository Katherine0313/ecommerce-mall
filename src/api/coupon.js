import request from '@/utils/request'

// 我的优惠券（status：AVAILABLE 可用 / USED 已使用 / EXPIRED 已过期）
export const getMyCoupons = (status) => request.get('/coupons/mine', { params: { status } })

// 领券中心（可领取的券）
export const getCouponCenter = () => request.get('/coupons/center')

// 领取优惠券
export const claimCoupon = (templateId) => request.post(`/coupons/${templateId}/claim`)
