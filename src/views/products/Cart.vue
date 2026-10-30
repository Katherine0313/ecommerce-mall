<template>
  <el-dialog v-model="visible" title="购物车" width="min(900px, 92vw)" class="cart-dialog">
    <div class="cart-wrapper">
      <!-- ===== 左侧：商品列表 ===== -->
      <div class="cart-left">
        <StoreCard />

        <!-- 全选栏 -->
        <div class="cart-header">
          <div class="header-check" @click="toggleSelectAll">
            <el-icon v-if="isAllSelected" class="check-icon checked"><CircleCheckFilled /></el-icon>
            <span v-else class="check-circle"></span>
          </div>
          <span class="header-label header-label-info">商品信息</span>
          <span class="header-label header-label-price">单价</span>
          <span class="header-label header-label-qty">数量</span>
          <span class="header-label header-label-sub">小计</span>
          <span class="header-label header-label-act">操作</span>
        </div>

        <!-- 商品卡片列表 -->
        <div class="cart-items">
          <div
            v-for="item in cartStore.items"
            :key="item.productId"
            class="cart-item-card"
            :class="{ selected: selectedIds.has(item.productId) }"
          >
            <div class="item-check" @click="toggleSelect(item.productId)">
              <el-icon v-if="selectedIds.has(item.productId)" class="check-icon checked">
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

            <!-- 数量步进器 -->
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

            <div class="item-actions">
              <el-button text class="action-btn" @click="cartStore.removeItem(item.productId)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
              <el-button text class="action-btn">
                <el-icon><Star /></el-icon>
                收藏
              </el-button>
            </div>
          </div>

          <!-- 操作通栏 -->
          <div v-if="cartStore.items.length" class="cart-action-bar">
            <span>已选中 <strong>{{ selectedCount }}</strong> 件商品</span>
            <el-button class="batch-delete-btn" :disabled="!selectedIds.size" @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
          </div>

          <!-- 空购物车 -->
          <div v-if="!cartStore.items.length" class="cart-empty">
            <el-icon class="empty-icon"><ShoppingCart /></el-icon>
            <p>购物车是空的，去逛逛吧</p>
          </div>
        </div>
      </div>

      <!-- ===== 右侧：结算卡 ===== -->
      <div class="cart-right">
        <div class="checkout-card">
          <div class="checkout-header">
            <el-icon class="checkout-cart-icon"><ShoppingCart /></el-icon>
            <span>已选 <strong>{{ selectedCount }}</strong> 件商品</span>
          </div>

          <div class="checkout-lines">
            <div class="checkout-row">
              <span class="checkout-label">商品总额</span>
              <span class="checkout-value">￥{{ selectedSubtotal }}</span>
            </div>
            <div v-if="Number(selectedInsuranceFee) > 0" class="checkout-row">
              <span class="checkout-label">增值保障</span>
              <span class="checkout-value">￥{{ selectedInsuranceFee }}</span>
            </div>
            <div class="checkout-row">
              <span class="checkout-label">运费</span>
              <span class="checkout-value shipping">{{ shippingText }}</span>
            </div>
          </div>

          <div class="checkout-total">
            <span class="total-label">实付款</span>
            <span class="total-price">
              <span class="total-symbol">￥</span>
              <span class="total-value">{{ finalTotal }}</span>
            </span>
          </div>

          <div class="btn-row">
            <el-button class="btn-settle" :disabled="!selectedCount" @click="handleSettlement">
              去支付
            </el-button>
            <el-button class="btn-continue" @click="visible = false">继续购物</el-button>
          </div>

          <div class="checkout-services">
            <div class="cs-item"><el-icon><Medal /></el-icon><span>正品保证</span></div>
            <div class="cs-item"><el-icon><Lightning /></el-icon><span>极速发货</span></div>
            <div class="cs-item"><el-icon><Clock /></el-icon><span>七天退换</span></div>
            <div class="cs-item"><el-icon><Location /></el-icon><span>官方售后</span></div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- 结算弹窗：放在购物车弹窗之外，避免父弹窗关闭时一起被隐藏 -->
  <Settlement ref="settlementRef" @back="visible = true" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ShoppingCart,
  CircleCheckFilled,
  Delete,
  Star,
  Medal,
  Lightning,
  Clock,
  Location,
} from '@element-plus/icons-vue'
import { useCartStore } from '@/stores/cart.js'
import { useUserStore } from '@/stores/user.js'
import { useAuthStore } from '@/stores/auth.js'
import { formatPrice } from '@/utils/format.js'
import StoreCard from '@/components/StoreCard.vue'
import Settlement from './Settlement.vue'

const visible = ref(false)
const cartStore = useCartStore()
const userStore = useUserStore()
const authStore = useAuthStore()

// 父组件通过 ref 调用；未登录先弹登录框，登录成功后继续打开
async function open() {
  if (!userStore.isLoggedIn) {
    const ok = await authStore.openLogin('login')
    if (!ok) return
  }
  visible.value = true
  selectedIds.value = new Set()
  await cartStore.load()
}
defineExpose({ open })

// ============ 选中逻辑 ============
const selectedIds = ref(new Set())

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const isAllSelected = computed(
  () => cartStore.items.length > 0 && cartStore.items.every((i) => selectedIds.value.has(i.productId))
)

function toggleSelectAll() {
  selectedIds.value = isAllSelected.value
    ? new Set()
    : new Set(cartStore.items.map((i) => i.productId))
}

// ============ 批量删除 ============
async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.size} 件商品吗？`,
      '确认删除',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
  } catch {
    return // 用户取消
  }

  const ids = [...selectedIds.value]
  for (const id of ids) await cartStore.removeItem(id)
  selectedIds.value = new Set()
  ElMessage.success('已删除')
}

// ============ 计算属性 ============
const selectedItems = computed(() =>
  cartStore.items.filter((i) => selectedIds.value.has(i.productId))
)

const selectedCount = computed(() =>
  selectedItems.value.reduce((sum, i) => sum + (i.quantity || 0), 0)
)

const selectedSubtotal = computed(() =>
  selectedItems.value
    .reduce((sum, i) => sum + Number(i.price || 0) * (i.quantity || 0), 0)
    .toFixed(2)
)

// 增值保障费合计（单件保障费 × 数量）
const selectedInsuranceFee = computed(() =>
  selectedItems.value
    .reduce((sum, i) => sum + (Number(i.insuranceFee) || 0) * (i.quantity || 0), 0)
    .toFixed(2)
)

const finalTotal = computed(() =>
  (Number(selectedSubtotal.value) + Number(selectedInsuranceFee.value)).toFixed(2)
)

const shippingText = '免运费'

// ============ 去结算 ============
const settlementRef = ref(null)
function handleSettlement() {
  if (!selectedCount.value) return
  settlementRef.value?.open([...selectedIds.value])
  visible.value = false
}

// （单价 + 单件保障费）× 数量；后端有 subTotal 时优先用
function itemSubtotal(item) {
  if (item.subTotal != null) return formatPrice(item.subTotal)
  return (((Number(item.price) || 0) + (Number(item.insuranceFee) || 0)) * item.quantity).toFixed(2)
}
</script>

<style scoped>
/* ===== 整体布局 ===== */
.cart-wrapper {
  display: flex;
  gap: 16px;
}

.cart-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 全选栏 ===== */
.cart-header {
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
  width: 80px;
  text-align: right;
}

.header-label-act {
  width: 72px;
  text-align: center;
}

/* ===== 操作通栏 ===== */
.cart-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 16px 20px;
  font-size: 14px;
  color: var(--text-secondary);
}

.cart-action-bar strong {
  color: var(--color-primary);
  font-size: 16px;
}

.batch-delete-btn {
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  background: #fff;
  font-size: 13px;
  border-radius: 8px;
  padding: 4px 16px;
}

.batch-delete-btn:hover {
  color: #fff;
  background: #ff4d4f;
  border-color: #ff4d4f;
}

.batch-delete-btn:disabled {
  color: #d9d9d9;
  border-color: #e0e0e0;
  background: #f5f5f5;
}

/* ===== 商品卡片 ===== */
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 6px 14px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.cart-item-card.selected {
  border-color: #ffb380;
}

/* 复选框 */
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

/* 数量步进器 */
.item-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.step-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: #fff;
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
  width: 40px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.item-subtotal {
  flex-shrink: 0;
  text-align: right;
  min-width: 70px;
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

/* 操作按钮 */
.item-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  color: var(--text-secondary);
  font-size: 13px;
  padding: 2px 4px;
}

.action-btn:hover {
  color: var(--color-primary);
}

/* 空购物车 */
.cart-empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text-placeholder);
}

.empty-icon {
  font-size: 64px;
}

.cart-empty p {
  font-size: 16px;
  margin-top: 12px;
  color: var(--text-secondary);
}

/* ===== 右侧结算卡 ===== */
.cart-right {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 10px;
  align-self: flex-start;
}

.checkout-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.checkout-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-primary);
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}

.checkout-header strong {
  color: var(--color-primary);
  font-size: 18px;
}

.checkout-cart-icon {
  font-size: 20px;
  color: var(--color-primary);
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
  padding: 10px 0;
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

/* 按钮 */
.btn-row {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-settle {
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

.btn-settle:hover {
  opacity: 0.9;
  color: #fff;
}

.btn-settle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-continue {
  width: 120px;
  height: 40px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  background: #fff;
  color: var(--text-secondary);
  border: 1px solid #e0e0e0;
}

.btn-continue:hover {
  border-color: #ffb380;
  color: var(--color-primary);
}

/* 服务保障 */
.checkout-services {
  display: flex;
  flex-wrap: wrap;
  row-gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.cs-item {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cs-item .el-icon {
  font-size: 14px;
  color: var(--text-placeholder);
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .cart-wrapper {
    flex-wrap: wrap;
  }
  .cart-left {
    flex: 1 1 480px;
  }
  .cart-right {
    width: auto;
    flex: 1 1 260px;
    position: static;
  }
}

@media (max-width: 767px) {
  .cart-wrapper {
    display: block;
  }
  .cart-header {
    display: none;
  }
  .cart-right {
    width: 100%;
    margin-top: 16px;
  }
  .cart-item-card {
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
  .item-actions {
    order: 7;
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
  }
  .cart-action-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
