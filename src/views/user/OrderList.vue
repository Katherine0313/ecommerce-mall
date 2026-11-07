<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getOrderPage, getOrderCounts, cancelOrder, finishOrder } from '@/api/order.js'
import {
  ORDER_STATUS,
  ORDER_TABS,
  ORDER_COUNT_FIELDS,
  statusMeta,
} from '@/constants/order.js'

const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 10

const loading = ref(true)
const orders = ref([])
const activeTab = ref(normalizeStatus(route.query.status))
const page = ref(1)
const total = ref(0)
const counts = ref({})
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')

// 路由/参数上的 status 统一成数字；空值表示「全部」
function normalizeStatus(value) {
  if (value === undefined || value === null || value === '') return ''
  const n = Number(value)
  return Number.isNaN(n) || n === 0 ? '' : n
}

// 每个 tab 的数量（来自后端 /orders/counts，不再本地统计）
function tabCount(value) {
  if (!value) return counts.value.all || 0
  return counts.value[ORDER_COUNT_FIELDS[Number(value)]] || 0
}

function metaOf(order) {
  return statusMeta(order.orderStatus, order.orderStatusDesc)
}

function load() {
  loading.value = true
  getOrderPage({
    status: activeTab.value === '' ? undefined : activeTab.value,
    keyword: keyword.value.trim() || undefined,
    page: page.value,
    pageSize: PAGE_SIZE,
  })
    .then((data) => {
      orders.value = data?.list || []
      total.value = Number(data?.total || 0)
      // 当前页被取消/删空时回退到最后一个有效页
      const maxPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
      if (page.value > maxPage) {
        page.value = maxPage
        return load()
      }
    })
    .catch((e) => {
      ElMessage.error(e?.message || '订单加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function loadCounts() {
  getOrderCounts()
    .then((data) => {
      counts.value = data || {}
    })
    .catch(() => {
      // 角标失败不影响列表
    })
}

function refresh() {
  load()
  loadCounts()
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
          refresh()
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
      // 确认收货 = 已发货(4) → 已完成(5)，对应后端 /finish
      finishOrder(order.id)
        .then(() => {
          ElMessage.success('已确认收货')
          refresh()
        })
        .catch((e) => {
          ElMessage.error(e?.message || '操作失败')
        })
    })
    .catch(() => {})
}

// 售后入口：与后端 AfterSaleServiceImpl.create 的可申请状态保持一致
// 仅退款支持 3/4，退货退款/换货支持 4/5；同一订单只能申请一次
function canApplyAfterSale(order) {
  return (
    [ORDER_STATUS.PENDING_SHIP, ORDER_STATUS.SHIPPED, ORDER_STATUS.FINISHED].includes(
      order.orderStatus
    ) && !order.afterSale
  )
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
  if (order.orderStatus === ORDER_STATUS.PENDING_PAY) {
    return [
      { label: '取消订单', type: 'text', handler: handleCancel },
      { label: '去支付', type: 'primary', handler: handlePay },
    ]
  }
  if (order.orderStatus === ORDER_STATUS.SHIPPED) {
    // 闭环：售后处理中时置灰确认收货，避免一边售后一边完结订单
    const inAfterSale = !!order.afterSale
    return [
      { label: '查看物流', type: 'text', handler: () => goDetail(order.id) },
      {
        label: '确认收货',
        type: 'primary',
        disabled: inAfterSale,
        disabledTip: inAfterSale ? '售后处理中，暂不能确认收货' : '',
        handler: handleConfirm,
      },
    ]
  }
  return [{ label: '查看详情', type: 'text', handler: () => goDetail(order.id) }]
}

function handleTabChange(name) {
  activeTab.value = normalizeStatus(name)
  page.value = 1
  load()
}

function handlePageChange(value) {
  page.value = value
  load()
}

function handleSearch() {
  page.value = 1
  load()
}

// 支持从个人中心带 status/keyword 参数跳进来
watch(
  () => [route.query.status, route.query.keyword],
  ([status, word]) => {
    const next = normalizeStatus(status)
    const nextKeyword = typeof word === 'string' ? word : ''
    if (next === activeTab.value && nextKeyword === keyword.value) return
    activeTab.value = next
    keyword.value = nextKeyword
    page.value = 1
    load()
  }
)

onMounted(refresh)
</script>

<template>
  <div class="card page">
    <div class="page-head">
      <h2 class="section-title">我的订单</h2>
      <el-input
        v-model="keyword"
        class="order-search"
        placeholder="搜订单号 / 商品名称"
        clearable
        :prefix-icon="Search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 状态 tab -->
    <el-tabs v-model="activeTab" class="order-tabs" @tab-change="handleTabChange">
      <el-tab-pane
        v-for="tab in ORDER_TABS"
        :key="tab.label"
        :label="tab.label"
        :name="tab.value"
      >
        <template #label>
          <span class="tab-label">
            {{ tab.label }}
            <span v-if="tabCount(tab.value)" class="tab-count">{{ tabCount(tab.value) }}</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <el-empty v-if="!loading && !orders.length" description="还没有相关订单" />

    <div v-loading="loading" class="order-list">
      <article v-for="order in orders" :key="order.id" class="order-card">
        <!-- 订单头：订单号 / 下单时间 / 状态 -->
        <header class="order-head">
          <span class="order-no">订单号：{{ order.orderNo }}</span>
          <span class="order-time">{{ order.createdAt }}</span>
          <span
            class="order-status"
            :style="{ color: metaOf(order).color, background: metaOf(order).bg }"
          >
            {{ metaOf(order).label }}
          </span>
        </header>

        <!-- 商品行 -->
        <div class="order-items" @click="goDetail(order.id)">
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

        <!-- 订单尾：件数 / 售后 / 实付 / 操作 -->
        <footer class="order-foot">
          <span class="order-count">共 {{ (order.items || []).length }} 件商品</span>

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
              :disabled="!!action.disabled"
              :title="action.disabledTip || ''"
              size="small"
              @click="action.handler(order)"
            >
              {{ action.label }}
            </el-button>
          </div>
        </footer>
      </article>
    </div>

    <div v-if="total" class="order-pager">
      <span class="pager-total">共 {{ total }} 笔订单</span>
      <el-pagination
        v-if="total > PAGE_SIZE"
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="PAGE_SIZE"
        :total="total"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
}

.page-head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.page-head .section-title {
  margin: 0;
}

.order-search {
  width: 260px;
  margin-left: auto;
}

.order-tabs {
  margin-top: var(--space-md);
  margin-bottom: var(--space-md);
}

.order-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.pager-total {
  font-size: 13px;
  color: var(--text-secondary);
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

/* ===== 订单卡片（京东式三段：头 / 商品 / 尾） ===== */
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.order-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.order-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

/* 订单头 */
.order-head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 10px var(--space-md);
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text-secondary);
}

.order-no {
  color: var(--text-regular);
}

.order-time {
  margin-left: auto;
}

.order-status {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

/* 商品行 */
.order-items {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
}

.order-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 8px 0;
}

.order-item + .order-item {
  border-top: 1px dashed var(--border-light);
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
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  transition: color 0.15s;
}

.order-item:hover .item-name {
  color: var(--color-primary);
}

.item-amount {
  flex-shrink: 0;
  text-align: right;
}

.item-amount .price {
  margin: 0 0 4px;
}

.item-qty {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 订单尾 */
.order-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-md);
  padding: 10px var(--space-md);
  border-top: 1px solid var(--border-light);
}

.order-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.aftersale-btn {
  color: var(--status-aftersale);
}

.order-total {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-regular);
}

.order-total strong {
  font-family: var(--font-num);
  font-size: 18px;
  color: var(--color-primary);
}

.order-actions {
  display: flex;
  gap: var(--space-sm);
}

/* ===== 窄屏（≤768px） ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .order-search {
    width: 100%;
    margin-left: 0;
  }

  .order-head {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .order-time {
    margin-left: 0;
  }

  .order-status {
    margin-left: auto;
  }

  .item-img {
    width: 60px;
    height: 60px;
  }

  .order-items {
    padding: var(--space-sm);
  }

  .order-foot {
    gap: var(--space-sm);
    padding: var(--space-sm);
  }

  .order-total {
    margin-left: 0;
  }

  .order-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .order-pager {
    justify-content: center;
    gap: var(--space-sm);
  }

  .pager-total {
    width: 100%;
    text-align: center;
  }
}
</style>
