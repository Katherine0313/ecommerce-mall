<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrder } from '@/api/order.js'
import {
  getAfterSaleStatusConstants,
  getAfterSaleByOrder,
  createAfterSale,
  uploadAfterSaleImage,
} from '@/api/aftersale.js'
import { formatPrice } from '@/utils/format.js'

const route = useRoute()
const router = useRouter()

// 订单 ID 从路由参数取（/aftersales/apply/:orderId）
const orderId = Number(route.params.orderId)

const loading = ref(true)
const submitting = ref(false)
const order = ref(null)
const constants = ref(null)

// ===== 表单字段 =====
const afterSaleType = ref('')
const reason = ref('')
const goodsStatus = ref('')
const returnWay = ref('')
const returnTimeSlot = ref('')
const shipAddress = ref('')
const remark = ref('')
const fileList = ref([])

// 订单状态：3 未发货，4 已发货，5 已完成（与后端 OrderStatusEnum 一致）
const orderStatusOk = computed(() => [3, 4, 5].includes(order.value?.orderStatus))
const isShipped = computed(() => [4, 5].includes(order.value?.orderStatus))
// 货物状态只在「已发货」时填写（对齐小程序端逻辑）
const showGoodsStatus = computed(() => order.value?.orderStatus === 4)

// 可选服务类型：未发货只能仅退款；已发货三种都可选；已完成只能退货退款/换货
const TYPE_OPTIONS = [
  { code: 'only_refund', desc: '没收到货，或与卖家协商同意不用退货只退款' },
  { code: 'return_refund', desc: '已收到货，需要退还收到的货物' },
  { code: 'exchange', desc: '有非人为损坏的质量问题，联系卖家协商换货' },
]

const typeOptions = computed(() => {
  const status = order.value?.orderStatus
  let allowed = []
  if (status === 3) allowed = ['only_refund']
  else if (status === 4) allowed = ['only_refund', 'return_refund', 'exchange']
  else if (status === 5) allowed = ['return_refund', 'exchange']

  const typeMap = constants.value?.typeMap || {}
  return TYPE_OPTIONS.filter((t) => allowed.includes(t.code)).map((t) => ({
    ...t,
    name: typeMap[t.code] || t.code,
  }))
})

// 售后原因：后端按「未发货 / 已发货」下发两套
const reasonOptions = computed(() => {
  const c = constants.value
  if (!c) return []
  const map = isShipped.value ? c.shippedReasonMap : c.unshippedReasonMap
  return Object.entries(map || {}).map(([code, name]) => ({ code, name }))
})

// 货物状态选项
const goodsStatusOptions = computed(() =>
  Object.entries(constants.value?.goodsStatusMap || {}).map(([code, name]) => ({ code, name }))
)

// 退货方式只在「退货退款」申请时填写（换货在提交退货物流时再选，对齐后端 submitReturn）
const needReturnWay = computed(() => afterSaleType.value === 'return_refund')
const isPickup = computed(() => returnWay.value === 'pickup')
const isExchange = computed(() => afterSaleType.value === 'exchange')

// 退款金额：整单商品小计之和（前端只展示，最终以后端为准）
const refundAmount = computed(() =>
  (order.value?.items || []).reduce((sum, item) => {
    const subtotal =
      item.subTotal != null
        ? Number(item.subTotal)
        : Number(item.salesPrice || 0) * Number(item.quantity || 0)
    return sum + subtotal
  }, 0)
)

const loadingError = ref('')

async function load() {
  loading.value = true
  loadingError.value = ''
  try {
    const [orderData, constantsData] = await Promise.all([
      getOrder(orderId),
      getAfterSaleStatusConstants(),
    ])
    order.value = orderData
    constants.value = constantsData

    // 后端限制：同一订单只能申请一次，已申请过直接去详情页
    const exist = await getAfterSaleByOrder(orderId).catch(() => null)
    if (exist) {
      ElMessage.warning('该订单已申请过售后')
      router.replace(`/aftersales/order/${orderId}`)
      return
    }

    // 只有一种可选类型时默认选中
    if (typeOptions.value.length === 1) {
      afterSaleType.value = typeOptions.value[0].code
    }
  } catch (e) {
    loadingError.value = e?.message || '订单加载失败'
  } finally {
    loading.value = false
  }
}

// 切换服务类型时清空不适用的字段，避免残留值被提交
function onTypeChange() {
  goodsStatus.value = ''
  returnWay.value = ''
  returnTimeSlot.value = ''
  shipAddress.value = ''
}

// 图片上传：POST /api/upload?type=after-sale，返回 { url }
async function uploadImage(options) {
  try {
    const data = await uploadAfterSaleImage(options.file)
    options.onSuccess(data)
  } catch (e) {
    options.onError(e)
  }
}

// 前端预校验（与后端 create 的必填规则一致）
function validate() {
  if (!orderStatusOk.value) return '当前订单状态不支持申请售后'
  if (!afterSaleType.value) return '请选择服务类型'
  if (!reason.value) return '请选择售后原因'
  if (showGoodsStatus.value && !goodsStatus.value) return '请选择货物状态'
  if (needReturnWay.value) {
    if (!returnWay.value) return '请选择退货方式'
    if (isPickup.value && !returnTimeSlot.value) return '请选择取件时段'
  }
  if (isExchange.value && !shipAddress.value.trim()) return '请填写收货地址'
  // 图片还在上传 / 上传失败时不提交，避免凭证丢失
  if (fileList.value.some((f) => f.status === 'uploading' || f.status === 'ready'))
    return '图片上传中，请稍候'
  if (fileList.value.some((f) => f.status === 'fail')) return '有图片上传失败，请删除后重试'
  return ''
}

async function submit() {
  if (submitting.value) return
  const error = validate()
  if (error) {
    ElMessage.warning(error)
    return
  }

  submitting.value = true
  try {
    await createAfterSale({
      orderId,
      afterSaleType: afterSaleType.value,
      reason: reason.value,
      // 后端允许为空：未发货订单不填货物状态
      goodsStatus: showGoodsStatus.value ? goodsStatus.value : null,
      returnWay: needReturnWay.value ? returnWay.value : null,
      returnTimeSlot: isPickup.value ? returnTimeSlot.value : null,
      shipAddress: isExchange.value ? shipAddress.value.trim() : null,
      remark: remark.value.trim(),
      images: fileList.value.map((f) => f.response?.url).filter(Boolean),
    })
    ElMessage.success('售后申请已提交，请等待商家审核')
    router.replace(`/aftersales/order/${orderId}`)
  } catch (e) {
    ElMessage.error(e?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container aftersale-page">
    <el-skeleton v-if="loading" :rows="8" animated />

    <el-alert
      v-else-if="loadingError"
      :title="loadingError"
      type="error"
      show-icon
      :closable="false"
    />

    <template v-else-if="order">
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/user/orders' }">我的订单</el-breadcrumb-item>
        <el-breadcrumb-item>申请售后</el-breadcrumb-item>
      </el-breadcrumb>

      <h2 class="section-title">申请售后</h2>

      <el-alert
        v-if="!orderStatusOk"
        title="该订单当前状态不支持申请售后"
        type="warning"
        show-icon
        :closable="false"
        class="status-alert"
      />

      <!-- 订单商品 -->
      <div class="card-block">
        <div class="block-title">退款商品</div>
        <div class="goods-list">
          <div v-for="item in order.items || []" :key="item.orderItemId" class="goods-item">
            <img class="goods-img" :src="item.image" :alt="item.productName" loading="lazy" />
            <div class="goods-info">
              <p class="goods-name">{{ item.productName }}</p>
              <p class="goods-meta">
                <span>¥{{ formatPrice(item.salesPrice) }}</span>
                <span>×{{ item.quantity }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 服务类型 -->
      <div class="card-block">
        <div class="block-title">选择服务类型</div>
        <div class="type-list">
          <button
            v-for="t in typeOptions"
            :key="t.code"
            type="button"
            class="type-item"
            :class="{ active: afterSaleType === t.code }"
            @click="afterSaleType = t.code; onTypeChange()"
          >
            <span class="type-name">{{ t.name }}</span>
            <span class="type-desc">{{ t.desc }}</span>
          </button>
        </div>
        <el-empty v-if="!typeOptions.length" description="暂无可用的售后类型" :image-size="80" />
      </div>

      <!-- 售后信息 -->
      <div class="card-block">
        <div class="block-title">售后信息</div>
        <el-form label-width="110px" class="aftersale-form">
          <el-form-item v-if="showGoodsStatus" label="货物状态" required>
            <el-select v-model="goodsStatus" placeholder="请选择货物状态" class="field-select">
              <el-option
                v-for="g in goodsStatusOptions"
                :key="g.code"
                :label="g.name"
                :value="g.code"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="售后原因" required>
            <el-select v-model="reason" placeholder="请选择售后原因" class="field-select">
              <el-option
                v-for="r in reasonOptions"
                :key="r.code"
                :label="r.name"
                :value="r.code"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="退款金额">
            <span class="refund-amount">¥{{ formatPrice(refundAmount) }}</span>
          </el-form-item>

          <!-- 退货退款 / 换货：退货方式 -->
          <template v-if="needReturnWay">
            <el-form-item label="退货方式" required>
              <el-radio-group v-model="returnWay" @change="returnTimeSlot = ''">
                <el-radio value="pickup">上门取件</el-radio>
                <el-radio value="self">自行寄回</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="isPickup" label="取件时段" required>
              <el-select v-model="returnTimeSlot" placeholder="请选择取件时段" class="field-select">
                <el-option label="上午 09:00 - 13:00" value="morning" />
                <el-option label="下午 13:00 - 19:00" value="afternoon" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="isExchange" label="收货地址" required>
              <el-input
                v-model="shipAddress"
                type="textarea"
                :rows="2"
                maxlength="200"
                show-word-limit
                placeholder="收货人、电话、地址（商家寄新货地址）"
              />
            </el-form-item>
          </template>

          <el-form-item label="补充描述">
            <el-input
              v-model="remark"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="补充描述，有助于商家更好地处理售后问题"
            />
          </el-form-item>

          <el-form-item label="上传凭证">
            <el-upload
              v-model:file-list="fileList"
              list-type="picture-card"
              accept="image/*"
              :limit="6"
              :http-request="uploadImage"
            >
              <span class="upload-plus">+</span>
            </el-upload>
          </el-form-item>
        </el-form>
      </div>

      <div class="submit-bar">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.aftersale-page {
  padding: var(--space-lg) 10px var(--space-xl);
}

.breadcrumb {
  height: 26px;
  line-height: 26px;
  font-size: 14px;
}

.section-title {
  margin: var(--space-md) 0;
}

.status-alert {
  margin-bottom: var(--space-md);
}

/* ===== 内容卡片 ===== */
.card-block {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.block-title {
  margin-bottom: var(--space-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ===== 商品 ===== */
.goods-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.goods-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
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
  min-width: 0;
}

.goods-name {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.goods-meta {
  display: flex;
  gap: var(--space-md);
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 服务类型 ===== */
.type-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 260px;
  padding: 14px var(--space-md);
  text-align: left;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.type-item:hover,
.type-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.type-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.type-item.active .type-name {
  color: var(--color-primary);
}

.type-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* ===== 表单 ===== */
.aftersale-form {
  max-width: 760px;
}

.field-select {
  width: 280px;
}

.refund-amount {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary);
}

.upload-plus {
  font-size: 22px;
  color: var(--text-secondary);
}

/* ===== 提交栏 ===== */
.submit-bar {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}

.submit-bar .el-button {
  min-width: 140px;
}

@media (max-width: 640px) {
  .type-item {
    width: 100%;
  }

  .field-select {
    width: 100%;
  }
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .aftersale-page {
    padding: var(--space-md) var(--space-sm) var(--space-xl);
  }

  .card-block {
    padding: var(--space-sm);
  }

  /* 商品行：图片缩小 */
  .goods-item {
    gap: var(--space-sm);
  }

  .goods-img {
    width: 60px;
    height: 60px;
  }

  /* 服务类型卡片占满整行 */
  .type-item {
    width: 100%;
  }

  /* 表单控件占满整行 */
  .field-select {
    width: 100%;
  }

  /* 提交按钮各占一半 */
  .submit-bar {
    gap: var(--space-sm);
  }

  .submit-bar .el-button {
    flex: 1;
    min-width: 0;
    margin: 0;
  }
}
</style>
