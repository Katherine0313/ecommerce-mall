import request from '@/utils/request'

// 商品列表（老接口，不分页，返回数组；后端兜底 LIMIT 200）：仅兼容保留
export const getProducts = (params = {}) => request.get('/products', { params })

// 商品分页列表：page / pageSize / categoryId / keyword / brand / minPrice / maxPrice / sort
// 返回 { list, total, page, pageSize }
export const getProductPage = (params = {}) => request.get('/products/page', { params })

// 商品详情
export const getProduct = (id) => request.get(`/products/${id}`)

// 热门推荐
export const getHotProducts = (limit = 8) => request.get('/products/hot', { params: { limit } })

// 分类树
export const getCategories = () => request.get('/categories')

// 标签
export const getTags = () => request.get('/tags')

// 单个商品的标签（后端当前一商品最多一个标签，仍返回数组）
export const getProductTags = (id) => request.get(`/products/${id}/tags`)
