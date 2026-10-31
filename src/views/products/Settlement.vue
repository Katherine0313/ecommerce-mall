<template>
  <div class="container settle-page">
    <h2 class="section-title">确认订单</h2>

    <div class="settle-wrapper">
      <!-- ===== 左侧：结算商品列表 ===== -->
      <div class="settle-left">
        <!-- 收货地址 -->
        <div class="settle-top" @click="handleAddress">
          <div class="addr-icon">
            <el-icon><Location /></el-icon>
          </div>
          <div class="addr-text">
            <template v-if="defaultAddress">
              <div class="addr-title">{{ defaultAddress.consignee }} {{ defaultAddress.phone }}</div>
              <div class="addr-tip">{{ defaultAddress.region }} {{ defaultAddress.detailAddress }}</div>
            </template>
            <template v-else>
              <div class="addr-title">请选择收货地址</div>
              <div class="addr-tip">请先添加收货地址</div>
            </template>
          </div>
          <div v-if="defaultAddress" class="edit">
            <el-button @click.stop="editExistingAddress">编辑地址</el-button>
          </div>
        </div>

        <StoreCard />

        <!-- 全选栏 -->
        <div class="settle-header">
          <div class="header-check" @click="toggleSelectAll">
            <el-icon v-if="isAllSelected" class="check-icon checked"><CircleCheckFilled /></el-icon>
            <span v-else class="check-circle"></span>
          </div>
          <span class="header-label header-label-info">商品信息</span>
          <span class="header-label header-label-price">单价</span>
          <span class="header-label header-label-qty">数量</span>
          <span class="header-label header-label-sub">小计</span>
        </div>

        <!-- 商品卡片列表 -->
        <div class="settle-items">
          <div
            v-for="item in settlementItems"
            :key="item.productId"
            class="settle-item-card"
            :class="{ selected: selectedKeys.includes(item.productId) }"
          >
            <div class="item-check" @click="toggleItem(item.productId)">
              <el-icon v-if="selectedKeys.includes(item.productId)" class="check-icon checked">
                <CircleCheckFilled />
              </el-icon>
              <span v-else class="check-circle"></span>
            </div>

            <img :src="item.image" class="item-image" alt="" />

            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-meta">
                <span class="item-badge">官方标配</span>
              </div>
              <div class="item-price">
                <span class="price-symbol">￥</span>
                <span class="price-value">{{ formatPrice(item.price) }}</span>
              </div>
            </div>

            <div class="item-stepper">
              <button
                class="step-btn"
                @click="cartStore.updateQuantity(item.productId, Math.max(1, item.quantity - 1))"
              >
                −
              </button>
              <span class="step-num">{{ item.quantity }}</span>
              <button class="step-btn" @click="cartStore.updateQuantity(item.productId, item.quantity + 1)">
                +
              </button>
            </div>

            <div class="item-subtotal">
              <span class="subtotal-symbol">￥</span>
              <span class="subtotal-value">{{ itemSubtotal(item) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 右侧：结算卡 ===== -->
      <div class="settle-right">
        <div class="checkout-card">
          <!-- 已选商品缩略图 -->
          <div v-if="checkedItems.length" class="checkout-thumbs">
            <img
              v-for="item in checkedItems"
              :key="item.productId"
              :src="item.image"
              class="checkout-thumb"
              alt=""
            />
          </div>

          <div class="checkout-title">
            <el-icon class="checkout-cart-icon"><ShoppingCart /></el-icon>
            <span>结算明细</span>
          </div>

          <div class="checkout-header">
            <span>付款详情 共 <strong>{{ checkedTotalCount }}</strong> 件商品</span>
          </div>

          <div class="checkout-lines">
            <div class="checkout-row">
              <span class="checkout-label">商品总额</span>
              <span class="checkout-value">￥{{ settlementSubtotal }}</span>
            </div>
            <div v-if="Number(settlementInsuranceFee) > 0" class="checkout-row">
              <span class="checkout-label">增值保障</span>
              <span class="checkout-value">￥{{ settlementInsuranceFee }}</span>
            </div>
            <div class="checkout-row">
              <span class="checkout-label">运费</span>
              <span class="checkout-value shipping">{{ shippingText }}</span>
            </div>
          </div>

          <div class="checkout-total">
            <span class="total-label">合计</span>
            <span class="total-price">
              <span class="total-symbol">￥</span>
              <span class="total-value">{{ settlementTotal }}</span>
            </span>
          </div>

          <div class="btn-row">
            <el-button class="btn-return" @click="handleReturn">返回购物车</el-button>
            <el-button class="btn-pay" @click="handlePay">提交订单</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 地址管理（抽屉） -->
    <Address ref="addressRef" @saved="fetchAddressList" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ShoppingCart, CircleCheckFilled, Location } from '@element-plus/icons-vue'
import { useCartStore } from '@/stores/cart.js'
import { getAddressList } from '@/api/address.js'
import { createOrder } from '@/api/order.js'
import { formatPrice } from '@/utils/format.js'
import StoreCard from '@/components/StoreCard.vue'
import Address from './Address.vue'

const route = useRoute()
const router = useRouter()

const cartStore = useCartStore()
const addressRef = ref(null)

// 本次参与结算的商品 ID
const keys = ref([])
// 已勾选的商品 ID
const selectedKeys = ref([])

// 独立结算页：待结算的商品 ID 从路由 query 读（/checkout?ids=1,2）
onMounted(() => {
  const raw = typeof route.query.ids === 'string' ? route.query.ids : ''
  keys.value = raw ? raw.split(',').map((v) => Number(v)).filter(Boolean) : []
  selectedKeys.value = [...keys.value]
  if (!keys.value.length) {
    ElMessage.warning('没有要结算的商品')
    router.replace('/cart')
    return
  }
  fetchAddressList()
})

// ============ 选中逻辑 ============
function toggleItem(id) {
  const idx = selectedKeys.value.indexOf(id)
  if (idx > -1) selectedKeys.value.splice(idx, 1)
  else selectedKeys.value.push(id)
}

const isAllSelected = computed(
  () =>
    settlementItems.value.length > 0 &&
    settlementItems.value.every((i) => selectedKeys.value.includes(i.productId))
)

function toggleSelectAll() {
  selectedKeys.value = isAllSelected.value
    ? []
    : settlementItems.value.map((i) => i.productId)
}

// ============ 购物车商品 ============
const settlementItems = computed(() =>
  cartStore.items.filter((item) => keys.value.includes(item.productId))
)

const checkedItems = computed(() =>
  settlementItems.value.filter((item) => selectedKeys.value.includes(item.productId))
)

const checkedTotalCount = computed(() =>
  checkedItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0)
)

const settlementSubtotal = computed(() =>
  checkedItems.value
    .reduce((sum, item) => sum + Number(item.price || 0) * (item.quantity || 0), 0)
    .toFixed(2)
)

const settlementInsuranceFee = computed(() =>
  checkedItems.value
    .reduce((sum, item) => sum + (Number(item.insuranceFee) || 0) * (item.quantity || 0), 0)
    .toFixed(2)
)

const settlementTotal = computed(() =>
  (Number(settlementSubtotal.value) + Number(settlementInsuranceFee.value)).toFixed(2)
)

const shippingText = '免运费'

function itemSubtotal(item) {
  if (item.subTotal != null) return formatPrice(item.subTotal)
  return (((Number(item.price) || 0) + (Number(item.insuranceFee) || 0)) * item.quantity).toFixed(2)
}

// ============ 返回购物车 ============
function handleReturn() {
  router.push('/cart')
}

// ============ 地址 ============
const addressList = ref([])

const defaultAddress = computed(
  () =>
    addressList.value.find((a) => Number(a.isDefault) === 1) ||
    addressList.value[0] ||
    null
)

async function fetchAddressList() {
  try {
    addressList.value = (await getAddressList()) || []
  } catch {
    // 地址加载失败不阻断结算，用户可重新打开
    addressList.value = []
  }
}

function handleAddress() {
  addressRef.value?.open()
}

function editExistingAddress() {
  addressRef.value?.open(defaultAddress.value)
}

// ============ 提交订单 ============
// 幂等键：同一次下单意图复用同一个值，防止重复点击生成多单
function newIdempotencyKey() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function handlePay() {
  if (!defaultAddress.value) return ElMessage.warning('请先填写收货地址')
  if (!checkedItems.value.length) return ElMessage.warning('请选择要购买的商品')

  try {
    const order = await createOrder({
      consignee: defaultAddress.value.consignee,
      phone: defaultAddress.value.phone,
      region: defaultAddress.value.region,
      detailAddress: defaultAddress.value.detailAddress,
      remark: '',
      idempotencyKey: newIdempotencyKey(),
      items: checkedItems.value.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        // 后端 OrderItemDTO.insuranceDetail 是 JSON 字符串
        insuranceDetail: JSON.stringify(i.insuranceDetail || []),
        insuranceFee: i.insuranceFee || 0,
      })),
    })

    // 下单成功：移出购物车，跳支付结果页
    for (const item of checkedItems.value) await cartStore.removeItem(item.productId)
    router.push(`/pay/${order.id}`)
  } catch (e) {
    ElMessage.error(e?.message || '下单失败')
  }
}
</script>

<style scoped>
/* ===== 地址栏 ===== */
.settle-top {
  display: flex;
  gap: 14px;
  align-items: center;
  background: transparent;
  padding: 18px 22px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.settle-top:hover {
  border-color: var(--color-primary-light);
  background-color: var(--color-primary-bg);
}

.addr-icon {
  font-size: 26px;
  color: var(--color-primary);
}

.addr-text {
  flex: 1;
}

.addr-title {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 500;
}

.addr-tip {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ===== 整体布局 ===== */
.settle-wrapper {
  display: flex;
  gap: 30px;
}

.settle-left {
  width: 700px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settle-right {
  flex: 1;
  flex-shrink: 0;
  position: sticky;
  top: 10px;
  align-self: flex-start;
}

/* ===== 全选栏 ===== */
.settle-header {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fafafa;
  border-radius: 12px;
  padding: 14px 20px;
  font-size: 16px;
}

.header-check {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.header-label {
  font-weight: 500;
}

.header-label-info {
  flex: 1;
}

.header-label-price {
  width: 60px;
  text-align: center;
}

.header-label-qty {
  width: 120px;
  text-align: center;
}

.header-label-sub {
  width: 96px;
  text-align: right;
}

/* ===== 商品卡片 ===== */
.settle-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settle-item-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: transparent;
  border-radius: 18px;
  padding: 6px 20px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.settle-item-card.selected {
  border-color: #ffb380;
}

.item-check {
  cursor: pointer;
  flex-shrink: 0;
}

.check-circle {
  display: block;
  width: 22px;
  height: 22px;
  border: 2px solid #d0d0d0;
  border-radius: 50%;
  transition: border-color 0.2s;
}

.check-icon.checked {
  font-size: 24px;
  color: var(--color-primary);
}

.item-image {
  width: 60px;
  height: 50px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-badge {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 2px 10px;
  border-radius: 4px;
}

.item-price {
  color: var(--color-primary);
  font-weight: 600;
}

.price-symbol {
  font-size: 13px;
}

.price-value {
  font-size: 18px;
}

.item-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.step-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.step-btn:hover {
  background: var(--bg-hover);
}

.step-btn:first-child {
  border-right: 1px solid #e0e0e0;
}

.step-btn:last-child {
  border-left: 1px solid #e0e0e0;
}

.step-num {
  width: 48px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.item-subtotal {
  flex-shrink: 0;
  text-align: right;
  min-width: 96px;
}

.subtotal-symbol {
  font-size: 13px;
  color: var(--color-primary);
}

.subtotal-value {
  font-size: 20px;
  color: var(--color-primary);
  font-weight: 700;
}

/* ===== 右侧结算卡 ===== */
.checkout-card {
  background: transparent;
  border-radius: 18px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.checkout-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.checkout-thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--border-light);
}

.checkout-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.checkout-cart-icon {
  font-size: 28px;
  color: var(--color-primary);
}

.checkout-header {
  text-align: center;
  font-size: 14px;
  color: var(--color-primary);
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}

.checkout-header strong {
  font-size: 18px;
}

.checkout-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkout-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.checkout-label {
  color: var(--text-regular);
}

.checkout-value {
  color: var(--text-primary);
  font-weight: 500;
}

.checkout-value.shipping {
  color: #22bc66;
}

.checkout-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16px 0;
  border-top: 1px solid var(--border-light);
}

.total-label {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.total-symbol {
  font-size: 16px;
  color: #ff4e2a;
}

.total-value {
  font-size: 32px;
  color: #ff4e2a;
  font-weight: 700;
}

.btn-row {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-return {
  width: 120px;
  height: 40px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid #e0e0e0;
}

.btn-return:hover {
  border-color: #ffb380;
  color: var(--color-primary);
}

.btn-pay {
  width: 120px;
  height: 40px;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  background: linear-gradient(135deg, #ff4e2a, #ff7a00);
  color: #fff;
  transition: opacity 0.2s;
}

.btn-pay:hover {
  opacity: 0.9;
  color: #fff;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .settle-wrapper {
    flex-wrap: wrap;
  }
  .settle-left {
    max-width: 100%;
    flex: 1 1 480px;
  }
  .settle-right {
    width: 100%;
    flex: 1 1 100%;
    position: static;
  }
}

@media (max-width: 767px) {
  .settle-wrapper {
    display: block;
  }
  .settle-header {
    display: none;
  }
  .settle-right {
    margin-top: 16px;
  }
  .settle-top {
    flex-wrap: wrap;
    gap: 8px;
  }
  .settle-item-card {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px;
  }
  .item-info {
    flex: 1 1 calc(100% - 110px);
  }
  .item-stepper {
    order: 5;
    margin-left: auto;
  }
  .item-subtotal {
    order: 6;
  }
}
</style>
