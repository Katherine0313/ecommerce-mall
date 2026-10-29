import request from '@/utils/request'

// 商品列表：支持 categoryId / keyword，后端目前不分页，返回全量数组
export const getProducts = (params = {}) => request.get('/products', { params })

// 商品详情
export const getProduct = (id) => request.get(`/products/${id}`)

// 热门推荐
export const getHotProducts = (limit = 8) => request.get('/products/hot', { params: { limit } })

// 分类树
export const getCategories = () => request.get('/categories')

// 标签
export const getTags = () => request.get('/tags')
