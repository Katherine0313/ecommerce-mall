<template>
  <el-dialog
    v-model="visible"
    width="900px"
    :show-close="false"
    :close-on-click-modal="false"
    class="pay-dialog"
  >
    <div class="pay-wrapper">
      <!-- 顶栏 -->
      <div class="pay-header">
        <div class="pay-header-left">
          <span class="pay-header-title">收银台</span>
          <span class="pay-header-sub">订单支付</span>
        </div>
        <el-button text class="pay-close" @click="visible = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <!-- 主体 -->
      <div v-if="orderData" class="pay-body">
        <!-- 左侧：订单信息 -->
        <div class="pay-left">
          <div class="info-card">
            <div class="info-row">
              <span>订单号 {{ orderData.orderNo }}</span>
              <span>{{ formatTime(orderData.createdAt) }}</span>
            </div>
          </div>

          <!-- 商品列表 -->
          <div class="goods-list">
            <div v-for="item in orderData.items" :key="item.orderItemId" class="goods-item">
              <img :src="item.image" class="goods-img" alt="商品" />
              <div class="goods-info">
                <div class="goods-name">{{ item.productName }}</div>
                <div class="goods-meta">
                  <span class="goods-price">¥{{ formatPrice(item.salesPrice) }}</span>
                  <span class="goods-qty">× {{ item.quantity }}</span>
                </div>
              </div>
              <span class="goods-sub">¥{{ formatPrice(item.subTotal) }}</span>
            </div>
          </div>

          <!-- 费用明细 -->
          <div class="cost-lines">
            <div class="cost-row">
              <span class="cost-label">商品总额</span>
              <span class="cost-val">¥{{ formatPrice(orderData.payAmount) }}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">运费</span>
              <span class="cost-val free">免运费</span>
            </div>
          </div>
        </div>

        <!-- 右侧：支付方式 -->
        <div class="pay-right">
          <div class="pay-methods">
            <div
              v-for="(method, key) in PAY_METHODS"
              :key="key"
              class="method-item"
              :class="{ active: payType === key }"
              @click="payType = key"
            >
              <span class="method-name">{{ method.name }}支付</span>
              <el-icon v-if="payType === key" class="method-check">
                <CircleCheckFilled />
              </el-icon>
            </div>
          </div>

          <div class="qrcode-card">
            <div class="qrcode-img">
              <img :src="qrSrc" alt="支付二维码" />
            </div>
            <p class="qrcode-text">{{ payTypeLabel }}</p>
            <p class="qrcode-hint">请使用{{ payTypeName }}扫描二维码完成支付</p>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div v-if="orderData" class="pay-footer">
        <span class="footer-countdown">支付剩余 <strong>{{ countdown }}</strong></span>
        <div class="footer-btns">
          <el-button class="btn-cancel" @click="visible = false">稍后支付</el-button>
          <el-button class="btn-confirm" @click="handlePay(orderData.id)">
            我已支付 ¥{{ formatPrice(orderData.payAmount) }}
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, CircleCheckFilled } from '@element-plus/icons-vue'
import { getOrder, payOrder } from '@/api/order.js'
import { formatPrice } from '@/utils/format.js'

const emit = defineEmits(['paid'])

// 沙箱支付二维码走 product-service 静态目录
const qrSrc = '/image/QRcode.webp'

// 支付方式：key 与后端 pay_type 约定一致
const PAY_METHODS = {
  WeChat: { label: '打开微信扫一扫', name: '微信' },
  Alipay: { label: '打开支付宝扫一扫', name: '支付宝' },
  BankCard: { label: '输入银行卡号支付', name: '银行卡' },
}

const visible = ref(false)
const orderData = ref(null)
const countdown = ref('')
const payType = ref('WeChat')

const payTypeLabel = computed(() => PAY_METHODS[payType.value]?.label || '')
const payTypeName = computed(() => PAY_METHODS[payType.value]?.name || '')

// 父组件通过 ref 调用：打开收银台并加载订单
async function open(id) {
  visible.value = true
  orderData.value = null
  try {
    const data = await getOrder(id)
    orderData.value = data
    startCountdown(data?.createdAt)
  } catch (e) {
    ElMessage.error(e?.message || '订单加载失败')
    visible.value = false
  }
}
defineExpose({ open })

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 30 分钟支付倒计时
let timer = null
function startCountdown(createdAt) {
  clearInterval(timer)
  const end = new Date(createdAt).getTime() + 30 * 60 * 1000
  const tick = () => {
    const left = Math.max(0, end - Date.now())
    const m = Math.floor(left / 60000)
    const s = Math.floor((left % 60000) / 1000)
    countdown.value = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    if (left <= 0) clearInterval(timer)
  }
  tick()
  timer = setInterval(tick, 1000)
}

async function handlePay(id) {
  try {
    await payOrder(id, { payType: payType.value })
    ElMessage.success('支付成功')
    visible.value = false
    emit('paid')
  } catch (e) {
    ElMessage.error(e?.message || '支付失败')
  }
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.pay-wrapper {
  padding: 0 4px;
}

/* ── 顶栏 ── */
.pay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 20px;
}

.pay-header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.pay-header-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.pay-header-sub {
  font-size: 13px;
  color: var(--text-secondary);
}

.pay-close {
  font-size: 16px;
  color: var(--text-secondary);
  padding: 4px;
}

/* ── 主体 ── */
.pay-body {
  display: flex;
  gap: 28px;
}

.pay-left {
  flex: 1;
  min-width: 0;
}

/* 订单信息卡 */
.info-card {
  background: #fff;
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-regular);
}

/* 商品列表 */
.goods-list {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 8px 0;
  margin-bottom: 12px;
}

.goods-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
}

.goods-item + .goods-item {
  border-top: 1px solid var(--border-light);
}

.goods-img {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.goods-info {
  flex: 1;
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.goods-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.goods-sub {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 费用明细 */
.cost-lines {
  background: var(--bg-hover);
  border-radius: 12px;
  padding: 12px 20px;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.cost-label {
  color: var(--text-secondary);
}

.cost-val {
  color: var(--text-primary);
  font-weight: 500;
}

.cost-val.free {
  color: #22bc66;
}

/* ── 右侧 ── */
.pay-right {
  width: 280px;
  flex-shrink: 0;
}

/* 支付方式 */
.pay-methods {
  background: var(--bg-hover);
  border-radius: 12px;
  padding: 4px;
  display: flex;
  margin-bottom: 16px;
}

.method-item {
  flex: 1;
  padding: 8px 0;
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.method-item.active {
  background: #fff;
  color: var(--color-primary);
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.method-check {
  font-size: 14px;
}

/* 二维码卡 */
.qrcode-card {
  background: var(--bg-hover);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
}

.qrcode-img {
  width: 160px;
  height: 160px;
  margin: 0 auto 12px;
  background: #fff;
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.qrcode-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qrcode-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.qrcode-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

/* 底部操作栏 */
.pay-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20px;
  margin-top: 8px;
  border-top: 1px solid var(--border-light);
}

.footer-countdown {
  font-size: 13px;
  color: var(--text-secondary);
}

.footer-countdown strong {
  color: var(--color-primary);
  font-weight: 600;
}

.footer-btns {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  height: 40px;
  border-radius: 8px;
}

.btn-confirm {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff6700, #ff8533);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(255, 78, 42, 0.3);
}

.btn-confirm:hover {
  background: linear-gradient(135deg, #ff6700, #ffb380);
  color: #fff;
}

/* ── 响应式 ── */
@media (max-width: 1200px) {
  .pay-body {
    flex-wrap: wrap;
  }
  .pay-left {
    flex: 1 1 420px;
  }
  .pay-right {
    flex: 1 1 260px;
  }
}

@media (max-width: 767px) {
  .pay-body {
    display: block;
  }
  .pay-right {
    margin-top: 16px;
    width: 100%;
  }
  .pay-footer {
    flex-wrap: wrap;
    gap: 10px;
  }
  .footer-btns {
    width: 100%;
  }
  .goods-item {
    flex-wrap: wrap;
  }
  .goods-sub {
    margin-left: auto;
  }
}
</style>

<style>
/* 收银台弹窗：去掉默认内边距，交给内容自己控制 */
.pay-dialog .el-dialog__header {
  display: none;
}

.pay-dialog .el-dialog__body {
  padding: 24px 28px 28px;
  border-radius: 16px;
}
</style>
