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

const STATUS_TEXT = {
  AVAILABLE: '可用',
  USED: '已使用',
  EXPIRED: '已过期',
}

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

// 折扣券：discountRate 可能是 0.9（九折）也可能存成 90
function isDiscount(coupon) {
  return coupon.type === 'DISCOUNT' || coupon.discountRate
}

function percentOf(coupon) {
  const rate = Number(coupon.discountRate)
  return rate > 1 ? rate / 10 : rate * 10
}

// 左侧金额区主文案：满减取面额，折扣取折数
function faceValue(coupon) {
  if (isDiscount(coupon)) return percentOf(coupon).toFixed(1)
  return Number(coupon.faceValue || 0)
}

function thresholdText(coupon) {
  const threshold = Number(coupon.thresholdAmount || 0)
  return threshold > 0 ? `满 ${threshold} 元可用` : '无门槛'
}

// 过期时间文案
function expireText(coupon) {
  if (!coupon.endTime) return ''
  return `有效期至 ${coupon.endTime}`
}

function statusText(coupon) {
  return coupon.statusDesc || STATUS_TEXT[coupon.status] || coupon.status
}

function statusClass(coupon) {
  return `is-${String(coupon.status || '').toLowerCase()}`
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
      <article
        v-for="coupon in filtered"
        :key="coupon.userCouponId"
        class="coupon-item"
        :class="statusClass(coupon)"
      >
        <!-- 左侧金额区 -->
        <div class="coupon-left">
          <p class="coupon-face">
            <span v-if="!isDiscount(coupon)" class="face-unit">¥</span>
            <span class="face-value">{{ faceValue(coupon) }}</span>
            <span v-if="isDiscount(coupon)" class="face-unit">折</span>
          </p>
          <p class="coupon-scope">{{ coupon.scopeType === 'ALL' ? '全场通用' : '指定商品' }}</p>
        </div>

        <!-- 票券分割线（虚线 + 上下圆缺口） -->
        <span class="coupon-divider" aria-hidden="true"></span>

        <!-- 右侧信息区 -->
        <div class="coupon-right">
          <p class="coupon-name text-ellipsis">{{ coupon.name }}</p>
          <p class="coupon-threshold">{{ thresholdText(coupon) }}</p>
          <p class="coupon-time">{{ expireText(coupon) }}</p>
        </div>

        <!-- 右上状态角标 -->
        <span class="coupon-status">{{ statusText(coupon) }}</span>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
}

.page .section-title {
  margin: 0 0 var(--space-md);
}

.coupon-tabs {
  margin-bottom: var(--space-md);
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* ===== 票券卡：左金额区 + 虚线缺口 + 右信息区 ===== */
.coupon-item {
  position: relative;
  display: flex;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  background: var(--bg-card);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.coupon-item:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

/* 左侧金额区：品牌色浅底 */
.coupon-left {
  width: 136px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--space-md) var(--space-sm);
  background: var(--color-primary-bg);
}

.coupon-face {
  display: flex;
  align-items: baseline;
  margin: 0;
  font-family: var(--font-num);
  font-weight: 700;
  color: var(--color-primary);
}

.face-value {
  font-size: 26px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.face-unit {
  margin: 0 2px;
  font-size: 13px;
  font-weight: 500;
}

.coupon-scope {
  margin: 0;
  font-size: 12px;
  color: var(--text-regular);
}

/* 分割线两端的圆缺口（被卡片 overflow 裁成半圆） */
.coupon-divider {
  position: relative;
  width: 0;
  flex-shrink: 0;
  border-left: 1px dashed var(--border-strong);
}

.coupon-divider::before,
.coupon-divider::after {
  content: '';
  position: absolute;
  left: -6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--border-light);
}

.coupon-divider::before {
  top: -6px;
}

.coupon-divider::after {
  bottom: -6px;
}

/* 右侧信息区 */
.coupon-right {
  flex: 1;
  min-width: 0;
  padding: var(--space-md);
  padding-right: 76px;
}

.coupon-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.coupon-threshold {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-regular);
}

.coupon-time {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 右上状态角标 */
.coupon-status {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

/* ===== 三种状态区分 ===== */
.coupon-item.is-available .coupon-status {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* 已使用：弱化但不完全灰掉 */
.coupon-item.is-used {
  opacity: 0.78;
}

.coupon-item.is-used .coupon-left {
  background: var(--bg-soft);
}

.coupon-item.is-used .coupon-face {
  color: var(--text-secondary);
}

.coupon-item.is-used .coupon-status {
  color: var(--text-regular);
  background: var(--bg-soft);
}

/* 已过期：整体灰化 */
.coupon-item.is-expired {
  opacity: 0.55;
}

.coupon-item.is-expired .coupon-left {
  background: var(--bg-soft);
}

.coupon-item.is-expired .coupon-face {
  color: var(--text-placeholder);
}

.coupon-item.is-expired .coupon-name {
  color: var(--text-secondary);
}

.coupon-item.is-expired .coupon-status {
  color: var(--text-placeholder);
  background: var(--bg-soft);
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .coupon-list {
    gap: var(--space-sm);
  }

  /* 券卡：左侧金额区收窄，面额字号减小 */
  .coupon-left {
    width: 96px;
    padding: var(--space-sm) var(--space-xs);
  }

  .face-value {
    font-size: 18px;
  }

  .face-unit {
    font-size: 12px;
  }

  .coupon-right {
    padding: var(--space-sm);
    padding-right: 68px;
  }

  .coupon-name {
    font-size: 14px;
  }

  .coupon-status {
    top: 8px;
    right: 8px;
    padding: 1px 8px;
  }
}
</style>
