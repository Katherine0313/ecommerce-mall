import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/Home.vue') },
        { path: 'products', name: 'products', component: () => import('@/views/ProductList.vue') },
        { path: 'category/:id', name: 'category', component: () => import('@/views/ProductList.vue') },
        { path: 'search', name: 'search', component: () => import('@/views/Search.vue') },
        { path: 'product/:id', name: 'product-detail', component: () => import('@/views/ProductDetail.vue') },
      ],
    },
    // 未匹配的路径回首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  // 切页回到顶部
  scrollBehavior: () => ({ top: 0 }),
})

// 登录守卫：目前 P0 页面都可以游客访问；P2 接入登录后给需要登录的路由加 meta.requiresAuth
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
