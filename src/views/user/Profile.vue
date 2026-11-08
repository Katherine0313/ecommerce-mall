<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Medal, Location, Star, Ticket, User, Setting, RefreshLeft, Box, Service } from '@element-plus/icons-vue'
import { getMemberProfile, getProfile } from '@/api/user.js'
import { getOrderCounts } from '@/api/order.js'
import { getAfterSaleCounts } from '@/api/aftersale.js'
import { getMyCoupons } from '@/api/coupon.js'
import { getFavorites } from '@/api/favorite.js'
import { getAddressList } from '@/api/address.js'
import { getHome } from '@/api/home.js'
import ProductCard from '@/components/ProductCard.vue'
import { ORDER_STATUS, statusMeta } from '@/constants/order.js'

const router = useRouter()

const loading = ref(true)
const member = ref(null)
const profile = ref(null)
const counts = ref({})
const afterSaleCounts = ref({})
const assets = ref({ coupons: 0, favorites: 0, addresses: 0 })
const products = ref([])

// 订单入口：与订单列表 Tab 对齐；「待评价」复用 finished 列表（后端暂不支持 reviewed 过滤）
const ORDER_ENTRIES = [
  { key: 'pendingPay', label: '待付款', status: ORDER_STATUS.PENDING_PAY, icon: statusMeta(ORDER_STATUS.PENDING_PAY).icon },
  { key: 'pendingShip', label: '待发货', status: ORDER_STATUS.PENDING_SHIP, icon: statusMeta(ORDER_STATUS.PENDING_SHIP).icon },
  { key: 'pendingReceive', label: '待收货', status: ORDER_STATUS.SHIPPED, icon: statusMeta(ORDER_STATUS.SHIPPED).icon },
  { key: 'pendingReview', label: '待评价', status: ORDER_STATUS.FINISHED, icon: statusMeta(ORDER_STATUS.FINISHED).icon },
]

const FUNCTIONS = [
  { label: 'AI 客服', icon: Service, path: '/ai-chat' },
  { label: '收货地址', icon: Location, path: '/user/addresses' },
  { label: '我的收藏', icon: Star, path: '/user/favorites' },
  { label: '优惠券', icon: Ticket, path: '/user/coupons' },
  { label: '会员中心', icon: Medal, path: '/user/member' },
  { label: '个人资料', icon: Setting, path: '/user/personal-info' },
  { label: '全部订单', icon: Box, path: '/user/orders' },
]

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const memberName = computed(() => member.value?.name || profile.value?.name || '未设置昵称')
// 售后待处理数：审核中 + 退货/退款/换货中
const afterSalePending = computed(
  () =>
    Number(afterSaleCounts.value?.reviewing || 0) +
    Number(afterSaleCounts.value?.returning || 0) +
    Number(afterSaleCounts.value?.refunding || 0) +
    Number(afterSaleCounts.value?.exchanging || 0)
)
const phoneText = computed(() => {
  const phone = profile.value?.phone || member.value?.phone
  if (!phone) return '未绑定手机号'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
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

function goOrders(status) {
  router.push({ path: '/user/orders', query: status ? { status } : {} })
}

function load() {
  loading.value = true
  // 各卡片互不阻塞：单个接口失败只让对应数字为空
  Promise.allSettled([
    getMemberProfile(),
    getProfile(),
    getOrderCounts(),
    getAfterSaleCounts(),
    getMyCoupons('AVAILABLE'),
    getFavorites(),
    getAddressList(),
    getHome(4),
  ]).then(([memberRes, profileRes, countRes, afterSaleRes, couponRes, favRes, addrRes, homeRes]) => {
    if (memberRes.status === 'fulfilled') member.value = memberRes.value
    if (profileRes.status === 'fulfilled') profile.value = profileRes.value
    if (countRes.status === 'fulfilled') counts.value = countRes.value || {}
    if (afterSaleRes.status === 'fulfilled') afterSaleCounts.value = afterSaleRes.value || {}
    assets.value = {
      coupons: couponRes.status === 'fulfilled' ? (couponRes.value || []).length : 0,
      favorites: favRes.status === 'fulfilled' ? (favRes.value || []).length : 0,
      addresses: addrRes.status === 'fulfilled' ? (addrRes.value || []).length : 0,
    }
    if (homeRes.status === 'fulfilled') {
      products.value = (homeRes.value?.recommend || []).slice(0, 4)
    }
    loading.value = false
  })
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="profile">
    <!-- ===== 身份卡 ===== -->
    <section class="identity">
      <div class="identity-main">
        <el-avatar :size="64" :src="member?.avatar || profile?.avatar" class="avatar">
          {{ memberName.slice(0, 1) }}
        </el-avatar>
        <div class="identity-info">
          <p class="greeting">{{ greeting }}，{{ memberName }}</p>
          <div class="identity-meta">
            <el-tag size="small" effect="plain" class="level-tag">
              <el-icon><Medal /></el-icon>
              {{ member?.levelName || '普通会员' }}
            </el-tag>
            <span class="phone">{{ phoneText }}</span>
          </div>
        </div>
        <el-button class="identity-edit" text @click="router.push('/user/personal-info')">
          编辑资料
        </el-button>
      </div>

      <div class="identity-stats">
        <button type="button" class="stat" @click="router.push('/user/member')">
          <p class="stat-value">{{ member?.growthValue ?? 0 }}</p>
          <p class="stat-label">成长值</p>
        </button>
        <button type="button" class="stat" @click="goOrders()">
          <p class="stat-value">{{ member?.paidOrderCount ?? 0 }}</p>
          <p class="stat-label">已支付订单</p>
        </button>
        <button type="button" class="stat" @click="goOrders()">
          <p class="stat-value">¥{{ member?.totalPaidAmount ?? '0.00' }}</p>
          <p class="stat-label">累计实付</p>
        </button>
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

    <!-- ===== 订单入口 ===== -->
    <section class="card block">
      <div class="block-head">
        <h2 class="section-title">我的订单</h2>
        <el-link type="primary" :underline="false" @click="goOrders()">查看全部订单</el-link>
      </div>
      <div class="order-rail">
        <button
          v-for="entry in ORDER_ENTRIES"
          :key="entry.key"
          type="button"
          class="order-entry"
          @click="goOrders(entry.status)"
        >
          <el-badge :value="counts[entry.key] || 0" :hidden="!counts[entry.key]" class="entry-badge">
            <span class="entry-icon" :style="{ color: statusMeta(entry.status).color, background: statusMeta(entry.status).bg }">
              <el-icon><component :is="entry.icon" /></el-icon>
            </span>
          </el-badge>
          <span class="entry-label">{{ entry.label }}</span>
        </button>

        <button type="button" class="order-entry" @click="router.push('/user/aftersales')">
          <el-badge
            :value="afterSalePending"
            :hidden="!afterSalePending"
            class="entry-badge"
          >
            <span class="entry-icon aftersale-icon">
              <el-icon><RefreshLeft /></el-icon>
            </span>
          </el-badge>
          <span class="entry-label">退款/售后</span>
        </button>
      </div>
    </section>

    <!-- ===== 我的资产 ===== -->
    <section class="card block">
      <h2 class="section-title">我的资产</h2>
      <div class="assets">
        <button type="button" class="asset" @click="router.push('/user/coupons')">
          <p class="asset-value">{{ assets.coupons }}</p>
          <p class="asset-label">可用优惠券</p>
        </button>
        <button type="button" class="asset" @click="router.push('/user/favorites')">
          <p class="asset-value">{{ assets.favorites }}</p>
          <p class="asset-label">收藏商品</p>
        </button>
        <button type="button" class="asset" @click="router.push('/user/addresses')">
          <p class="asset-value">{{ assets.addresses }}</p>
          <p class="asset-label">收货地址</p>
        </button>
      </div>
    </section>

    <!-- ===== 猜你喜欢 ===== -->
    <section v-if="products.length" class="card block">
      <div class="block-head">
        <h2 class="section-title">猜你喜欢</h2>
        <el-link type="primary" :underline="false" @click="router.push('/products-list')">
          更多好物
        </el-link>
      </div>
      <div class="recommend-grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
    </section>

    <!-- ===== 常用功能 ===== -->
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
          <span class="function-icon"><el-icon><component :is="fn.icon" /></el-icon></span>
          <span>{{ fn.label }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ===== 身份卡 ===== */
.identity {
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--color-primary-bg) 100%);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.identity-main {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.avatar {
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(31, 35, 41, 0.12);
  font-size: 22px;
  color: #fff;
  background: var(--color-primary);
}

.identity-info {
  min-width: 0;
}

.greeting {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.identity-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  font-size: 13px;
}

.level-tag {
  color: var(--color-primary);
  background: #fff;
}

.phone {
  color: var(--text-secondary);
}

.identity-edit {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.identity-stats {
  display: flex;
  gap: var(--space-xl);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--border-light);
}

.stat {
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.stat-value {
  margin: 0 0 4px;
  font-family: var(--font-num);
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat:hover .stat-value {
  color: var(--color-primary);
}

/* 成长值进度条 */
.growth {
  margin-top: var(--space-md);
}

.growth-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
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

.block-head .section-title {
  margin-bottom: 0;
}

/* ===== 订单入口 ===== */
.order-rail {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.order-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  padding: var(--space-sm) 0;
  border-radius: var(--radius-md);
  transition: background-color 0.15s;
}

.order-entry:hover {
  background: var(--bg-hover);
}

.entry-badge {
  line-height: 1;
}

.entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 20px;
}

.aftersale-icon {
  color: var(--status-aftersale);
  background: var(--status-aftersale-bg);
}

.entry-label {
  font-size: 13px;
  color: var(--text-regular);
}

/* ===== 资产 ===== */
.assets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.asset {
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-soft);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.asset:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.asset-value {
  margin: 0 0 4px;
  font-family: var(--font-num);
  font-size: 24px;
  font-weight: 600;
  color: var(--color-primary);
}

.asset-label {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 猜你喜欢 ===== */
.recommend-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-top: var(--space-md);
}

/* ===== 常用功能 ===== */
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
  transition: background-color 0.15s, color 0.15s;
}

.function-item:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
}

.function-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-soft);
  font-size: 20px;
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .recommend-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .function-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ===== 窄屏（≤768px） ===== */
@media (max-width: 768px) {
  .identity {
    padding: var(--space-md);
  }

  .identity-edit {
    display: none;
  }

  .greeting {
    font-size: 16px;
  }

  .identity-stats {
    gap: var(--space-md);
    justify-content: space-between;
  }

  .stat-value {
    font-size: 18px;
  }

  .block {
    padding: var(--space-md) var(--space-sm);
  }

  .order-rail {
    grid-template-columns: repeat(5, 1fr);
    gap: 0;
  }

  .entry-icon {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }

  .entry-label {
    font-size: 12px;
  }

  .assets {
    gap: var(--space-sm);
  }

  .asset {
    padding: var(--space-sm);
  }

  .asset-value {
    font-size: 20px;
  }

  .recommend-grid {
    gap: var(--space-sm);
  }

  .function-grid {
    gap: var(--space-sm);
  }

  .function-item {
    padding: var(--space-sm) 0;
  }

  .function-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
    background: var(--bg-hover);
  }
}
</style>
