<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Medal, Box, Location, Star, Ticket, User, List } from '@element-plus/icons-vue'
import { getMemberProfile } from '@/api/user.js'
import { getOrderList as fetchOrderList } from '@/api/order.js'

const router = useRouter()

const loading = ref(true)
const member = ref(null)
const orders = ref([])

// 订单状态码（与后端 OrderStatusEnum 一致；2 待确认收款已退役并入 3）
const STATUS = {
  PENDING_PAY: 1,
  PENDING_SHIP: 3,
  SHIPPED: 4,
  FINISHED: 5,
  CANCEL: 6,
}

// 订单状态入口：待付款 / 待发货 / 待收货 / 待评价 / 退款售后
const ORDER_ENTRIES = [
  { key: 'pendingPay', label: '待付款', status: STATUS.PENDING_PAY },
  { key: 'pendingShip', label: '待发货', status: STATUS.PENDING_SHIP },
  { key: 'shipped', label: '待收货', status: STATUS.SHIPPED },
  { key: 'finished', label: '待评价', status: STATUS.FINISHED },
]

// 功能宫格
const FUNCTIONS = [
  { label: '收货地址', icon: Location, path: '/user/addresses' },
  { label: '我的收藏', icon: Star, path: '/user/favorites' },
  { label: '优惠券', icon: Ticket, path: '/user/coupons' },
  { label: '会员中心', icon: Medal, path: '/user/member' },
  { label: '个人资料', icon: User, path: '/user/personal-info' },
  { label: '全部订单', icon: List, path: '/user/orders' },
]

// 各状态待处理数量
const counts = computed(() => {
  const map = {}
  ORDER_ENTRIES.forEach((e) => {
    map[e.key] = orders.value.filter((o) => o.orderStatus === e.status).length
  })
  return map
})

// 成长值进度（已满级时按 100% 算）
const growthPercent = computed(() => {
  const m = member.value
  if (!m) return 0
  if (!m.nextLevelId) return 100
  const current = m.currentThreshold || 0
  const next = m.nextLevelThreshold || current
  if (next <= current) return 100
  const percent = Math.round(((m.growthValue - current) / (next - current)) * 100)
  return Math.min(100, Math.max(0, percent))
})

function load() {
  loading.value = true
  Promise.all([getMemberProfile(), fetchOrderList().catch(() => [])])
    .then(([memberData, orderList]) => {
      member.value = memberData
      orders.value = orderList || []
    })
    .catch((e) => {
      ElMessage.error(e?.message || '加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function goOrders(status) {
  router.push({ path: '/user/orders', query: status ? { status } : {} })
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <!-- ===== 用户名片 ===== -->
    <section class="user-card">
      <div class="user-left">
        <el-avatar :size="64" :src="member?.avatar" />
        <div class="user-info">
          <p class="user-name">{{ member?.name || '未设置昵称' }}</p>
          <p class="user-level">
            <el-icon><Medal /></el-icon>
            {{ member?.levelName || '普通会员' }}
          </p>
        </div>
      </div>

      <div class="user-right">
        <div class="stat">
          <p class="stat-value">{{ member?.growthValue ?? 0 }}</p>
          <p class="stat-label">成长值</p>
        </div>
        <div class="stat">
          <p class="stat-value">{{ member?.paidOrderCount ?? 0 }}</p>
          <p class="stat-label">已支付订单</p>
        </div>
        <div class="stat">
          <p class="stat-value">¥{{ member?.totalPaidAmount ?? '0.00' }}</p>
          <p class="stat-label">累计实付</p>
        </div>
      </div>

      <!-- 成长值进度 -->
      <div class="growth">
        <el-progress
          :percentage="growthPercent"
          :stroke-width="6"
          :show-text="false"
          color="var(--color-primary)"
        />
        <p class="growth-tip">
          <template v-if="member?.nextLevelId">
            距离「{{ member.nextLevelName }}」还差 {{ member.growthToNext ?? 0 }} 成长值
          </template>
          <template v-else>已是最高等级</template>
        </p>
      </div>
    </section>

    <!-- ===== 订单状态入口 ===== -->
    <section class="card block">
      <div class="block-head">
        <h2 class="section-title">我的订单</h2>
        <el-link type="primary" :underline="false" @click="goOrders()">查看全部</el-link>
      </div>
      <div class="order-entries">
        <button
          v-for="entry in ORDER_ENTRIES"
          :key="entry.key"
          type="button"
          class="order-entry"
          @click="goOrders(entry.status)"
        >
          <span class="order-icon">
            <el-badge :value="counts[entry.key]" :hidden="!counts[entry.key]">
              <el-icon><Box /></el-icon>
            </el-badge>
          </span>
          <span class="order-label">{{ entry.label }}</span>
        </button>
      </div>
    </section>

    <!-- ===== 功能宫格 ===== -->
    <section class="card block">
      <h2 class="section-title">常用功能</h2>
      <div class="function-grid">
        <button
          v-for="fn in FUNCTIONS"
          :key="fn.path"
          type="button"
          class="function-item"
          @click="router.push(fn.path)"
        >
          <el-icon class="function-icon"><component :is="fn.icon" /></el-icon>
          <span>{{ fn.label }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ===== 用户名片 ===== */
.user-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: linear-gradient(90deg,rgba(138, 162, 235, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%);
  border-radius: var(--radius-md);
  color: #fff;
}

.user-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.user-info {
  color: #fff;
}

.user-name {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}

.user-level {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.user-right {
  display: flex;
  gap: var(--space-xl);
  margin-left: auto;
}

.stat {
  text-align: center;
}

.stat-value {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
}

.stat-label {
  margin: 0;
  font-size: 12px;
  opacity: 0.85;
}

/* 成长值进度条 */
.growth {
  width: 100%;
}

.growth :deep(.el-progress-bar__outer) {
  background: rgba(255, 255, 255, 0.3);
}

.growth-tip {
  margin: 8px 0 0;
  font-size: 12px;
  opacity: 0.9;
}

/* ===== 区块 ===== */
.block {
  margin-top: var(--space-md);
  padding: var(--space-lg);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block .section-title {
  margin: 0 0 var(--space-md);
}

/* ===== 订单状态入口 ===== */
.order-entries {
  display: flex;
  justify-content: space-around;
  gap: var(--space-md);
}

.order-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  transition: background-color 0.15s;
}

.order-entry:hover {
  background: var(--bg-hover);
}

.order-icon {
  font-size: 26px;
  color: var(--color-primary);
}

.order-label {
  font-size: 13px;
  color: var(--text-regular);
}

/* ===== 功能宫格 ===== */
.function-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-md);
}

.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--space-md) 0;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-regular);
  cursor: pointer;
  transition: background-color 0.15s;
}

.function-item:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
}

.function-icon {
  font-size: 24px;
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .user-right {
    margin-left: 0;
  }

  .function-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  /* 名片：竖排，头像与统计各占一行 */
  .user-card {
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .user-left {
    gap: var(--space-sm);
  }

  .user-name {
    font-size: 16px;
  }

  /* 统计项三等分铺开 */
  .user-right {
    width: 100%;
    gap: var(--space-sm);
    justify-content: space-around;
  }

  .stat-value {
    font-size: 17px;
  }

  /* 区块内边距收紧 */
  .block {
    padding: var(--space-md) var(--space-sm);
  }

  /* 订单状态入口：4 个改 2×2 网格 */
  .order-entries {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
  }

  .order-entry {
    padding: var(--space-sm) 0;
  }

  .order-icon {
    font-size: 22px;
  }

  /* 功能宫格：6 个改 3×2 网格 */
  .function-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm);
  }

  .function-item {
    padding: var(--space-sm) 0;
    background: var(--bg-hover);
  }

  .function-icon {
    font-size: 20px;
  }
}
</style>
