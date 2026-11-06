import request from '@/utils/request'

// 购物车（需登录）：响应拦截器已取出 data，这里直接拿到数组/空
export const getCart = () => request.get('/cart')

// 购物车商品总件数（首页角标用）
export const getCartCount = () => request.get('/cart/count')

// 加入购物车：{ productId, quantity, insuranceDetail, insuranceFee }
export const addCartItem = (data) => request.post('/cart', data)

// 更新数量：{ quantity, skuId }
export const updateCartItem = (productId, data) => request.put(`/cart/${productId}`, data)

// 移除某一行：多规格带 skuId，避免误删同商品其它规格
export const removeCartItem = (productId, skuId) =>
  request.delete(`/cart/${productId}`, { params: skuId != null ? { skuId } : {} })

// 清空购物车；传 skuIds/productIds 时只删这些行
export const clearCart = (productIds, skuIds) =>
  request.delete('/cart', { data: { productIds, skuIds } })
