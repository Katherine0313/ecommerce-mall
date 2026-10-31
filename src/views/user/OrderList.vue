<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderList, cancelOrder, confirmOrder } from '@/api/order.js'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const orders = ref([])
const activeTab = ref('all')

// 订单状态码（与后端 OrderStatusEnum 一致）
const STATUS = {
  PENDING_PAY: 1,
  PENDING_CONFIRM: 2,
  PENDING_SHIP: 3,
  SHIPPED: 4,
  FINISHED: 5,
  CANCEL: 6,
}

// 状态 tab：value 是 orderStatus，空字符串表示全部
const TABS = [
  { label: '全部', value: '' },
  { label: '待付款', value: STATUS.PENDING_PAY },
  { label: '待发货', value: STATUS.PENDING_SHIP },
  { label: '待收货', value: STATUS.SHIPPED },
  { label: '已完成', value: STATUS.FINISHED },
  { label: '已取消', value: STATUS.CANCEL },
]

// 后端 GET /api/orders 不支持按状态筛选，这里拿全量后前端过滤
const filtered = computed(() => {
  if (!activeTab.value) return orders.value
  return orders.value.filter((o) => o.orderStatus === activeTab.value)
})

// 每个 tab 的数量
function tabCount(value) {
  if (!value) return orders.value.length
  return orders.value.filter((o) => o.orderStatus === value).length
}

function load() {
  loading.value = true
  getOrderList()
    .then((list) => {
      orders.value = list || []
    })
    .catch((e) => {
      ElMessage.error(e?.message || '订单加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function goDetail(id) {
  router.push(`/user/orders/${id}`)
}

// 待付款：去支付（复用结算页的支付流程，先跳订单详情）
function handlePay(order) {
  goDetail(order.id)
}

function handleCancel(order) {
  ElMessageBox.confirm('确定取消这笔订单吗？取消后库存会退回。', '取消订单', {
    confirmButtonText: '确定取消',
    cancelButtonText: '再想想',
    type: 'warning',
  })
    .then(() => {
      cancelOrder(order.id)
        .then(() => {
          ElMessage.success('订单已取消')
          load()
        })
        .catch((e) => {
          ElMessage.error(e?.message || '取消失败')
        })
    })
    .catch(() => {
      // 用户点了「再想想」，不做任何事
    })
}

function handleConfirm(order) {
  ElMessageBox.confirm('确定已收到货吗？', '确认收货', {
    confirmButtonText: '确认收货',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      confirmOrder(order.id)
        .then(() => {
          ElMessage.success('已确认收货')
          load()
        })
        .catch((e) => {
          ElMessage.error(e?.message || '操作失败')
        })
    })
    .catch(() => {})
}

// 售后入口：与后端 AfterSaleServiceImpl.create 的可申请状态保持一致
// 仅退款支持 2/3/4，退货退款/换货支持 4/5；同一订单只能申请一次
function canApplyAfterSale(order) {
  return [STATUS.PENDING_CONFIRM, STATUS.PENDING_SHIP, STATUS.SHIPPED, STATUS.FINISHED].includes(
    order.orderStatus
  ) && !order.afterSale
}

function goAfterSale(order) {
  if (order.afterSale) {
    router.push(`/aftersales/order/${order.id}`)
  } else {
    router.push(`/aftersales/apply/${order.id}`)
  }
}

// 订单卡片上按状态给操作按钮
function actionsOf(order) {
  if (order.orderStatus === STATUS.PENDING_PAY) {
    return [
      { label: '取消订单', type: 'text', handler: handleCancel },
      { label: '去支付', type: 'primary', handler: handlePay },
    ]
  }
  if (order.orderStatus === STATUS.SHIPPED) {
    return [
      { label: '查看物流', type: 'text', handler: () => goDetail(order.id) },
      { label: '确认收货', type: 'primary', handler: handleConfirm },
    ]
  }
  return [{ label: '查看详情', type: 'text', handler: () => goDetail(order.id) }]
}

// 支持从个人中心带 status 参数跳进来
watch(
  () => route.query.status,
  (value) => {
    activeTab.value = value ? Number(value) : ''
  },
  { immediate: true }
)

onMounted(load)
</script>

<template>
  <div class="card page">
    <h2 class="section-title">我的订单</h2>

    <!-- 状态 tab -->
    <el-tabs v-model="activeTab" class="order-tabs">
      <el-tab-pane v-for="tab in TABS" :key="tab.label" :label="tab.label" :name="String(tab.value)">
        <template #label>
          <span class="tab-label">
            {{ tab.label }}
            <span v-if="tabCount(tab.value)" class="tab-count">{{ tabCount(tab.value) }}</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <el-empty v-if="!loading && !filtered.length" description="还没有相关订单" />

    <div v-loading="loading" class="order-list">
      <article v-for="order in filtered" :key="order.id" class="order-card">
        <!-- 订单头 -->
        <header class="order-head">
          <span class="order-no">订单号：{{ order.orderNo }}</span>
          <span class="order-time">{{ order.createdAt }}</span>
          <el-tag class="order-status" type="warning" size="small">
            {{ order.orderStatusDesc }}
          </el-tag>
        </header>

        <!-- 商品行 -->
        <div class="order-items">
          <div v-for="item in order.items || []" :key="item.orderItemId" class="order-item">
            <img class="item-img" :src="item.image" :alt="item.productName" loading="lazy" />
            <div class="item-info">
              <p class="item-name text-ellipsis-2">{{ item.productName }}</p>
            </div>
            <div class="item-amount">
              <p class="price">¥{{ item.salesPrice }}</p>
              <p class="item-qty">×{{ item.quantity }}</p>
            </div>
          </div>
        </div>

        <!-- 订单尾：金额 + 操作 -->
        <footer class="order-foot">
          <span class="order-count">共 {{ (order.items || []).length }} 件商品</span>
          <!-- 可申请售后 → 申请售后；已申请 → 售后详情 -->
          <el-button
            v-if="order.afterSale || canApplyAfterSale(order)"
            type="text"
            size="small"
            class="aftersale-btn"
            @click="goAfterSale(order)"
          >
            {{ order.afterSale ? '售后详情' : '申请售后' }}
          </el-button>
          <span class="order-total">
            实付 <strong>¥{{ order.payAmount }}</strong>
          </span>
          <div class="order-actions">
            <el-button
              v-for="action in actionsOf(order)"
              :key="action.label"
              :type="action.type"
              size="small"
              @click="action.handler(order)"
            >
              {{ action.label }}
            </el-button>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
}

.order-tabs {
  margin-bottom: var(--space-md);
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tab-count {
  font-size: 12px;
  color: var(--color-primary);
}

/* ===== 订单卡片 ===== */
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.order-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.order-head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 10px var(--space-md);
  background: var(--bg-hover);
  font-size: 13px;
  color: var(--text-secondary);
}

.order-time {
  margin-left: auto;
}

.order-status {
  flex-shrink: 0;
}

/* ===== 商品行 ===== */
.order-items {
  padding: var(--space-sm) var(--space-md);
}

.order-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 8px 0;
}

.item-img {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--text-primary);
}

.item-spec {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}


.item-amount {
  text-align: right;
  flex-shrink: 0;
}

.item-amount .price {
  margin: 0 0 4px;
}

.item-qty {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 订单尾 ===== */
.order-foot {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 10px var(--space-md);
  border-top: 1px solid var(--border-light);
}

.order-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.order-total {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-regular);
}

.order-total strong {
  font-size: 18px;
  color: var(--color-primary);
}

.order-actions {
  display: flex;
  gap: var(--space-sm);
}
</style>
