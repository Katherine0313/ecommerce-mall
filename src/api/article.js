import request from '@/utils/request'

// 文章列表：可按 recommendHot / recommendBanner / limit 过滤
export const getArticles = (params) => request.get('/articles', { params })

// 文章详情
export const getArticleDetail = (id) => request.get(`/articles/${id}`)

// 按标题取文章（关于我们 / 隐私政策等固定入口用）
export const getArticleByTitle = (title) => request.get('/articles/by-title', { params: { title } })

// 文章浏览量 +1
export const reportArticleBrowse = (id) => request.post(`/articles/${id}/browse`)
