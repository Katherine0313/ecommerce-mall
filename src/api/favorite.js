import request from '@/utils/request'

// 我的收藏列表（按收藏时间倒序）
export const getFavorites = () => request.get('/favorites')

// 取消收藏（不存在也返回成功）
export const removeFavorite = (productId) => request.delete(`/favorites/${productId}`)

// 是否已收藏（详情页回显）
export const checkFavorite = (productId) => request.get('/favorites/check', { params: { productId } })
