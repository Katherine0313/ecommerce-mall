<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user.js'
import { useCartStore } from '@/stores/cart.js'
import { getArticleByTitle } from '@/api/article.js'
import { getProfile } from '@/api/user.js'
import {
  HomeFilled,
  List,
  Star,
  Ticket,
  Medal,
  ShoppingCart,
  User,
  EditPen,
  Fold,
  Grid,
} from '@element-plus/icons-vue'
import MobileTabBar from '@/components/MobileTabBar.vue'

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

// 登录后头像：从后端拉用户资料，没设置过头像时回退到站点 logo
const avatarUrl = ref(logoUrl)

function loadAvatar() {
  if (!userStore.isLoggedIn) {
    avatarUrl.value = logoUrl
    return
  }
  getProfile()
    .then((profile) => {
      avatarUrl.value = profile?.avatar || logoUrl
    })
    .catch(() => {
      // 拉取失败不影响头部，用默认头像
      avatarUrl.value = logoUrl
    })
}

// 登录/登出时重新拉取；首屏已登录也立即拉
watch(() => userStore.isLoggedIn, loadAvatar, { immediate: true })

// 窄屏底部 Tab：只有详情页不显示（它自己有一个底部固定购买栏，两个叠一起会打架）
const showTabBar = computed(() => !route.meta.hideTabBar)

// 窄屏汉堡菜单：顶部工具条隐藏了 5 个入口，这里用抽屉补回
const menuVisible = ref(false)
const MENU_LINKS = [
  { label: '首页', path: '/', icon: HomeFilled },
  { label: '全部商品', path: '/products-list', icon: Grid },
  { label: '购物车', path: '/cart', icon: ShoppingCart },
  { label: '我的订单', path: '/user/orders', icon: List },
  { label: '我的收藏', path: '/user/favorites', icon: Star },
  { label: '我的优惠券', path: '/user/coupons', icon: Ticket },
  { label: '会员中心', path: '/user/member', icon: Medal },
]

function goMenu(path) {
  menuVisible.value = false
  if (route.path !== path) router.push(path)
}

function onCart() {
  router.push('/cart')
}

// 页脚的「关于我们 / 隐私政策」：内容存在后台文章表里，按标题取文章详情
function openArticle(title) {
  getArticleByTitle(title)
    .then((article) => {
      if (article?.id) router.push(`/article/${article.id}`)
      else ElMessage.warning('该内容暂未配置')
    })
    .catch(() => {
      ElMessage.warning('该内容暂未配置')
    })
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
  <!-- 窄屏底部有固定 Tab（详情页是固定购买栏），用 layout--pad-bottom 给整页留出空间，
       否则最下方的 footer 会被固定条盖住 -->
  <div
    class="layout"
    :class="{
      'layout--pad-bottom': showTabBar,
      'layout--pad-buybar': route.meta.fixedBottomBar,
    }"
  >
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
          <!-- 窄屏汉堡菜单：补回被 topbar-extra 隐藏的 5 个入口 -->
          <button
            type="button"
            class="topbar-link menu-toggle"
            aria-label="打开菜单"
            @click="menuVisible = true"
          >
            <el-icon><Fold /></el-icon>
          </button>
          <!-- 登录后头像在右侧（点开是账户下拉菜单） -->
          <el-dropdown v-if="userStore.isLoggedIn" trigger="click" @command="onCommand">
            <el-image
              class="avatar"
              :src="avatarUrl"
              fit="cover"
              alt="我的头像"
              :preview-src-list="[]"
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

    <!-- 窄屏汉堡菜单抽屉 -->
    <el-drawer
      v-model="menuVisible"
      class="menu-drawer-el"
      direction="ltr"
      size="70%"
      :with-header="false"
    >
      <div class="menu-drawer">
        <div class="menu-drawer-title">全部功能</div>
        <button
          v-for="item in MENU_LINKS"
          :key="item.path"
          type="button"
          class="menu-drawer-item"
          @click="goMenu(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
        <button
          v-if="!userStore.isLoggedIn"
          type="button"
          class="menu-drawer-item"
          @click="goMenu('/login')"
        >
          <el-icon><User /></el-icon>
          <span>登录 / 注册</span>
        </button>
      </div>
    </el-drawer>

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

    <!-- 移动端底部 Tab 导航（≤768px 显示；详情页自己有底部购买栏，不叠） -->
    <MobileTabBar v-if="showTabBar" />

    <!-- 全局购物车已改为独立页面（/cart），这里不再挂弹窗 -->

    <footer class="footer">
      <div class="container">
        <p>© 2026 杰米多多电子商务工作室 版权所有</p>
        <!-- 站点说明：内容由后台文章维护，没有配置时提示暂未配置 -->
        <p class="links">
          <a @click.prevent="openArticle('关于我们')">关于我们</a>
          <span class="divider">|</span>
          <a @click.prevent="openArticle('隐私政策')">隐私政策</a>
        </p>
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
  min-height: 100vh;
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

/* 站点说明入口：关于我们 / 隐私政策 */
.links {
  margin: 6px 0 0;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.links a {
  color: var(--text-secondary);
  cursor: pointer;
}

.links a:hover {
  color: var(--color-primary);
}

.filing a:hover {
  color: var(--color-primary);
}

.filing .divider {
  color: var(--border-color);
}

/* 汉堡按钮：PC 隐藏，只有窄屏用 */
.menu-toggle {
  display: none;
  font-size: 16px;
}

/* 抽屉内容 */
.menu-drawer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-drawer-title {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 8px 12px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 8px;
}

.menu-drawer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 0 8px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.menu-drawer-item:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  /* 窄屏只保留购物车和头像，其余文字入口收起（改由汉堡菜单 + 底部 Tab 提供） */

  /* 头部压缩：logo 与搜索框同行一行，热门词隐藏。
     原来 logo 行 + 搜索行 + 热门词行叠起来占 129px，占了视口 20%。 */
  .header-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    height: auto;
    gap: 8px;
    padding: 8px 10px;
  }

  .logo {
    font-size: 17px;
    gap: 6px;
  }

  .logo-img {
    width: 28px;
    height: 28px;
  }

  /* 兔耳朵挂件跟着 logo 缩小 */
  .bunny-ear {
    width: 10px;
    height: 18px;
    top: -6px;
  }

  .ear-left {
    left: 2px;
  }

  .ear-right {
    right: 2px;
  }

  .search-wrap {
    order: 0;
    flex: 1;
    min-width: 0;
    /* 窄屏恢复居中，不做右移 */
    position: static;
  }

  /* 热门搜索词在窄屏占一行高度且作用有限，隐藏 */
  .hot-words {
    display: none;
  }

  .topbar-extra{
    display: none;
  }

  /* 汉堡按钮窄屏显示 */
  .menu-toggle {
    display: inline-flex;
  }

  /* 底部有固定条（Tab 导航 / 详情页购买栏），整页留出空间。
     注意必须留给 .layout 而不是 .main —— footer 在 main 之外，
     只给 main 加 padding 的话 footer 会被固定条盖住（备案链接点不到）。 */
  .layout--pad-bottom {
    padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom));
  }

  /* 详情页：底部是固定购买栏（比 Tab 高 5px），按购买栏实际高度留白 */
  .layout--pad-buybar {
    padding-bottom: calc(var(--buybar-height) + var(--safe-bottom));
  }

  /* 顶部工具条与头部避让刘海屏 */
  .topbar-inner,
  .header-inner {
    padding-left: calc(10px + var(--safe-left));
    padding-right: calc(10px + var(--safe-right));
  }

  /* 顶部避让状态栏 / 刘海屏 */
  .topbar {
    padding-top: var(--safe-top);
  }

  /* 头部是 sticky 定位，避让要加在自身内边距上 */
  .header {
    padding-top: var(--safe-top);
  }

  /* 顶部工具条压缩高度，给小屏腾空间 */
  .topbar-inner {
    height: 38px;
  }
}
</style>
