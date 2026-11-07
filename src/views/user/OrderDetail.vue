<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrder, cancelOrder, finishOrder, getOrderLogistics } from '@/api/order.js'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const order = ref(null)
const logistics = ref(null)
const logisticsVisible = ref(false)

// 订单状态码（与后端 OrderStatusEnum 一致）
const STATUS = {
  PENDING_PAY: 1,
  SHIPPED: 4,
}

function load() {
  loading.value = true
  getOrder(route.params.id)
    .then((data) => {
      order.value = data
    })
    .catch((e) => {
      ElMessage.error(e?.message || '订单加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function handleCancel() {
  ElMessageBox.confirm('确定取消这笔订单吗？取消后库存会退回。', '取消订单', {
    confirmButtonText: '确定取消',
    cancelButtonText: '再想想',
    type: 'warning',
  })
    .then(() => {
      cancelOrder(order.value.id)
        .then(() => {
          ElMessage.success('订单已取消')
          load()
        })
        .catch((e) => {
          ElMessage.error(e?.message || '取消失败')
        })
    })
    .catch(() => {})
}

function handleConfirm() {
  ElMessageBox.confirm('确定已收到货吗？', '确认收货', {
    confirmButtonText: '确认收货',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      // 确认收货 = 已发货(4) → 已完成(5)，对应后端 /finish
      finishOrder(order.value.id)
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

function showLogistics() {
  getOrderLogistics(order.value.id)
    .then((data) => {
      logistics.value = data
      logisticsVisible.value = true
    })
    .catch((e) => {
      ElMessage.error(e?.message || '物流信息加载失败')
    })
}

function goPay() {
  router.push('/user/orders')
}

// 底部按钮：按订单状态给
const footerActions = computed(() => {
  if (!order.value) return []
  if (order.value.orderStatus === STATUS.PENDING_PAY) {
    return [
      { label: '取消订单', type: 'default', handler: handleCancel },
      { label: '去支付', type: 'primary', handler: goPay },
    ]
  }
  if (order.value.orderStatus === STATUS.SHIPPED) {
    return [
      { label: '查看物流', type: 'default', handler: showLogistics },
      { label: '确认收货', type: 'primary', handler: handleConfirm },
    ]
  }
  return []
})

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="card page">
    <div class="page-head">
      <h2 class="section-title">订单详情</h2>
      <el-button link type="primary" @click="router.back()">返回</el-button>
    </div>

    <template v-if="order">
      <!-- 状态条 -->
      <div class="status-bar">
        <span class="status-text">{{ order.orderStatusDesc }}</span>
        <span class="status-no">订单号：{{ order.orderNo }}</span>
      </div>

      <!-- 收货信息 -->
      <section class="block">
        <h3 class="block-title">收货信息</h3>
        <p class="consignee">
          {{ order.consignee }}
          <span class="phone">{{ order.phone }}</span>
        </p>
        <p class="address">{{ order.region }} {{ order.detailAddress }}</p>
      </section>

      <!-- 商品列表 -->
      <section class="block">
        <h3 class="block-title">商品信息</h3>
        <div v-for="item in order.items || []" :key="item.orderItemId" class="order-item">
          <img class="item-img" :src="item.image" :alt="item.productName" loading="lazy" />
          <div class="item-info">
            <p class="item-name">{{ item.productName }}</p>
          </div>
          <div class="item-amount">
            <p class="price">¥{{ item.salesPrice }}</p>
            <p class="item-qty">×{{ item.quantity }}</p>
          </div>
        </div>
      </section>

      <!-- 金额明细 -->
      <section class="block">
        <h3 class="block-title">金额明细</h3>
        <div class="amount-row">
          <span>商品小计</span>
          <span>¥{{ order.originalAmount }}</span>
        </div>
        <div v-if="order.discountAmount" class="amount-row discount">
          <span>优惠</span>
          <span>-¥{{ order.discountAmount }}</span>
        </div>
        <div class="amount-row total">
          <span>实付金额</span>
          <span>¥{{ order.payAmount }}</span>
        </div>
        <div v-if="order.payTypeDesc" class="amount-row">
          <span>支付方式</span>
          <span>{{ order.payTypeDesc }}</span>
        </div>
      </section>

      <!-- 时间信息 -->
      <section class="block">
        <h3 class="block-title">订单信息</h3>
        <div class="amount-row"><span>下单时间</span><span>{{ order.createdAt }}</span></div>
        <div v-if="order.payAt" class="amount-row"><span>支付时间</span><span>{{ order.payAt }}</span></div>
        <div v-if="order.shipAt" class="amount-row"><span>发货时间</span><span>{{ order.shipAt }}</span></div>
        <div v-if="order.finishAt" class="amount-row"><span>完成时间</span><span>{{ order.finishAt }}</span></div>
        <div v-if="order.remark" class="amount-row"><span>买家备注</span><span>{{ order.remark }}</span></div>
      </section>

      <!-- 底部操作 -->
      <footer v-if="footerActions.length" class="page-foot">
        <el-button
          v-for="action in footerActions"
          :key="action.label"
          :type="action.type"
          @click="action.handler"
        >
          {{ action.label }}
        </el-button>
      </footer>
    </template>

    <!-- 物流弹窗 -->
    <el-dialog v-model="logisticsVisible" title="物流轨迹" width="480px">
      <el-timeline v-if="logistics?.traces?.length">
        <el-timeline-item
          v-for="(trace, i) in logistics.traces"
          :key="i"
          :timestamp="trace.time"
          :type="i === 0 ? 'primary' : ''"
        >
          <div class="trace-status">{{ trace.status }}</div>
          <div class="trace-desc">{{ trace.desc }}</div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无物流信息" />
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-head .section-title {
  margin: 0 0 var(--space-md);
}

/* ===== 状态条 ===== */
.status-bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
}

.status-no {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 区块 ===== */
.block {
  margin-top: var(--space-lg);
}

.block-title {
  margin: 0 0 var(--space-sm);
  font-size: 14px;
  color: var(--text-regular);
}

.consignee {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--text-primary);
}

.phone {
  margin-left: var(--space-sm);
  color: var(--text-secondary);
}

.address {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 商品行 ===== */
.order-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 8px 0;
}

.item-img {
  width: 64px;
  height: 64px;
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

/* ===== 金额行 ===== */
.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-regular);
}

.amount-row.discount span:last-child {
  color: var(--color-primary);
}

.amount-row.total {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
  font-size: 15px;
  font-weight: 600;
}

.amount-row.total span:last-child {
  color: var(--color-primary);
  font-size: 18px;
}

/* ===== 物流轨迹 ===== */
.trace-status {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.trace-desc {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-regular);
}

/* ===== 底部操作 ===== */
.page-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-light);
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  /* 状态条：状态与订单号换行 */
  .status-bar {
    flex-wrap: wrap;
    gap: 6px var(--space-sm);
    padding: var(--space-sm);
  }

  .status-no {
    margin-left: 0;
    width: 100%;
  }

  /* 商品行：图片缩小 */
  .order-item {
    gap: var(--space-sm);
  }

  .item-img {
    width: 60px;
    height: 60px;
  }

  /* 底部操作按钮占满整行，方便点击 */
  .page-foot {
    flex-direction: column;
    gap: var(--space-sm);
  }

  .page-foot .el-button {
    width: 100%;
    margin-left: 0;
  }
}
</style>
