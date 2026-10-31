<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart.js'
import {
  HomeFilled,
  List,
  Star,
  Ticket,
  Medal,
  ShoppingCart,
  User,
  EditPen,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const keyword = ref('')
// 淘宝式热门搜索词：点击直接搜索
const HOT_KEYWORDS = ['手机', '笔记本', '平板', '耳机', '手表', '相机']
// 站点 Logo：后端 /image 静态目录托管（与 StoreCard 同源）
const logoUrl = '/image/zongjie.webp'
// 购物车是独立页面（/cart），头部入口直接跳路由

function onCart() {
  router.push('/cart')
}

// 去登录页（登录页是独立路由）
function onLogin() {
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

// 下拉菜单命令
function onCommand(command) {
  if (command === 'logout') {
    onLogout()
    return
  }
  const target = {
    orders: '/user/orders',
    profile: '/user',
    member: '/user/member',
  }[command]
  if (target) router.push(target)
}

// 退出登录：C 端是无状态 JWT，服务端没有 logout 接口，前端清掉 token 即可。
// 购物车只清本地内存快照，不动后端数据（那是用户的数据，退出登录不该删）。
function onLogout() {
  userStore.logout()
  cartStore.resetLocal()
  router.push('/login')
}

// 从搜索页返回时同步输入框内容
watch(
  () => route.query.keyword,
  (value) => {
    if (route.name === 'search') keyword.value = value || ''
  },
  { immediate: true }
)

// 「加入购物车成功」浮层点「查看购物车」跳过来时，直接进购物车页
watch(
  () => route.query.openCart,
  (value) => {
    if (value !== '1') return
    // 把 openCart 从地址栏去掉，避免刷新页面又跳一次
    const query = { ...route.query }
    delete query.openCart
    router.replace({ path: '/cart', query })
  }
)

function onSearch() {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { keyword: q } : {} })
}

// 点击热门词：填入搜索框并立即搜索
function searchByKeyword(word) {
  keyword.value = word
  onSearch()
}
</script>

<template>
  <div class="layout">
    <!-- 顶部工具条（淘宝式）：登录状态 + 个人中心入口，滚动时随页面滚走 -->
    <div class="topbar">
      <div class="container topbar-inner">
        <div class="topbar-left">
          <template v-if="!userStore.isLoggedIn">
            <span class="topbar-greeting">
              <el-icon><User /></el-icon>亲，请登录
            </span>
            <button type="button" class="topbar-link" @click="onLogin">
              <el-icon><EditPen /></el-icon>免费注册
            </button>
          </template>
          <span v-else class="topbar-greeting">
            <el-icon><User /></el-icon>您好，欢迎回来
          </span>
        </div>
        <nav class="topbar-nav">
          <span class="topbar-extra">
            <button type="button" class="topbar-link" @click="router.push('/')">
              <el-icon><HomeFilled /></el-icon>首页
            </button>
            <button type="button" class="topbar-link" @click="router.push('/user/orders')">
              <el-icon><List /></el-icon>我的订单
            </button>
            <button type="button" class="topbar-link" @click="router.push('/user/favorites')">
              <el-icon><Star /></el-icon>我的收藏
            </button>
            <button type="button" class="topbar-link" @click="router.push('/user/coupons')">
              <el-icon><Ticket /></el-icon>我的优惠券
            </button>
            <button type="button" class="topbar-link" @click="router.push('/user/member')">
              <el-icon><Medal /></el-icon>会员中心
            </button>
          </span>
          <!-- 购物车入口固定在工具条最右侧 -->
          <button type="button" class="topbar-link cart-entry" @click="onCart">
            <el-icon><ShoppingCart /></el-icon>购物车
          </button>
          <!-- 登录后头像在右侧（点开是账户下拉菜单） -->
          <el-dropdown v-if="userStore.isLoggedIn" trigger="click" @command="onCommand">
            <el-image
              class="avatar"
              src="/image/zongjie.webp"
              fit="cover"
              alt="我的头像"
            />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="orders">我的订单</el-dropdown-item>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="member">会员中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </nav>
      </div>
    </div>

    <!-- 大搜索栏头部：商品/购物车/结算等页面（meta.hideHeader）不显示，聚焦下单流程 -->
    <header v-if="!route.meta.hideHeader" class="header">
      <div class="container header-inner">
        <router-link to="/" class="logo">
          <span class="logo-avatar">
            <!-- 兔耳朵挂件：金色描边 + 粉色内耳，适配 32px 小 logo -->
            <span class="bunny-ear ear-left" aria-hidden="true"></span>
            <span class="bunny-ear ear-right" aria-hidden="true"></span>
            <img :src="logoUrl" class="logo-img" alt="杰米商城" />
          </span>
          <span>杰米商城</span>
        </router-link>

        <!-- 大搜索框：独立于导航，居中位于内容区（分类栏 + 轮播图）正上方 -->
        <div class="search-wrap">
          <form class="search" @submit.prevent="onSearch">
            <el-input v-model="keyword" placeholder="搜索商品" clearable size="large" />
            <el-button type="primary" native-type="submit" size="large">搜索</el-button>
          </form>
          <!-- 热门搜索词（淘宝式） -->
          <div class="hot-words">
            <span>热门：</span>
            <button
              v-for="word in HOT_KEYWORDS"
              :key="word"
              type="button"
              class="hot-word"
              @click="searchByKeyword(word)"
            >
              {{ word }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <!-- 全局购物车已改为独立页面（/cart），这里不再挂弹窗 -->

    <footer class="footer">
      <div class="container">
        <p>© 2026 杰米多多电子商务工作室 版权所有</p>
        <!-- 备案信息：按工信部/公安备案要求展示，不可删除 -->
        <p class="filing">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">粤ICP备2026115644号</a>
          <span class="divider">|</span>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=44030002016843"
            target="_blank"
            rel="noopener"
          >粤公网安备44030002016843号</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
}

/* ===== 顶部工具条 ===== */
.topbar {
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-light);
  font-size: 12px;
  color: var(--text-secondary);
}

.topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  padding: 0 10px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 工具条左侧的一组文字入口（窄屏隐藏，保留购物车与头像） */
.topbar-extra {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-entry {
  font-weight: 500;
  color: var(--text-primary);
}

.topbar-greeting {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.topbar-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.topbar-link:hover,
.cart-entry:hover {
  color: var(--color-primary);
}

.header {
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
}

/* 三列栅格：左右等宽，搜索框永远居中 */
.header-inner {
  display: grid;
  grid-template-columns: 1fr minmax(370px, 630px) 1fr;
  align-items: center;
  gap: 24px;
  height: 80px;
  padding: 0 10px;
}

.logo {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}

/* 导航 logo 头像容器：让兔耳朵相对定位 */
.logo-avatar {
  position: relative;
  flex-shrink: 0;
}

.logo-img {
  position: relative;
  z-index: 1;
  width: 36px;
  height: 36px;
  border-radius: 50px;
  object-fit: cover;
  flex-shrink: 0;
}

/* 兔耳朵挂件：适配 36px 小 logo，金色描边 + 粉色内耳 */
.bunny-ear {
  position: absolute;
  top: -8px;
  z-index: 0;
  width: 12px;
  height: 22px;
  background: #fff;
  border: 1.5px solid #f0b429;
  border-radius: 50%;
  pointer-events: none;
}

.bunny-ear::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #ffb7c5;
}

.ear-left {
  left: 3px;
  transform: rotate(-18deg);
}

.ear-right {
  right: 3px;
  transform: rotate(18deg);
}

/* 搜索区：固定居中列，下方带热门词；视觉上右移 50px，不影响栅格布局 */
.search-wrap {
  width: 100%;
  position: relative;
  left: 50px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search {
  display: flex;
  gap: 8px;
  width: 100%;
}

.hot-words {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.hot-word {
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.hot-word:hover {
  color: var(--color-primary);
}

/* 头像：工具条内小尺寸圆形头像，点开是账户菜单 */
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  display: block;
}

.main {
  flex: 1;
}

.footer {
  background: #fff;
  border-top: 1px solid var(--border-color);
  padding: 20px 0;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

.filing {
  margin-top: 6px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filing a:hover {
  color: var(--color-primary);
}

.filing .divider {
  color: var(--border-color);
}

@media (max-width: 640px) {
  /* 窄屏只保留购物车和头像，其余文字入口收起 */
  .topbar-extra {
    display: none;
  }

  .header-inner {
    display: flex;
    flex-wrap: wrap;
    height: auto;
    gap: 10px;
    padding: 8px 10px;
  }

  .search-wrap {
    order: 3;
    flex-basis: 100%;
    /* 窄屏恢复居中，不做右移 */
    position: static;
  }
}
</style>
