import request from '@/utils/request'

// 首页聚合：分类树 + 猜你喜欢商品
export const getHome = (limit = 10) => request.get('/home', { params: { limit } })
