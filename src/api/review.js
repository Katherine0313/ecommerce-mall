import request from '@/utils/request'

// 商品评价（公开只读，免登录）
// 后端只返回 status=1（显示）且未删除的评价，后台隐藏一条前台立刻不显示。

// 某商品的评价列表：GET /reviews/product/{productId}?page=1&pageSize=10
// 返回 { list, total, page, pageSize }
export const getProductReviews = (productId, page = 1, pageSize = 10) =>
  request.get(`/reviews/product/${productId}`, { params: { page, pageSize } })

// 某商品的评价统计：GET /reviews/product/{productId}/summary
// 返回 { totalCount, avgRating, goodRate, withMediaCount, fiveStar ... oneStar }
export const getReviewSummary = (productId) => request.get(`/reviews/product/${productId}/summary`)
