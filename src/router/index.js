import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/token.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // 顶层布局：顶部导航 + 页脚，所有业务页面都在里面
      path: '/',
      component: () => import('@/views/layouts/DefaultLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/Home.vue') },
        { path: 'products-list', name: 'products', component: () => import('@/views/products/ProductList.vue'), meta: { hideHeader: true } },
        { path: 'category/:id', name: 'category', component: () => import('@/views/products/ProductList.vue'), meta: { hideHeader: true } },
        { path: 'search', name: 'search', component: () => import('@/views/Search.vue') },
        // 详情页 hideHeader：窄屏下自己有一个底部固定购买栏，不能再叠底部 Tab
        { path: 'product/:id', name: 'product-detail', component: () => import('@/views/products/ProductDetail.vue'), meta: { hideHeader: true, hideTabBar: true, fixedBottomBar: true } },
        // 文章详情：关于我们 / 隐私政策 / Banner 跳转文章都走这里
        { path: 'article/:id', name: 'article-detail', component: () => import('@/views/article/ArticleDetail.vue') },

        // 购物车 / 结算 / 支付：独立页面（淘宝做法，不用弹窗），但在布局内，保留页脚。
        // hideTabBar：这些页面自己带固定底部操作栏，再叠底部 Tab 会互相遮挡
        { path: 'cart', name: 'cart', component: () => import('@/views/products/Cart.vue'), meta: { requiresAuth: true, hideHeader: true, hideTabBar: true } },
        { path: 'checkout', name: 'checkout', component: () => import('@/views/products/Settlement.vue'), meta: { requiresAuth: true, hideHeader: true, hideTabBar: true } },
        { path: 'pay/:orderId', name: 'pay', component: () => import('@/views/products/Paid.vue'), meta: { requiresAuth: true, hideHeader: true, hideTabBar: true } },

        // AI 客服：独立全屏聊天页，自己带头部与底部输入框，不叠站点头尾
        { path: 'ai-chat', name: 'ai-chat', component: () => import('@/views/ai/AiChat.vue'), meta: { requiresAuth: true, hideHeader: true, hideTabBar: true } },

        // 售后：独立页面（申请 / 详情），不用弹窗
        { path: 'aftersales/apply/:orderId', name: 'aftersale-apply', component: () => import('@/views/aftersales/ApplyAfterSale.vue'), meta: { requiresAuth: true } },
        { path: 'aftersales/order/:orderId', name: 'aftersale-detail', component: () => import('@/views/aftersales/AfterSaleDetail.vue'), meta: { requiresAuth: true } },

        // 个人中心：二级布局（左侧菜单 + 右侧内容），嵌在 DefaultLayout 里
        {
          path: 'user',
          component: () => import('@/views/layouts/UserLayout.vue'),
          meta: { requiresAuth: true },
          children: [
            { path: '', name: 'user', component: () => import('@/views/user/Profile.vue') },
            { path: 'orders', name: 'user-orders', component: () => import('@/views/user/OrderList.vue') },
            { path: 'orders/:id', name: 'user-order-detail', component: () => import('@/views/user/OrderDetail.vue') },
            { path: 'aftersales', name: 'user-aftersales', component: () => import('@/views/user/AfterSaleList.vue') },
            { path: 'personal-info', name: 'user-personal-info', component: () => import('@/views/user/PersonalInfo.vue') },
            { path: 'addresses', name: 'user-addresses', component: () => import('@/views/user/AddressList.vue') },
            { path: 'favorites', name: 'user-favorites', component: () => import('@/views/user/Favorites.vue') },
            { path: 'coupons', name: 'user-coupons', component: () => import('@/views/user/Coupons.vue') },
            { path: 'member', name: 'user-member', component: () => import('@/views/user/Member.vue') },
          ],
        },
      ],
    },
    // 登录页：独立路由页，不套 DefaultLayout（没有头尾）
    { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },
    // 未匹配的路径回首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  // 切页回到顶部
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 路由守卫：登录态控制。
 * 1. 需要登录的页面（meta.requiresAuth）没 token → 跳登录页，并带上来源路径
 * 2. 已登录还去登录页 → 直接跳回去（避免登录页出现在地址栏）
 */
router.beforeEach((to) => {
  const token = getToken()
  // 需要登录但没登录：跳登录页，redirect 记下来，登录后跳回
  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 已登录还访问登录页：直接回原目标页
  if (to.path === '/login' && token) {
    const redirect = to.query.redirect
    return typeof redirect === 'string' && redirect ? redirect : '/'
  }
})

export default router
