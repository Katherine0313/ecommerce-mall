<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getAfterSaleStatusConstants,
  getAfterSaleByOrder,
  getAfterSaleLogs,
  submitAfterSaleReturn,
} from '@/api/aftersale.js'
import { formatPrice } from '@/utils/format.js'

const route = useRoute()
const router = useRouter()

// 详情按订单查（/aftersales/order/:orderId），与订单列表的入口保持一致
const orderId = Number(route.params.orderId)

const loading = ref(true)
const loadingError = ref('')
const detail = ref(null)
const constants = ref(null)
// 售后变更记录（after_sale_log）
const logs = ref([])

// ===== 回填退货物流（状态 returning 时）=====
const submitting = ref(false)
const returnWay = ref('')
const returnTimeSlot = ref('')
const courier = ref('')
const trackingNumber = ref('')

const statusType = computed(() => {
  const color = constants.value?.color?.[detail.value?.status]
  if (color === 'success') return 'success'
  if (color === 'error') return 'danger'
  return 'primary'
})

// 已回填过退货物流（returnAt 非空）不再展示表单
const needSubmitReturn = computed(
  () => detail.value?.status === 'returning' && !detail.value?.returnAt
)

// 退货退款：退货方式申请时已确定；换货：此时才选
const isReturnRefund = computed(() => detail.value?.afterSaleType === 'return_refund')
const isExchange = computed(() => detail.value?.afterSaleType === 'exchange')

// 实际生效的退货方式：退货退款沿用申请时的选择
const effectiveReturnWay = computed(() => {
  if (isReturnRefund.value) return detail.value?.returnWay || ''
  return returnWay.value
})
const needCourier = computed(() => effectiveReturnWay.value === 'self')

const refundTotal = computed(() =>
  (detail.value?.items || []).reduce(
    (sum, item) => sum + Number(item.refundAmount ?? 0),
    0
  )
)

// 时间线节点：只展示有时间的环节
const TIMELINE = [
  { key: 'createdAt', label: '提交售后申请' },
  { key: 'reviewAt', label: '商家审核通过' },
  { key: 'returnAt', label: '提交退货信息' },
  { key: 'refundAt', label: '商家发起退款' },
  { key: 'refundedAt', label: '退款完成' },
  { key: 'exchangeAt', label: '商家发起换货' },
  { key: 'exchangedAt', label: '换货完成' },
  { key: 'rejectedAt', label: '商家拒绝售后' },
]
const timeline = computed(() =>
  TIMELINE.filter((t) => detail.value?.[t.key]).map((t) => ({
    label: t.label,
    time: detail.value[t.key],
  }))
)

const RETURN_WAY_TEXT = { pickup: '上门取件', self: '自行寄回' }
const TIME_SLOT_TEXT = { morning: '上午 09:00 - 13:00', afternoon: '下午 13:00 - 19:00' }

async function load() {
  loading.value = true
  loadingError.value = ''
  try {
    const [data, consts] = await Promise.all([
      getAfterSaleByOrder(orderId),
      getAfterSaleStatusConstants(),
    ])
    constants.value = consts
    detail.value = data || null
    // 换货退货方式默认值（表单用）
    returnWay.value = ''
    returnTimeSlot.value = ''
    courier.value = ''
    trackingNumber.value = ''
    // 变更记录：失败不影响主流程
    logs.value = []
    if (data?.id) {
      try {
        logs.value = (await getAfterSaleLogs(data.id)) || []
      } catch (e) {
        console.warn('售后变更记录加载失败', e)
      }
    }
  } catch (e) {
    loadingError.value = e?.message || '售后信息加载失败'
  } finally {
    loading.value = false
  }
}

async function submitReturn() {
  if (submitting.value) return
  const way = effectiveReturnWay.value
  if (!way) {
    ElMessage.warning('请选择退货方式')
    return
  }
  if (way === 'pickup' && isExchange.value && !returnTimeSlot.value) {
    ElMessage.warning('请选择取件时段')
    return
  }
  if (way === 'self' && (!courier.value.trim() || !trackingNumber.value.trim())) {
    ElMessage.warning('请填写退货快递公司和单号')
    return
  }

  submitting.value = true
  try {
    await submitAfterSaleReturn(detail.value.id, {
      returnWay: way,
      returnTimeSlot: way === 'pickup' ? returnTimeSlot.value || detail.value.returnTimeSlot : null,
      courier: way === 'self' ? courier.value.trim() : null,
      trackingNumber: way === 'self' ? trackingNumber.value.trim() : null,
    })
    ElMessage.success('退货信息已提交')
    await load()
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

    <template v-else>
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/user/orders' }">我的订单</el-breadcrumb-item>
        <el-breadcrumb-item>售后详情</el-breadcrumb-item>
      </el-breadcrumb>

      <!-- 该订单还没有售后单 -->
      <el-empty v-if="!detail" description="该订单暂无售后记录">
        <el-button type="primary" @click="router.push(`/aftersales/apply/${orderId}`)">
          申请售后
        </el-button>
      </el-empty>

      <template v-else>
        <!-- 状态头部 -->
        <div class="card-block status-head">
          <div class="status-main">
            <el-tag :type="statusType" size="large">{{ detail.statusDesc || detail.status }}</el-tag>
            <span class="status-title">{{ detail.afterSaleTypeDesc || detail.afterSaleType }}</span>
          </div>
          <div class="status-sub">
            售后单号：{{ detail.afterSaleNo }}　原订单号：{{ detail.orderNo }}
          </div>
        </div>

        <!-- 进度 -->
        <div v-if="timeline.length" class="card-block">
          <div class="block-title">处理进度</div>
          <el-timeline>
            <el-timeline-item
              v-for="node in timeline"
              :key="node.label"
              :timestamp="node.time"
              placement="top"
            >
              {{ node.label }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 变更记录（售后流水） -->
        <div v-if="logs.length" class="card-block">
          <div class="block-title">变更记录</div>
          <el-timeline>
            <el-timeline-item
              v-for="log in logs"
              :key="log.id"
              :timestamp="log.createdAt"
              placement="top"
              :type="log.afterStatus === 'rejected' ? 'danger' : 'primary'"
            >
              <div class="log-title">
                {{ log.operateTypeDesc }}
                <span class="log-actor">{{ log.userTypeDesc }}</span>
              </div>
              <div class="log-content">{{ log.content }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 回填退货物流（仅 returning 且未回填） -->
        <div v-if="needSubmitReturn" class="card-block">
          <div class="block-title">提交退货信息</div>
          <el-form label-width="110px" class="aftersale-form">
            <el-form-item v-if="isExchange" label="退货方式" required>
              <el-radio-group v-model="returnWay" @change="returnTimeSlot = ''">
                <el-radio value="pickup">上门取件</el-radio>
                <el-radio value="self">自行寄回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-else label="退货方式">
              <span>{{ RETURN_WAY_TEXT[detail.returnWay] || detail.returnWay || '—' }}</span>
            </el-form-item>

            <el-form-item
              v-if="effectiveReturnWay === 'pickup' && isExchange"
              label="取件时段"
              required
            >
              <el-select v-model="returnTimeSlot" placeholder="请选择取件时段" class="field-select">
                <el-option label="上午 09:00 - 13:00" value="morning" />
                <el-option label="下午 13:00 - 19:00" value="afternoon" />
              </el-select>
            </el-form-item>

            <template v-if="needCourier">
              <el-form-item label="快递公司" required>
                <el-input v-model="courier" maxlength="30" placeholder="如：顺丰速运" />
              </el-form-item>
              <el-form-item label="快递单号" required>
                <el-input v-model="trackingNumber" maxlength="40" placeholder="请输入退货快递单号" />
              </el-form-item>
            </template>

            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="submitReturn">
                提交退货信息
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 售后信息 -->
        <div class="card-block">
          <div class="block-title">售后信息</div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="服务类型">
              {{ detail.afterSaleTypeDesc || detail.afterSaleType }}
            </el-descriptions-item>
            <el-descriptions-item label="售后状态">
              {{ detail.statusDesc || detail.status }}
            </el-descriptions-item>
            <el-descriptions-item label="售后原因">
              {{ detail.reasonDesc || detail.reason || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="货物状态">
              {{ detail.goodsStatusDesc || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">{{ detail.createdAt }}</el-descriptions-item>
            <el-descriptions-item label="实付金额">
              ¥{{ formatPrice(detail.payAmount) }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.returnWay" label="退货方式">
              {{ RETURN_WAY_TEXT[detail.returnWay] || detail.returnWay }}
              <span v-if="detail.returnTimeSlot">
                · {{ TIME_SLOT_TEXT[detail.returnTimeSlot] || detail.returnTimeSlot }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.shipAddress" label="换货收货地址">
              {{ detail.shipAddress }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.courier || detail.returnCourier" label="退货物流">
              {{ detail.returnCourierDesc || detail.returnCourier || detail.courierDesc || detail.courier }}
              <span v-if="detail.returnTrackingNumber || detail.trackingNumber">
                · {{ detail.returnTrackingNumber || detail.trackingNumber }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="买家备注" :span="2">
              {{ detail.remark || '—' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.merchantRemark" label="商家备注" :span="2">
              {{ detail.merchantRemark }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 图片凭证 -->
          <div v-if="detail.images?.length" class="images">
            <el-image
              v-for="(url, index) in detail.images"
              :key="index"
              :src="url"
              :preview-src-list="detail.images"
              :initial-index="index"
              fit="cover"
              class="evidence-img"
            />
          </div>
        </div>

        <!-- 售后商品 -->
        <div class="card-block">
          <div class="block-title">售后商品</div>
          <div class="goods-list">
            <div v-for="(item, index) in detail.items || []" :key="index" class="goods-item">
              <img class="goods-img" :src="item.image" :alt="item.productName" loading="lazy" />
              <div class="goods-info">
                <p class="goods-name">{{ item.productName }}</p>
                <p class="goods-meta">
                  <span>¥{{ formatPrice(item.salesPrice) }}</span>
                  <span>×{{ item.quantity }}</span>
                </p>
              </div>
              <span class="goods-refund">¥{{ formatPrice(item.refundAmount) }}</span>
            </div>
          </div>
          <div class="refund-total">
            退款金额 <strong>¥{{ formatPrice(refundTotal) }}</strong>
          </div>
        </div>

        <div class="submit-bar">
          <el-button @click="router.push(`/user/orders/${orderId}`)">查看订单</el-button>
          <el-button @click="router.push('/user/orders')">返回订单列表</el-button>
        </div>
      </template>
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

/* ===== 内容卡片 ===== */
.card-block {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin: var(--space-md) 0;
}

.block-title {
  margin-bottom: var(--space-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ===== 状态头部 ===== */
.status-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.status-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-sub {
  font-size: 13px;
  color: var(--text-secondary);
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
  flex: 1;
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

.goods-refund {
  font-size: 14px;
  color: var(--text-primary);
}

.refund-total {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--border-color);
  text-align: right;
  font-size: 14px;
  color: var(--text-secondary);
}

.refund-total strong {
  font-size: 18px;
  color: var(--color-primary);
}

/* ===== 凭证图片 ===== */
.images {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.evidence-img {
  width: 88px;
  height: 88px;
  border-radius: var(--radius-sm);
  cursor: zoom-in;
}

/* ===== 表单 ===== */
.aftersale-form {
  max-width: 760px;
}

/* ===== 变更记录 ===== */
.log-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.log-actor {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--bg-hover);
  font-size: 12px;
  font-weight: normal;
  color: var(--text-secondary);
}

.log-content {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.field-select {
  width: 280px;
}

/* ===== 底部按钮 ===== */
.submit-bar {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}
</style>
