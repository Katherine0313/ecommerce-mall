<script setup>
/**
 * 移动端底部 Tab 导航（≤768px 显示）。
 * 动机：顶部工具条在窄屏隐藏了「我的订单/收藏/优惠券/会员」5 个入口，
 * 底部 Tab 是电商移动端标准做法，拇指可达性最好。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart.js'
import { getCartCount } from '@/api/cart.js'
import { getToken } from '@/utils/token.js'
import { HomeFilled, ShoppingCart, User, Grid } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const TABS = [
  { name: 'home', path: '/', label: '首页', icon: HomeFilled },
  { name: 'products', path: '/products-list', label: '分类', icon: Grid },
  { name: 'cart', path: '/cart', label: '购物车', icon: ShoppingCart, badge: true },
  { name: 'user', path: '/user', label: '我的', icon: User },
]

// 当前高亮：详情/分类等子路由要归属到父级 tab
const activeName = computed(() => {
  if (route.path.startsWith('/product/') || route.path.startsWith('/category/')) return 'products'
  if (route.path.startsWith('/user')) return 'user'
  return route.name
})

// 角标件数：直接问后端总数（购物车页才 load 全量，这里只要个数）
const count = ref(0)
const cartCount = computed(() => count.value || 0)

async function refreshCount() {
  // 未登录时后端会返回 401，不发请求
  if (!getToken()) {
    count.value = 0
    return
  }
  try {
    count.value = (await getCartCount()) || 0
  } catch {
    count.value = 0
  }
}

// 路由变化后刷新件数：加购/下单/删行后角标要跟着变
watch(() => route.fullPath, refreshCount, { immediate: true })

function go(tab) {
  if (route.path === tab.path) return
  router.push(tab.path)
}
</script>

<template>
  <nav class="mobile-tabbar">
    <button
      v-for="tab in TABS"
      :key="tab.name"
      type="button"
      class="tab-item"
      :class="{ active: activeName === tab.name }"
      @click="go(tab)"
    >
      <span class="tab-icon">
        <el-icon><component :is="tab.icon" /></el-icon>
        <span v-if="tab.badge && cartCount > 0" class="tab-badge">{{ cartCount > 99 ? '99+' : cartCount }}</span>
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--browser-ui-bottom, 0px);
  z-index: var(--z-header);
  display: none;
  height: calc(var(--tabbar-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: #fff;
  border-top: 1px solid var(--border-light);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: none;
  padding: 0;
  color: var(--text-secondary);
  cursor: pointer;
}

.tab-item.active {
  color: var(--color-primary);
}

.tab-icon {
  position: relative;
  font-size: 20px;
}

.tab-label {
  font-size: 11px;
  line-height: 1;
}

/* 购物车角标 */
.tab-badge {
  position: absolute;
  top: -6px;
  left: 10px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}

@media (max-width: 768px) {
  .mobile-tabbar {
    display: flex;
  }
}
</style>
