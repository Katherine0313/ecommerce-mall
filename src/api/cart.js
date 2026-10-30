import request from '@/utils/request'

// 购物车（需登录）：响应拦截器已取出 data，这里直接拿到数组/空
export const getCart = () => request.get('/cart')

// 购物车商品总件数（首页角标用）
export const getCartCount = () => request.get('/cart/count')

// 加入购物车：{ productId, quantity, insuranceDetail, insuranceFee }
export const addCartItem = (data) => request.post('/cart', data)

// 更新数量：{ quantity }
export const updateCartItem = (productId, data) => request.put(`/cart/${productId}`, data)

// 移除某个商品
export const removeCartItem = (productId) => request.delete(`/cart/${productId}`)

// 清空购物车；传 productIds 时只删这些商品
export const clearCart = (productIds) => request.delete('/cart', { data: { productIds } })
