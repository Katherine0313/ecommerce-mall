<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import Cart from '@/views/products/Cart.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')
// 购物车弹窗：头部入口 + 详情页加入购物车后也可以复用
const cartRef = ref(null)

function onCart() {
  cartRef.value?.open()
}

// 登录页还没做，先提示；后续换成 router.push('/login')
function onLogin() {
  ElMessage.info('登录功能将在 P2 阶段接入')
}

// 从搜索页返回时同步输入框内容
watch(
  () => route.query.keyword,
  (value) => {
    if (route.name === 'search') keyword.value = value || ''
  },
  { immediate: true }
)

function onSearch() {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { keyword: q } : {} })
}
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="container header-inner">
        <router-link to="/" class="logo">杰米商城</router-link>

        <form class="search" @submit.prevent="onSearch">
          <el-input v-model="keyword" placeholder="搜索商品" clearable />
          <el-button type="primary" native-type="submit">搜索</el-button>
        </form>

        <nav class="nav">
          <button type="button" class="cart-link" @click="onCart">购物车</button>

          <!-- 未登录显示「登录」，登录后统一显示这张头像 -->
          <el-button v-if="!userStore.isLoggedIn" link class="login-link" @click="onLogin">
            登录
          </el-button>
          <el-image
            v-else
            class="avatar"
            src="/image/zongjie.webp"
            fit="cover"
            alt="我的头像"
          />
        </nav>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <!-- 全局购物车弹窗 -->
    <Cart ref="cartRef" />

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
  min-height: 100vh;
}

.header {
  border-bottom: 1px solid var(--mall-border);
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 64px;
  padding:0 10px;
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--mall-primary);
  white-space: nowrap;
}

.search {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 520px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
  font-size: 15px;
}

.login-link {
  font-size: 15px;
  color: var(--color-primary);
}

/* 购物车入口：与导航文字一致的按钮样式 */
.cart-link {
  border: none;
  background: none;
  padding: 0;
  font-size: 15px;
  cursor: pointer;
}

.cart-link:hover {
  color: var(--color-primary);
}

/* 头像：点击交互（退出登录 / 编辑资料）后续再加 */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--mall-primary);
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
  .header-inner {
    flex-wrap: wrap;
    height: auto;
    gap: 10px;
  }

  .search {
    order: 3;
    flex-basis: 100%;
  }

  .nav {
    margin-left: auto;
  }
}
</style>
