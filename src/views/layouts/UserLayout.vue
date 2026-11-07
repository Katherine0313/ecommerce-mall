<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  List,
  RefreshLeft,
  Ticket,
  Star,
  Location,
  Medal,
  User,
  Setting,
  HomeFilled,
} from '@element-plus/icons-vue'
import { getOrderCounts } from '@/api/order.js'
import { getAfterSaleCounts } from '@/api/aftersale.js'

const route = useRoute()
const router = useRouter()

// 左侧菜单：按「交易 / 资产 / 账户」分组，和京东个人中心一致
const MENU_GROUPS = [
  {
    title: '交易',
    items: [
      { name: 'user-orders', label: '我的订单', icon: List },
      { name: 'user-aftersales', label: '退款/售后', icon: RefreshLeft },
      { name: 'user-coupons', label: '我的优惠券', icon: Ticket },
    ],
  },
  {
    title: '资产',
    items: [
      { name: 'user-favorites', label: '我的收藏', icon: Star },
      { name: 'user-addresses', label: '收货地址', icon: Location },
    ],
  },
  {
    title: '账户',
    items: [
      { name: 'user-member', label: '会员中心', icon: Medal },
      { name: 'user-personal-info', label: '个人资料', icon: Setting },
      { name: 'user', label: '个人中心', icon: User },
      { name: 'home', label: '返回商城', icon: HomeFilled },
    ],
  },
]

// 待处理角标：订单（待付款 + 待发货 + 待收货）、售后（审核中 + 退货/退款/换货中）
const orderBadge = ref(0)
const afterSaleBadge = ref(0)

const BADGE_FIELDS = {
  'user-orders': () => orderBadge.value,
  'user-aftersales': () => afterSaleBadge.value,
}

function isActive(name) {
  // 订单详情 / 售后详情等子页面仍高亮所属入口
  if (route.name === 'user-order-detail') return name === 'user-orders'
  if (route.name === 'aftersale-detail' || route.name === 'aftersale-apply') {
    return name === 'user-aftersales'
  }
  return route.name === name
}

function onMenuClick(name) {
  if (route.name === name) return
  router.push({ name })
}

onMounted(() => {
  getOrderCounts()
    .then((data) => {
      orderBadge.value =
        Number(data?.pendingPay || 0) +
        Number(data?.pendingShip || 0) +
        Number(data?.pendingReceive || 0)
    })
    .catch(() => {
      // 角标失败不影响菜单
    })
  getAfterSaleCounts()
    .then((data) => {
      afterSaleBadge.value = ['reviewing', 'returning', 'refunding', 'exchanging'].reduce(
        (sum, key) => sum + Number(data?.[key] || 0),
        0
      )
    })
    .catch(() => {})
})
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
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
            <span v-if="BADGE_FIELDS[item.name]?.()" class="menu-badge">
              {{ BADGE_FIELDS[item.name]() }}
            </span>
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
  width: var(--user-side-width);
  flex-shrink: 0;
  background: var(--bg-card);
  border-radius: var(--radius-card);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
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
  letter-spacing: 0.5px;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
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

.menu-icon {
  font-size: 16px;
  color: var(--text-secondary);
  transition: color 0.15s;
}

.menu-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--status-pay);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.menu-item:hover {
  color: var(--color-primary);
  background: var(--bg-hover);
}

.menu-item:hover .menu-icon {
  color: var(--color-primary);
}

.menu-item.active {
  color: var(--color-primary);
  background: var(--color-primary-bg);
  font-weight: 600;
}

.menu-item.active .menu-icon {
  color: var(--color-primary);
}

/* 选中态：左侧 3px 竖条 */
.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 20px;
  margin-top: -10px;
  border-radius: 0 2px 2px 0;
  background: var(--color-primary);
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
    background: var(--bg-hover);
    min-height: 36px;
  }

  .menu-item.active {
    background: var(--color-primary-bg);
  }

  /* 窄屏 chip 不需要竖条 */
  .menu-item.active::before {
    display: none;
  }

  .menu-icon {
    display: none;
  }
}
</style>
