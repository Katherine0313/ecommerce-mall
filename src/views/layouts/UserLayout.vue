<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 左侧菜单：分组标题 + 菜单项
const MENU_GROUPS = [
  {
    title: '交易',
    items: [
      { name: 'user-orders', label: '我的订单', icon: 'List' },
      { name: 'user-coupons', label: '我的优惠券', icon: 'Ticket' },
    ],
  },
  {
    title: '我的',
    items: [
      { name: 'user', label: '个人中心', icon: 'User' },
      { name: 'user-member', label: '会员中心', icon: 'Medal' },
      { name: 'user-addresses', label: '收货地址', icon: 'Location' },
      { name: 'user-favorites', label: '我的收藏', icon: 'Star' },
    ],
  },
]

// 当前激活的菜单项
function isActive(name) {
  return route.name === name
}

function onMenuClick(name) {
  if (route.name === name) return
  router.push({ name })
}
</script>

<template>
  <div class="container user-layout">
    <!-- 左侧菜单 -->
    <aside class="side">
      <nav class="menu">
        <div v-for="group in MENU_GROUPS" :key="group.title" class="menu-group">
          <p class="group-title">{{ group.title }}</p>
          <button
            v-for="item in group.items"
            :key="item.name"
            type="button"
            class="menu-item"
            :class="{ active: isActive(item.name) }"
            @click="onMenuClick(item.name)"
          >
            {{ item.label }}
          </button>
        </div>
      </nav>
    </aside>

    <!-- 右侧内容 -->
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.user-layout {
  display: flex;
  gap: var(--space-lg);
  align-items: flex-start;
  padding: var(--space-lg) 0 var(--space-xl);
}

/* ===== 左侧菜单 ===== */
.side {
  width: 180px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-md) 0;
  position: sticky;
  top: calc(var(--header-height) + var(--space-md));
}

.menu-group + .menu-group {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-light);
}

.group-title {
  margin: 0 0 var(--space-sm);
  padding: 0 var(--space-md);
  font-size: 12px;
  color: var(--text-secondary);
}

.menu-item {
  display: block;
  width: 100%;
  padding: 10px var(--space-md);
  border: none;
  background: none;
  text-align: left;
  font-size: 14px;
  color: var(--text-regular);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.menu-item:hover {
  color: var(--color-primary);
  background: var(--bg-hover);
}

.menu-item.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
  font-weight: 600;
}

/* ===== 右侧内容 ===== */
.content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .user-layout {
    flex-direction: column;
  }

  .side {
    width: 100%;
    position: static;
  }

  .menu-group + .menu-group {
    border-top: none;
    padding-top: 0;
  }
}

/* ===== 窄屏（≤768px）：左侧菜单改横向滚动 chip 栏 ===== */
@media (max-width: 768px) {
  .user-layout {
    gap: var(--space-md);
    padding: var(--space-md) 0 var(--space-lg);
  }

  .side {
    padding: var(--space-sm) 0;
    border-radius: var(--radius-md);
  }

  .menu {
    display: flex;
    gap: var(--space-sm);
    padding: 0 var(--space-sm);
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .menu::-webkit-scrollbar {
    display: none;
  }

  .menu-group {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex: 0 0 auto;
  }

  .menu-group + .menu-group {
    margin-top: 0;
    padding-top: 0;
    padding-left: var(--space-sm);
    border-left: 1px solid var(--border-light);
  }

  .group-title {
    margin: 0;
    padding: 0;
    flex-shrink: 0;
  }

  .menu-item {
    width: auto;
    padding: 8px 12px;
    border-radius: 999px;
    white-space: nowrap;
    text-align: center;
    background: var(--bg-hover);
    min-height: 36px;
  }

  .menu-item.active {
    background: var(--color-primary-bg);
  }
}
</style>
