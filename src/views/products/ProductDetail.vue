<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElImageViewer } from 'element-plus'
import { Medal, Lightning, Clock, Location, Discount } from '@element-plus/icons-vue'
import { getProduct, getProductTags } from '@/api/product.js'
import { getProductReviews, getReviewSummary } from '@/api/review.js'
import { formatPrice } from '@/utils/format.js'
import { savePendingAction, takePendingAction } from '@/utils/login-action.js'
import StoreCard from '@/components/StoreCard.vue'
import AddCartDialog from '@/components/AddCartDialog.vue'
import Settlement from './Settlement.vue'
import { useCartStore } from '@/stores/cart.js'
import { useUserStore } from '@/stores/user.js'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()
const addCartDialogRef = ref(null)

const loading = ref(true)
const error = ref('')
const product = ref(null)
// 商品标签（C 端只展示 status=1 的标签）
const productTags = ref([])
// 商品评价：列表 + 统计（公开只读，接口失败不影响详情页其他内容）
const reviewSummary = ref({
  totalCount: 0,
  avgRating: 0,
  goodRate: 0,
  fiveStar: 0,
  fourStar: 0,
  threeStar: 0,
  twoStar: 0,
  oneStar: 0,
})
const reviewList = ref([])
// 是否展开全部评价（默认只显示 3 条）
const reviewExpanded = ref(false)

// 购买数量
const quantity = ref(1)
// 增值保障选中状态（可选项由后端按商品属性返回，费用直接用后端算好的）
const selectedInsurance = ref([]) // 已勾选的保障项 code

const price = computed(() => Number(product.value?.price) || 0)

// 可选增值保障项：后端按商品属性算出（配件类、低价商品返回空数组）
const insuranceOptions = computed(() =>
  (product.value?.insuranceOptions || []).filter((o) => o?.code)
)

// 单件保障费合计
const insuranceFee = computed(() => {
  const total = insuranceOptions.value
    .filter((o) => selectedInsurance.value.includes(o.code))
    .reduce((sum, o) => sum + Number(o.fee || 0), 0)
  return total.toFixed(2)
})

// 合计 = 商品售价 + 单件保障费（金额计算只在后端/展示层，前端不参与下单金额）
const totalPrice = computed(() => (price.value + Number(insuranceFee.value)).toFixed(2))

// 商品参数：后端 specs 是 [{name, value}] 数组，过滤空值
const specsList = computed(() =>
  (product.value?.specs || []).filter((s) => s?.name && s?.value)
)

// ===== 商品评价 =====
const reviewTotal = computed(() => Number(reviewSummary.value.totalCount) || 0)

// 好评率文案：后端 goodRate 是 0~1 的比例
const goodRateText = computed(
  () => `好评率 ${Math.round((Number(reviewSummary.value.goodRate) || 0) * 100)}%`
)

// 星级分布条：每条星级的条数与占比
const scoreBars = computed(() => {
  const s = reviewSummary.value
  const total = reviewTotal.value
  const list = [
    { star: 5, count: Number(s.fiveStar) || 0 },
    { star: 4, count: Number(s.fourStar) || 0 },
    { star: 3, count: Number(s.threeStar) || 0 },
    { star: 2, count: Number(s.twoStar) || 0 },
    { star: 1, count: Number(s.oneStar) || 0 },
  ]
  return list.map((it) => ({
    ...it,
    percent: total ? Math.round((it.count / total) * 100) : 0,
  }))
})

// 默认只展示 3 条，展开后展示全部
const visibleReviews = computed(() =>
  reviewExpanded.value ? reviewList.value : reviewList.value.slice(0, 3)
)

// 评价媒体 JSON：[{"url":"...","type":"image"}]
function parseReviewMedia(images) {
  if (!images) return []
  try {
    const arr = JSON.parse(images)
    return Array.isArray(arr) ? arr.filter((m) => m && m.url) : []
  } catch (e) {
    return []
  }
}

// 拉评价：辅助信息，失败就当没有评价，不影响详情页主体
async function loadReviews(id) {
  const [listRes, summaryRes] = await Promise.all([
    getProductReviews(id, 1, 20).catch(() => null),
    getReviewSummary(id).catch(() => null),
  ])
  reviewList.value = ((listRes && listRes.list) || []).map((item) => {
    const media = parseReviewMedia(item.images)
    // 一条评价最多一个视频：图片进九宫格，视频单独用 <video> 播
    const video = media.find((m) => m.type === 'video')
    return {
      ...item,
      // 后端给的是 yyyy-MM-dd HH:mm:ss，详情页只展示到天
      createdAt: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
      media: media.filter((m) => m.type !== 'video'),
      videoUrl: video ? video.url : '',
    }
  })
  if (summaryRes) {
    reviewSummary.value = summaryRes
  }
}

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
  selectedInsurance.value = []
  currentIndex.value = 0
  productTags.value = []
  reviewList.value = []
  reviewExpanded.value = false
  reviewSummary.value = {
    totalCount: 0,
    avgRating: 0,
    goodRate: 0,
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  }
  try {
    // 标签是辅助信息，接口失败不影响商品详情展示
    const [data, tags] = await Promise.all([
      getProduct(id),
      getProductTags(id).catch(() => []),
    ])
    product.value = data
    productTags.value = (tags || []).filter((t) => t.status !== 0)
    // 评价同样是辅助信息，失败不打断详情加载
    loadReviews(id)
    // 详情富文本里常嵌多张原图，全量加载会卡住；
    // 给每个 <img> 补 loading="lazy"，浏览器原生懒加载只拉可视区图片
    if (data?.body) {
      data.body = data.body.replace(/<img\b/gi, '<img loading="lazy" ')
    }
    // 从登录页跳回来的：把登录前记下的加购操作补上
    resumePendingAddCart(id)
  } catch (e) {
    error.value = e?.message || '商品加载失败'
  } finally {
    loading.value = false
  }
}

// 登录页跳回来后，自动把登录前记下的加购操作补上
// （登录页是独立路由，跳过去再跳回来时原来的点击意图会丢，所以先记在 sessionStorage）
function resumePendingAddCart(currentId) {
  const pending = takePendingAction()
  if (!pending || pending.type !== 'addCart') return
  // 只处理当前商品，避免误加别的商品
  if (pending.productId !== currentId) return
  cartStore.addItem(
    product.value,
    pending.quantity || 1,
    pending.insuranceDetail || [],
    Number(pending.insuranceFee) || 0
  )
    .then(() => {
      ElMessage.success('已加入购物车')
    })
    .catch((e) => {
      ElMessage.error(e?.message || '加入购物车失败')
    })
}

// 勾选的增值保障明细（单件费用，后端按购买数量放大）
// 字段与小程序保持一致：{ code, name, fee }
const insuranceDetail = computed(() =>
  insuranceOptions.value
    .filter((o) => selectedInsurance.value.includes(o.code))
    .map((o) => ({ code: o.code, name: o.name, fee: Number(o.fee) }))
)

// 购买前校验：售罄 / 未登录
// 未登录：记下「登录后要加购的商品」，跳登录页，登录成功跳回来自动加购
function canBuy() {
  if (soldOut.value) {
    ElMessage.warning('该商品已售罄')
    return false
  }
  if (!userStore.isLoggedIn) {
    savePendingAction({
      type: 'addCart',
      productId: product.value.id,
      quantity: quantity.value,
      insuranceDetail: insuranceDetail.value,
      insuranceFee: Number(insuranceFee.value),
    })
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return false
  }
  return true
}

// 点卡片切换保障项勾选
function toggleInsurance(code) {
  const index = selectedInsurance.value.indexOf(code)
  if (index > -1) {
    selectedInsurance.value.splice(index, 1)
  } else {
    selectedInsurance.value.push(code)
  }
}

// 加购与立即购买共用：把当前商品（含数量、增值保障）写入购物车
function addCurrentToCart() {
  return cartStore.addItem(
    product.value,
    quantity.value,
    insuranceDetail.value,
    Number(insuranceFee.value)
  )
}

function addToCart() {
  if (!canBuy()) return
  addCurrentToCart()
    .then(() => {
      // 加购成功弹窗（淘宝同款：绿色对勾 + 提示 + 去购物车/继续购物）
      addCartDialogRef.value?.open()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '加入购物车失败')
    })
}

// 立即购买：先加购，再跳独立结算页
function buyNow() {
  if (!canBuy()) return
  addCurrentToCart()
    .then(() => {
      router.push({ path: '/checkout', query: { ids: String(product.value.id) } })
    })
    .catch((e) => {
      ElMessage.error(e?.message || '下单失败')
    })
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
        <el-breadcrumb-item :to="{ name: 'products' }">全部商品</el-breadcrumb-item>
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

          <!-- 商品评价：放在商品参数之前（先给结论：评分/好评率），默认只展示 3 条 -->
          <section v-if="reviewTotal > 0" class="block review-block">
            <h2 class="block-title">
              <span class="block-text">商品评价</span>
              <span class="block-extra">{{ reviewTotal }} 条</span>
            </h2>

            <div class="review-summary">
              <div class="review-score">
                <span class="score-num">{{ reviewSummary.avgRating }}</span>
                <span class="score-label">平均分</span>
                <span class="score-good">{{ goodRateText }}</span>
              </div>
              <div class="score-bars">
                <div v-for="item in scoreBars" :key="item.star" class="score-bar">
                  <span class="bar-label">{{ item.star }}星</span>
                  <span class="bar-track">
                    <span class="bar-fill" :style="{ width: item.percent + '%' }"></span>
                  </span>
                  <span class="bar-count">{{ item.count }}</span>
                </div>
              </div>
            </div>

            <div class="review-list">
              <div v-for="item in visibleReviews" :key="item.id" class="review-item">
                <div class="review-item-head">
                  <span class="review-user">{{ item.userName }}</span>
                  <span class="review-time">{{ item.createdAt }}</span>
                </div>
                <div class="review-stars">
                  <el-rate :value="item.rating" disabled size="small" />
                  <span v-if="item.tag" class="review-tag">{{ item.tag }}</span>
                  <span v-if="item.isVirtual === 1" class="review-virtual">系统评价</span>
                </div>
                <p class="review-content">{{ item.content }}</p>
                <div v-if="item.media.length" class="review-media">
                  <el-image
                    v-for="(m, idx) in item.media"
                    :key="idx"
                    :src="m.url"
                    :preview-src-list="item.media.map((x) => x.url)"
                    :initial-index="idx"
                    preview-teleported
                    hide-on-click-modal
                    fit="cover"
                    class="review-media-item"
                  />
                </div>
                <!-- 评价视频：一条评价最多一个视频，单独一行播放器 -->
                <video v-if="item.videoUrl" class="review-video-player" :src="item.videoUrl"
                       controls preload="none" object-fit="contain" />
                <div v-if="item.reply" class="review-reply">
                  <span class="reply-label">商家回复：</span>{{ item.reply }}
                </div>
              </div>
            </div>

            <div v-if="reviewTotal > 3" class="review-more" @click="reviewExpanded = !reviewExpanded">
              {{ reviewExpanded ? '收起评价' : '查看全部评价' }}
            </div>
          </section>

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

          <!-- 图文详情：body 富文本；img 的 src 是相对路径 /image/body/xxx，同源直接可用 -->
          <section v-if="product.body" class="block detail-block">
            <h2 class="block-title">
              <span class="block-text">图文详情</span>
            </h2>
            <div class="detail-body" v-html="product.body"></div>
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

            <!-- 增值保障：可选项由后端按商品属性返回（配件类、低价商品后端不返回，整块不显示） -->
            <div class="insurance-section" v-if="insuranceOptions.length">
              <div class="section-label">增值保障</div>
              <div class="insurance-cards">
                <button
                  type="button"
                  class="insurance-card"
                  v-for="opt in insuranceOptions"
                  :key="opt.code"
                  :class="{ active: selectedInsurance.includes(opt.code) }"
                  :disabled="soldOut"
                  @click="toggleInsurance(opt.code)"
                >
                  <span class="insurance-name">{{ opt.name }}</span>
                  <span class="insurance-price">¥{{ opt.fee }}</span>
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
    <!-- 结算已改为独立页面（/checkout），这里不再挂弹窗 -->

    <!-- 加入购物车成功弹窗 -->
    <AddCartDialog ref="addCartDialogRef" />
  </div>
</template>

<style scoped>
.breadcrumb {
  margin-top:20px;
  height: 26px;
  line-height: 26px;
  font-size: 16px;
}

/* 左右分栏：左侧图与详情（定宽），右侧信息面板自适应 */
.detail {
  display: flex;
  gap: 24px;
  align-items: stretch;
  /* 用 min-height 而不是 height：内容比 800px 高时容器自动长高，
     写死 height 会让内容溢出容器，页脚会盖到溢出内容上（页脚「跑上去」） */
  min-height: 800px;
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


/* ===== 商品评价 ===== */
.block-extra {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-placeholder);
}

.review-summary {
  display: flex;
  align-items: center;
  padding-bottom: 20px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}

.review-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
  flex-shrink: 0;
}

.score-num {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  color: #ff5722;
}

.score-label {
  font-size: 12px;
  color: var(--text-placeholder);
}

.score-good {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-regular);
}

.score-bars {
  flex: 1;
  padding-left: 16px;
}

.score-bar {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.bar-label {
  width: 36px;
  font-size: 12px;
  color: var(--text-placeholder);
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg-page);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  background: #ff5722;
}

.bar-count {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--text-placeholder);
  flex-shrink: 0;
}

.review-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
}

.review-item:last-child {
  border-bottom: none;
}

.review-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-user {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.review-time {
  font-size: 12px;
  color: var(--text-placeholder);
}

.review-stars {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.review-tag {
  font-size: 12px;
  color: #ff5722;
}

.review-virtual {
  font-size: 12px;
  color: var(--text-placeholder);
  background: var(--bg-page);
  border-radius: 4px;
  padding: 1px 6px;
}

.review-content {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-regular);
}

.review-media {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.review-media-item {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}

/* 评价视频播放器：宽度撑满，高度按 16:9 */
.review-video-player {
  display: block;
  width: 100%;
  max-width: 420px;
  margin-top: 10px;
  border-radius: 6px;
  background: #f5f5f5;
}

.review-reply {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--bg-page);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-regular);
}

.reply-label {
  font-weight: 600;
  color: var(--text-primary);
}

.review-more {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: #ff5722;
  cursor: pointer;
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
    /* 竖排时两栏上下堆叠，总高度远超 800px，必须放开高度让内容撑开 */
    height: auto;
  }

  .main-col {
    width: 100%;
    /* 窄屏下主图别铺满整屏：限制最大宽度并居中 */
    max-width: 680px;
    margin: 0 auto;
  }

  /* 主图限高兜底：限在 img 上并用 contain，避免 el-image 的 overflow 把图裁掉 */
  .main-img :deep(img) {
    max-height: 520px;
    object-fit: contain;
  }

  .side-col {
    width: 100%;
    position: static;
  }
}
</style>
