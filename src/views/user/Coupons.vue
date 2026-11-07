<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyCoupons } from '@/api/coupon.js'

const loading = ref(true)
const coupons = ref([])
const activeTab = ref('AVAILABLE')

// 状态 tab：可用 / 已使用 / 已过期
const TABS = [
  { label: '可使用', value: 'AVAILABLE' },
  { label: '已使用', value: 'USED' },
  { label: '已过期', value: 'EXPIRED' },
]

const filtered = computed(() => {
  if (!activeTab.value) return coupons.value
  return coupons.value.filter((c) => c.status === activeTab.value)
})

function load() {
  loading.value = true
  // 一次拿全量，tab 在前端过滤
  getMyCoupons()
    .then((list) => {
      coupons.value = list || []
    })
    .catch((e) => {
      ElMessage.error(e?.message || '优惠券加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

// 券面额文案：满减券显示「满 x 减 y」，折扣券显示「打 x 折」
function faceText(coupon) {
  if (coupon.type === 'DISCOUNT' || coupon.discountRate) {
    const rate = Number(coupon.discountRate)
    // discountRate 可能是 0.9（九折）也可能存成 90
    const percent = rate > 1 ? rate / 10 : rate * 10
    return `${percent.toFixed(1)} 折`
  }
  const face = Number(coupon.faceValue || 0)
  const threshold = Number(coupon.thresholdAmount || 0)
  if (threshold > 0) return `满 ${threshold} 减 ${face}`
  return `减 ${face}`
}

// 过期时间文案
function expireText(coupon) {
  if (!coupon.endTime) return ''
  return `有效期至 ${coupon.endTime}`
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="card page">
    <h2 class="section-title">我的优惠券</h2>

    <el-tabs v-model="activeTab" class="coupon-tabs">
      <el-tab-pane v-for="tab in TABS" :key="tab.value" :label="tab.label" :name="tab.value" />
    </el-tabs>

    <el-empty v-if="!loading && !filtered.length" description="暂无优惠券" />

    <div class="coupon-list">
      <div v-for="coupon in filtered" :key="coupon.userCouponId" class="coupon-item">
        <!-- 左侧面额 -->
        <div class="coupon-left">
          <p class="coupon-face">{{ faceText(coupon) }}</p>
          <p class="coupon-scope">{{ coupon.scopeType === 'ALL' ? '全场通用' : '指定商品' }}</p>
        </div>

        <!-- 右侧信息 -->
        <div class="coupon-right">
          <p class="coupon-name">{{ coupon.name }}</p>
          <p class="coupon-time">{{ expireText(coupon) }}</p>
          <p class="coupon-status">
            <el-tag size="small" :type="coupon.status === 'AVAILABLE' ? 'success' : 'info'">
              {{ coupon.statusDesc || coupon.status }}
            </el-tag>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
}

.coupon-tabs {
  margin-bottom: var(--space-md);
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.coupon-item {
  display: flex;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* ===== 左侧面额 ===== */
.coupon-left {
  width: 130px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background: var(--color-primary-bg);
}

.coupon-face {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.coupon-scope {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 右侧信息 ===== */
.coupon-right {
  flex: 1;
  min-width: 0;
  padding: var(--space-md);
}

.coupon-name {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.coupon-time {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.coupon-status {
  margin: 0;
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  /* 券卡：左侧面额缩窄，面额字号减小 */
  .coupon-left {
    width: 104px;
    padding: var(--space-sm);
  }

  .coupon-face {
    font-size: 17px;
  }

  .coupon-right {
    padding: var(--space-sm);
  }
}
</style>
