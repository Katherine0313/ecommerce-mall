<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElImageViewer } from 'element-plus'
import { Medal, Lightning, Clock, Location, Discount } from '@element-plus/icons-vue'
import { getProduct, getProductTags } from '@/api/product.js'
import { formatPrice } from '@/utils/format.js'
import StoreCard from '@/components/StoreCard.vue'
import Settlement from './Settlement.vue'
import { useCartStore } from '@/stores/cart.js'
import { useUserStore } from '@/stores/user.js'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const cartStore = useCartStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const settlementRef = ref(null)

const loading = ref(true)
const error = ref('')
const product = ref(null)
// 商品标签（C 端只展示 status=1 的标签）
const productTags = ref([])

// 购买数量
const quantity = ref(1)
// 增值保障选中状态（价格按售价百分比算，与后端 insurance_fee 口径一致）
const selectedWarranty = ref(false) // 全面保修 1%
const selectedAccident = ref(false) // 一年意外保 2%
const selectedBattery = ref(false) // 电池无忧 固定 20

const price = computed(() => Number(product.value?.price) || 0)
// 全面保修：售价的 1%
const warrantyFee = computed(() => (price.value * 0.01).toFixed(2))
// 一年意外保：售价的 2%
const accidentFee = computed(() => (price.value * 0.02).toFixed(2))

// 单件保障费合计
const insuranceFee = computed(() => {
  let fee = 0
  if (selectedWarranty.value) fee += Number(warrantyFee.value)
  if (selectedAccident.value) fee += Number(accidentFee.value)
  if (selectedBattery.value) fee += 20
  return fee.toFixed(2)
})

// 合计 = 商品售价 + 单件保障费（金额计算只在后端/展示层，前端不参与下单金额）
const totalPrice = computed(() => (price.value + Number(insuranceFee.value)).toFixed(2))

// 商品参数：后端 specs 是 [{name, value}] 数组，过滤空值
const specsList = computed(() =>
  (product.value?.specs || []).filter((s) => s?.name && s?.value)
)

// 图集：后端 products 表只有单个 image 字段，没有图集数组，
// 这里从 body 富文本里解析出详情图当作图集（淘宝详情页也是把详情图收进图集）
const galleryImages = computed(() => {
  const body = product.value?.body || ''
  const list = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let m
  while ((m = re.exec(body))) {
    const src = m[1].trim()
    // 跳过 base64 内嵌图：体积大，做缩略图会把首屏拖垮
    if (!src || src.startsWith('data:')) continue
    if (!list.includes(src)) list.push(src)
  }
  return list
})

// 图集顺序：主图第一，详情图在后
const allImages = computed(() => {
  const main = product.value?.image
  return main ? [main, ...galleryImages.value] : galleryImages.value
})

// 当前选中的图（缩略图点击切换）
const currentIndex = ref(0)
const currentImage = computed(() => allImages.value[currentIndex.value] || '')

// 缩略图点击放大：打开图片预览器（点遮罩/右上角关闭）
const previewVisible = ref(false)
const previewIndex = ref(0)
function openThumb(i) {
  currentIndex.value = i
  previewIndex.value = i
  previewVisible.value = true
}

const soldOut = computed(() => Number(product.value?.stock ?? 0) <= 0)

// 标签配色：后端 color 约定为 #RRGGBB，异常值回退主题色；背景用 8 位 hex 加透明度
function tagStyle(tag) {
  const color = /^#[0-9a-f]{6}$/i.test(tag.color || '') ? tag.color : '#1890ff'
  return { color, borderColor: color, background: `${color}14` }
}

async function load(id) {
  loading.value = true
  error.value = ''
  product.value = null
  // 切换商品时重置数量、增值保障与图集选中项，避免上一个商品的状态串到当前商品
  quantity.value = 1
  selectedWarranty.value = false
  selectedAccident.value = false
  selectedBattery.value = false
  currentIndex.value = 0
  productTags.value = []
  try {
    // 标签是辅助信息，接口失败不影响商品详情展示
    const [data, tags] = await Promise.all([
      getProduct(id),
      getProductTags(id).catch(() => []),
    ])
    product.value = data
    productTags.value = (tags || []).filter((t) => t.status !== 0)
    // 详情富文本里常嵌多张原图，全量加载会卡住；
    // 给每个 <img> 补 loading="lazy"，浏览器原生懒加载只拉可视区图片
    if (data?.body) {
      data.body = data.body.replace(/<img\b/gi, '<img loading="lazy" ')
    }
  } catch (e) {
    error.value = e?.message || '商品加载失败'
  } finally {
    loading.value = false
  }
}

// 勾选的增值保障明细（单件费用，后端按购买数量放大）
const insuranceDetail = computed(() => {
  const list = []
  if (selectedWarranty.value) list.push({ name: '全面保修', price: Number(warrantyFee.value) })
  if (selectedAccident.value) list.push({ name: '一年意外保', price: Number(accidentFee.value) })
  if (selectedBattery.value) list.push({ name: '电池无忧', price: 20 })
  return list
})

// 购买前校验：售罄 / 未登录（未登录时弹登录框，登录成功继续）
async function canBuy() {
  if (soldOut.value) {
    ElMessage.warning('该商品已售罄')
    return false
  }
  if (!userStore.isLoggedIn) {
    const ok = await authStore.openLogin('login')
    if (!ok) return false
  }
  return true
}

// 加购与立即购买共用：把当前商品（含数量、增值保障）写入购物车
async function addCurrentToCart() {
  await cartStore.addItem(
    product.value,
    quantity.value,
    insuranceDetail.value,
    Number(insuranceFee.value)
  )
}

async function addToCart() {
  if (!(await canBuy())) return
  try {
    await addCurrentToCart()
    ElMessage.success('已加入购物车')
  } catch (e) {
    ElMessage.error(e?.message || '加入购物车失败')
  }
}

// 立即购买：先加购，再直接打开结算弹窗
async function buyNow() {
  if (!(await canBuy())) return
  try {
    await addCurrentToCart()
    settlementRef.value?.open([product.value.id])
  } catch (e) {
    ElMessage.error(e?.message || '下单失败')
  }
}

// 国家补贴活动暂未接入后端，先给提示占位
function claimSubsidy() {
  ElMessage.info('国家补贴活动即将上线')
}

watch(() => route.params.id, load, { immediate: true })
</script>

<template>
  <div class="container">
    <el-skeleton v-if="loading" :rows="8" animated />

    <el-alert v-else-if="error" :title="error" type="error" show-icon :closable="false" />

    <template v-else-if="product">
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/products' }">全部商品</el-breadcrumb-item>
        <el-breadcrumb-item>{{ product.name }}</el-breadcrumb-item>
      </el-breadcrumb>



      <!-- 左右分栏：左侧图与详情，右侧信息面板吸顶 -->
      <div class="detail">
        <div class="main-col">
          <!-- 店铺信息卡片 -->
          <StoreCard />
          <!-- 图集：左侧缩略图列 + 右侧主图（淘宝风格，点主图放大） -->
          <div class="gallery">
            <div v-if="allImages.length > 1" class="thumb-list">
              <button
                v-for="(img, i) in allImages"
                :key="img"
                type="button"
                class="thumb"
                :class="{ active: i === currentIndex }"
                @click="openThumb(i)"
              >
                <img :src="img" :alt="`${product.name} 图 ${i + 1}`" loading="lazy" />
              </button>
            </div>

            <div class="main-img-wrap">
              <el-image
                :src="currentImage"
                :preview-src-list="allImages"
                :initial-index="currentIndex"
                preview-teleported
                hide-on-click-modal
                fit="cover"
                class="main-img"
              >
                <template #error>
                  <div class="img-error">图片加载失败</div>
                </template>
              </el-image>
            </div>
          </div>

          <!-- 缩略图点击后的全屏预览器 -->
          <el-image-viewer
            v-if="previewVisible"
            :url-list="allImages"
            :initial-index="previewIndex"
            hide-on-click-modal
            teleported
            @close="previewVisible = false"
          />

          <!-- 商品参数 -->
          <section v-if="specsList.length" class="block">
            <h2 class="block-title">
              <span class="block-text">商品参数</span>
            </h2>
            <table class="specs-table">
              <tbody>
                <tr v-for="(s, i) in specsList" :key="i">
                  <td class="spec-name">{{ s.name }}</td>
                  <td class="spec-value">{{ s.value }}</td>
                </tr>
              </tbody>
            </table>
          </section>

        </div>

        <!-- 右侧信息面板 -->
        <aside class="side-col">
          <div class="panel">
            <!-- 国家补贴横幅 -->
            <div class="subsidy-banner">
              <div class="subsidy-left">
                <el-icon class="subsidy-icon"><Discount /></el-icon>
                <span>领取国家补贴15%</span>
              </div>
              <el-button class="subsidy-btn" @click="claimSubsidy">立即领取</el-button>
            </div>

            <h1 class="title">{{ product.title || product.name }}</h1>
            <p v-if="product.subTitle" class="sub">{{ product.subTitle }}</p>

            <!-- 商品标签（后台维护，C 端只展示启用的） -->
            <div v-if="productTags.length" class="tag-row">
              <span v-for="tag in productTags" :key="tag.id" class="product-tag" :style="tagStyle(tag)">
                {{ tag.name }}
              </span>
            </div>

            <!-- 价格卡 -->
            <div class="price-box">
              <div class="price-row">
                <span class="price">
                  <span class="price-unit">¥</span>{{ formatPrice(product.price) }}
                </span>
                <span v-if="product.promotionTag" class="promo-tag">{{ product.promotionTag }}</span>
              </div>
              <div v-if="product.originalPrice || product.marketPrice" class="price-sub">
                <span v-if="product.originalPrice" class="origin">
                  活动前 ¥{{ formatPrice(product.originalPrice) }}
                </span>
                <span v-if="product.marketPrice" class="market">
                  市场价 ¥{{ formatPrice(product.marketPrice) }}
                </span>
              </div>
            </div>

            <!-- 基本信息 -->
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">品牌</span>
                <span class="info-value">{{ product.brand || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">规格</span>
                <span class="info-value">官方标配</span>
              </div>
              <div class="info-row">
                <span class="info-label">配送</span>
                <span class="info-value">商家配送，预计 1-3 天送达</span>
              </div>
              <div class="info-row">
                <span class="info-label">库存</span>
                <span class="info-value" :class="{ 'stock-out': soldOut }">
                  {{ soldOut ? '已售罄' : `${product.stock} 件` }}
                </span>
              </div>
            </div>

            <!-- 服务保障 -->
            <div class="assurance-row">
              <span class="assurance-item">
                <el-icon><Medal /></el-icon>
                正品保证
              </span>
              <span class="assurance-item">
                <el-icon><Lightning /></el-icon>
                极速退款
              </span>
              <span class="assurance-item">
                <el-icon><Clock /></el-icon>
                七天无理由
              </span>
              <span class="assurance-item">
                <el-icon><Location /></el-icon>
                全国联保
              </span>
            </div>

            <!-- 数量 -->
            <div class="quantity-row">
              <span class="row-label">数量</span>
              <el-input-number
                v-model="quantity"
                :min="1"
                :max="Math.max(product.stock || 1, 1)"
                :disabled="soldOut"
                size="small"
              />
            </div>

            <!-- 增值保障 -->
            <div class="insurance-section">
              <div class="section-label">增值保障</div>
              <div class="insurance-cards">
                <button
                  type="button"
                  class="insurance-card"
                  :class="{ active: selectedAccident }"
                  :disabled="soldOut"
                  @click="selectedAccident = !selectedAccident"
                >
                  <span class="insurance-name">一年意外保</span>
                  <span class="insurance-price">¥{{ accidentFee }}</span>
                </button>
                <button
                  type="button"
                  class="insurance-card"
                  :class="{ active: selectedWarranty }"
                  :disabled="soldOut"
                  @click="selectedWarranty = !selectedWarranty"
                >
                  <span class="insurance-name">全面保修</span>
                  <span class="insurance-price">¥{{ warrantyFee }}</span>
                </button>
                <button
                  type="button"
                  class="insurance-card"
                  :class="{ active: selectedBattery }"
                  :disabled="soldOut"
                  @click="selectedBattery = !selectedBattery"
                >
                  <span class="insurance-name">电池无忧</span>
                  <span class="insurance-price">¥20</span>
                </button>
              </div>
            </div>

            <!-- 购买按钮 -->
            <div class="buy-row">
              <el-button
                type="primary"
                size="large"
                class="btn-cart"
                :disabled="soldOut"
                @click="addToCart"
              >
                加入购物车
              </el-button>
              <el-button
                size="large"
                class="btn-buy"
                :disabled="soldOut"
                @click="buyNow"
              >
                立即购买
              </el-button>
            </div>

            <div class="total-price">
              合计：<span>¥{{ totalPrice }}</span>
            </div>
          </div>
        </aside>
      </div>
    </template>

    <!-- 立即购买 / 结算弹窗 -->
    <Settlement ref="settlementRef" />
  </div>
</template>

<style scoped>
.breadcrumb {
  height: 26px;
  line-height: 26px;
  font-size: 16px;
}

/* 左右分栏：左侧图与详情（定宽），右侧信息面板自适应 */
.detail {
  display: flex;
  gap: 24px;
  align-items: stretch;
  height:800px;
}

.main-col {
  width: 660px;
  flex-shrink: 0;
}

/* 右侧信息面板：吸顶，滚动详情时始终可见 */
.side-col {
  flex: 1;
  min-width: 0;
  position: sticky;
  top: 76px;
  /* 高度交给 flex stretch 撑满；写死 height:100% 会解析失败并破坏吸顶 */
}

.panel {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== 国家补贴横幅（参考后台 Mall.vue） ===== */
.subsidy-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f0faf4;
  border-radius: 12px;
  padding: 14px 18px;
}

.subsidy-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #333;
}

.subsidy-icon {
  font-size: 20px;
  color: #22bc66;
}

/* 绿色胶囊按钮：覆盖 Element Plus 默认按钮样式 */
.subsidy-btn {
  height: 34px;
  padding: 0 18px;
  font-size: 13px;
  color: #fff;
  background: #22bc66;
  border: none;
  border-radius: 999px;
}

.subsidy-btn:hover {
  color: #fff;
  background: #1da85a;
  border-color: transparent;
}

/* ===== 图集：左侧缩略图列 + 右侧主图（淘宝风格） ===== */
.gallery {
  display: flex;
  gap: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 0 20px;
  margin-bottom: 16px;
}

/* 左侧缩略图列：竖排，超出可滚动 */
.thumb-list {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 460px;
  overflow-y: auto;
}

.thumb {
  width: 64px;
  height: 64px;
  padding: 0;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-page);
  cursor: zoom-in;
  transition: border-color 0.15s;
}

.thumb:hover {
  border-color: var(--color-primary-light);
}

.thumb.active {
  border-color: var(--color-primary);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.main-img-wrap {
  flex: 1;
  min-width: 0;
}

/* 主图：点击放大（el-image 自带灯箱预览） */
.main-img {
  width: 100%;
  /* 固定高度：改这里即可；配 fit="cover" 撑满裁切 */
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.main-img :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
}

.img-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  color: var(--text-placeholder);
  font-size: 13px;
}

.img-tip {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder);
}

/* ===== 标题 ===== */
.title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-primary);
}

.sub {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ===== 商品标签 ===== */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.product-tag {
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  border: 1px solid;
  border-radius: var(--radius-sm);
}

/* ===== 价格卡：红色底图 + 白色价格（参考淘宝价格区） ===== */
.price-box {
  background: url('/image/price-background.webp') center / 100% 100% no-repeat;
  padding: 16px 18px;
  border-radius: var(--radius-md);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price {
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

/* ¥ 符号比数字小一号，淘宝同款排版 */
.price-unit {
  margin-right: 2px;
  font-size: 20px;
  font-weight: 600;
}

/* 促销标签：白底红字，压在红色底图上更醒目 */
.promo-tag {
  padding: 2px 8px;
  font-size: 12px;
  color: #f5362c;
  background: rgba(255, 255, 255, 0.92);
  border-radius: var(--radius-sm);
}

.price-sub {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

/* 活动前原价 / 市场价：白色半透明划线 */
.origin,
.market {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

/* ===== 基本信息 ===== */
.info-card {
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  padding: 12px 0;
}

.info-row {
  display: flex;
  gap: 16px;
  font-size: 13px;
  line-height: 2;
}

.info-label {
  color: var(--text-placeholder);
  width: 40px;
  flex-shrink: 0;
}

.info-value {
  color: var(--text-regular);
}

.stock-out {
  color: var(--color-primary);
}

/* ===== 服务保障 ===== */
.assurance-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
}

.assurance-item {
  position: relative;
  padding-left: 12px;
  font-size: 13px;
  color: var(--text-regular);
}


/* ===== 数量 ===== */
.quantity-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.row-label {
  font-size: 13px;
  color: var(--text-regular);
}

/* ===== 增值保障 ===== */
.section-label {
  font-size: 13px;
  color: var(--text-regular);
  margin-bottom: 8px;
}

.insurance-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.insurance-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 8px;
  background: var(--bg-page);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}

.insurance-card:hover:not(:disabled) {
  border-color: var(--color-primary-light);
}

.insurance-card.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.insurance-card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.insurance-name {
  font-size: 12px;
  color: var(--text-regular);
}

.insurance-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}

/* ===== 购买按钮 ===== */
.buy-row {
  display: flex;
  gap: 12px;
}

.btn-cart {
  flex: 1;
}

.btn-buy {
  flex: 1;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.total-price {
  font-size: 13px;
  color: var(--text-regular);
  text-align: right;
}

.total-price span {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

/* ===== 区块标题（两侧装饰线） ===== */
.block {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 16px;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}


/* ===== 商品参数 ===== */
.specs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.specs-table tr + tr {
  border-top: 1px solid var(--border-light);
}

.spec-name {
  width: 120px;
  padding: 10px 12px;
  color: var(--text-placeholder);
  background: var(--bg-page);
  vertical-align: top;
}

.spec-value {
  padding: 10px 12px;
  color: var(--text-regular);
}

/* ===== 图文详情 ===== */
.detail-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.detail-body :deep(p) {
  line-height: 1.8;
  color: var(--text-regular);
}

@media (max-width: 1024px) {
  .detail {
    flex-direction: column;
  }

  .main-col {
    width: 100%;
  }

  .side-col {
    width: 100%;
    position: static;
  }
}
</style>
