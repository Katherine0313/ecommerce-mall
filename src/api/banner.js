import request from '@/utils/request'

// 首页轮播：position 11 = PC 商城首页（小程序首页=1、小程序分类页=2）
export const getBanners = (position) => request.get('/banners', { params: { position } })

// Banner 点击量 +1
export const reportBannerBrowse = (id) => request.post(`/banners/${id}/browse`)
