<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getAfterSalePage, getAfterSaleCounts } from '@/api/aftersale.js'

const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 10

// 售后状态语义色（与后端 after-sales/status-constants 的 code 一致）
const STATUS_META = {
  reviewing: { label: '审核中', color: 'var(--status-pay)', bg: 'var(--status-pay-bg)' },
  returning: { label: '退货中', color: 'var(--status-ship)', bg: 'var(--status-ship-bg)' },
  refunding: { label: '退款中', color: 'var(--status-ship)', bg: 'var(--status-ship-bg)' },
  exchanging: { label: '换货中', color: 'var(--status-ship)', bg: 'var(--status-ship-bg)' },
  exchanged: { label: '已换货', color: 'var(--status-done)', bg: 'var(--status-done-bg)' },
  refunded: { label: '已退款', color: 'var(--status-receive)', bg: 'var(--status-receive-bg)' },
  rejected: { label: '售后关闭', color: 'var(--status-aftersale)', bg: 'var(--status-aftersale-bg)' },
}

const TABS = [
  { label: '全部', value: '' },
  { label: '审核中', value: 'reviewing' },
  { label: '退货中', value: 'returning' },
  { label: '退款中', value: 'refunding' },
  { label: '换货中', value: 'exchanging' },
  { label: '已完成', value: 'exchanged' },
  { label: '已退款', value: 'refunded' },
  { label: '售后关闭', value: 'rejected' },
]

const loading = ref(true)
const list = ref([])
const activeTab = ref(typeof route.query.status === 'string' ? route.query.status : '')
const page = ref(1)
const total = ref(0)
const counts = ref({})
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')

function metaOf(item) {
  return STATUS_META[item.status] || {
    label: item.statusDesc || '未知状态',
    color: 'var(--text-secondary)',
    bg: 'var(--bg-hover)',
  }
}

function tabCount(value) {
  if (!value) return counts.value.all || 0
  return counts.value[value] || 0
}

function load() {
  loading.value = true
  getAfterSalePage({
    status: activeTab.value || undefined,
    search: keyword.value.trim() || undefined,
    page: page.value,
    pageSize: PAGE_SIZE,
  })
    .then((data) => {
      list.value = data?.list || []
      total.value = Number(data?.total || 0)
      const maxPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
      if (page.value > maxPage) {
        page.value = maxPage
        return load()
      }
    })
    .catch((e) => {
      ElMessage.error(e?.message || '售后记录加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function loadCounts() {
  getAfterSaleCounts()
    .then((data) => {
      counts.value = data || {}
    })
    .catch(() => {})
}

function handleTabChange(name) {
  activeTab.value = name || ''
  page.value = 1
  load()
}

function handleSearch() {
  page.value = 1
  load()
}

function handlePageChange(value) {
  page.value = value
  load()
}

function goDetail(item) {
  router.push(`/aftersales/order/${item.orderId}`)
}

watch(
  () => [route.query.status, route.query.keyword],
  ([status, word]) => {
    const next = typeof status === 'string' ? status : ''
    const nextKeyword = typeof word === 'string' ? word : ''
    if (next === activeTab.value && nextKeyword === keyword.value) return
    activeTab.value = next
    keyword.value = nextKeyword
    page.value = 1
    load()
  }
)

onMounted(() => {
  load()
  loadCounts()
})
</script>

<template>
  <div class="card page">
    <div class="page-head">
      <h2 class="section-title">退款/售后</h2>
      <el-input
        v-model="keyword"
        class="search"
        placeholder="搜售后单号 / 订单号 / 商品"
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

    <el-tabs v-model="activeTab" class="tabs" @tab-change="handleTabChange">
      <el-tab-pane
        v-for="tab in TABS"
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

    <el-empty v-if="!loading && !list.length" description="暂无售后记录" />

    <div v-loading="loading" class="list">
      <article v-for="item in list" :key="item.id" class="card-item">
        <header class="item-head">
          <span class="no">售后单号：{{ item.afterSaleNo }}</span>
          <span class="order-no">原订单：{{ item.orderNo }}</span>
          <span class="time">{{ item.createdAt }}</span>
          <span
            class="status"
            :style="{ color: metaOf(item).color, background: metaOf(item).bg }"
          >
            {{ metaOf(item).label }}
          </span>
        </header>

        <div class="item-body" @click="goDetail(item)">
          <div v-for="(goods, index) in item.items || []" :key="index" class="goods">
            <img class="goods-img" :src="goods.image" :alt="goods.productName" loading="lazy" />
            <div class="goods-info">
              <p class="goods-name text-ellipsis-2">{{ goods.productName }}</p>
              <p class="goods-type">{{ item.afterSaleTypeDesc }}</p>
            </div>
            <div class="goods-amount">
              <p class="price">¥{{ goods.salesPrice }}</p>
              <p class="qty">×{{ goods.quantity }}</p>
            </div>
          </div>
        </div>

        <footer class="item-foot">
          <span class="reason">原因：{{ item.reasonDesc || '—' }}</span>
          <span class="refund">
            退款金额 <strong>¥{{ item.refundAmount }}</strong>
          </span>
          <el-button type="text" size="small" @click="goDetail(item)">查看进度</el-button>
        </footer>
      </article>
    </div>

    <div v-if="total" class="pager">
      <span class="pager-total">共 {{ total }} 条售后</span>
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

.search {
  width: 280px;
  margin-left: auto;
}

.tabs {
  margin-top: var(--space-md);
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

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.card-item {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.card-item:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

.item-head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 10px var(--space-md);
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text-secondary);
}

.no,
.order-no {
  color: var(--text-regular);
}

.time {
  margin-left: auto;
}

.status {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.item-body {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
}

.goods {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 8px 0;
}

.goods + .goods {
  border-top: 1px dashed var(--border-light);
}

.goods-img {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
}

.goods-info {
  flex: 1;
  min-width: 0;
}

.goods-name {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.goods-type {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.goods-amount {
  flex-shrink: 0;
  text-align: right;
}

.goods-amount .price {
  margin: 0 0 4px;
}

.qty {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.item-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-md);
  padding: 10px var(--space-md);
  border-top: 1px solid var(--border-light);
  font-size: 13px;
}

.reason {
  color: var(--text-secondary);
}

.refund {
  margin-left: auto;
  color: var(--text-regular);
}

.refund strong {
  font-family: var(--font-num);
  font-size: 18px;
  color: var(--color-primary);
}

.pager {
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

@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .search {
    width: 100%;
    margin-left: 0;
  }

  .item-head {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .time {
    margin-left: 0;
  }

  .status {
    margin-left: auto;
  }

  .goods-img {
    width: 60px;
    height: 60px;
  }

  .item-body,
  .item-foot {
    padding: var(--space-sm);
  }

  .refund {
    margin-left: 0;
  }

  .pager {
    justify-content: center;
  }

  .pager-total {
    width: 100%;
    text-align: center;
  }
}
</style>
