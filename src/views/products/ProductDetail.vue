<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElImageViewer } from 'element-plus'
import { Medal, Lightning, Clock, Location, Discount } from '@element-plus/icons-vue'
import { getProduct, getProductTags } from '@/api/product.js'
import { getProductSubsidy, claimCoupon } from '@/api/coupon.js'
import { formatPrice } from '@/utils/format.js'
import { findSku, isSpecComplete, isValueSelectable, specText } from '@/utils/sku.js'
import { savePendingAction, takePendingAction } from '@/utils/login-action.js'
import StoreCard from '@/components/StoreCard.vue'
import AddCartDialog from '@/components/AddCartDialog.vue'
import Settlement from './Settlement.vue'
import ProductReview from './ProductReview.vue'
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
// 商品评价条数：由 ProductReview 组件加载后透上来，用于 Tab 标题
const reviewTotal = ref(0)
// 详情区 Tab：评价 / 参数 / 详情
const activeTab = ref('reviews')
// 国家补贴横幅：后端没有可领模板时为 null，前端不渲染
const subsidy = ref(null)
const claimingSubsidy = ref(false)

// 购买数量
const quantity = ref(1)
// 增值保障选中状态（可选项由后端按商品属性返回，费用直接用后端算好的）
const selectedInsurance = ref([]) // 已勾选的保障项 code

// ===== 商品规格（淘宝式：详情页内联选择，不走弹窗）=====
// 已选规格：{ 颜色: '曜石黑', 内存: '256G' }
const selectedSpec = ref({})
// 规格维度与 SKU 列表：后端 P1 未上线时为空数组，页面自动按单规格展示
const skuSpecs = computed(() => (Array.isArray(product.value?.skuSpecs) ? product.value.skuSpecs : []))
const skus = computed(() => (Array.isArray(product.value?.skus) ? product.value.skus : []))
const hasSpecs = computed(() => skuSpecs.value.length > 0)
const selectedSku = computed(() => findSku(skus.value, selectedSpec.value, skuSpecs.value))

const price = computed(() => Number(selectedSku.value?.price ?? product.value?.price) || 0)
const marketPrice = computed(() => {
  const sku = selectedSku.value
  if (sku && sku.marketPrice != null) return Number(sku.marketPrice)
  return Number(product.value?.marketPrice) || 0
})

// 图片懒加载 + 全宽显示（body 已清成只剩 <img>，不需要剥参数/段落）
function beautifyBody(html) {
  if (!html) return html
  return html
    .replace(/<img\b/gi, '<img loading="lazy" ')
    .replace(/style=""/g, 'style="width:100%;display:block;"')
}
const currentStock = computed(() => {
  const sku = selectedSku.value
  if (sku && sku.stock != null) return Number(sku.stock)
  return Number(product.value?.stock ?? 0)
})
const selectedSpecText = computed(() => specText(selectedSpec.value, skuSpecs.value))

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
// 评价 Tab 标题带上条数，0 条时不显示数字
const reviewTabLabel = computed(() =>
  reviewTotal.value > 0 ? `商品评价 (${reviewTotal.value})` : '商品评价'
)

// 国家补贴横幅：公共只读，失败就当没有活动，不影响详情加载
async function loadSubsidy(id) {
  try {
    subsidy.value = await getProductSubsidy(id)
  } catch (e) {
    subsidy.value = null
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

// 多规格：只有选全了才判断所选 SKU 的库存；没选全不算售罄
const soldOut = computed(() => {
  if (hasSpecs.value) {
    return selectedSku.value ? Number(selectedSku.value.stock) <= 0 : false
  }
  return Number(product.value?.stock ?? 0) <= 0
})

// 规格值是否可点：当前值始终可点，其余看有没有有货组合
function canSelectValue(groupName, value) {
  if (selectedSpec.value[groupName] === value) return true
  return isValueSelectable(skus.value, selectedSpec.value, groupName, value)
}

// 点规格值：C 端单选，点别的值直接切换
function selectSpec(groupName, value) {
  if (!canSelectValue(groupName, value)) {
    ElMessage.warning('该规格暂时缺货')
    return
  }
  selectedSpec.value = { ...selectedSpec.value, [groupName]: value }
  // 换规格后库存可能变小，数量超了就收到上限
  if (quantity.value > currentStock.value) {
    quantity.value = Math.max(1, currentStock.value)
  }
}

// 多规格必须选全才能加购/下单
function ensureSpecSelected() {
  if (!hasSpecs.value || isSpecComplete(selectedSpec.value, skuSpecs.value)) return true
  const miss = skuSpecs.value.filter((g) => !selectedSpec.value[g.name]).map((g) => g.name)
  ElMessage.warning('请选择 ' + miss.join('、'))
  return false
}

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
  activeTab.value = 'reviews'
  subsidy.value = null
  try {
    // 标签是辅助信息，接口失败不影响商品详情展示
    const [data, tags] = await Promise.all([
      getProduct(id),
      getProductTags(id).catch(() => []),
    ])
    product.value = data
    // 换商品时重置规格选择：只有一个值的维度自动选中
    const specs = Array.isArray(data?.skuSpecs) ? data.skuSpecs : []
    const autoSpec = {}
    specs.forEach((g) => {
      if (Array.isArray(g.values) && g.values.length === 1) autoSpec[g.name] = g.values[0]
    })
    selectedSpec.value = autoSpec
    productTags.value = (tags || []).filter((t) => t.status !== 0)
    // 国家补贴横幅：有模板才显示，没有就整块隐藏
    loadSubsidy(id)
    // 详情富文本里常嵌多张原图，全量加载会卡住；
    // 给每个 <img> 补 loading="lazy"，浏览器原生懒加载只拉可视区图片
    // 同时做一层电商风格美化：卖点标题加粗居中、副标题灰色、参数行拆两列
    if (data?.body) {
      data.body = beautifyBody(data.body)
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
    Number(pending.insuranceFee) || 0,
    {
      skuId: pending.skuId ?? null,
      specJson: pending.specJson || {},
      price: pending.price ?? null,
    }
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
  if (!ensureSpecSelected()) return false
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
      skuId: selectedSku.value?.id ?? null,
      specJson: selectedSpec.value,
      price: selectedSku.value?.price ?? null,
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
    Number(insuranceFee.value),
    {
      skuId: selectedSku.value?.id ?? null,
      specJson: selectedSpec.value,
      price: selectedSku.value?.price ?? null,
    }
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
      // 结算页按购物车行身份匹配：多规格 s{skuId}，单规格 p{productId}
      router.push({
        path: '/checkout',
        query: {
          ids:
            selectedSku.value?.id != null ? `s${selectedSku.value.id}` : `p${product.value.id}`,
        },
      })
    })
    .catch((e) => {
      ElMessage.error(e?.message || '下单失败')
    })
}

// 领取国家补贴：本质是领一张「国家补贴」折扣券，领取后到结算页手动勾选使用
async function claimSubsidy() {
  const item = subsidy.value
  if (!item || claimingSubsidy.value) return
  // 游客先登录，登录后回到本页再点领取
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  claimingSubsidy.value = true
  try {
    await claimCoupon(item.templateId)
    subsidy.value = { ...item, claimed: true }
    ElMessage.success('领取成功，可在结算页选择使用')
  } catch (e) {
    ElMessage.error(e?.message || '领取失败')
  } finally {
    claimingSubsidy.value = false
  }
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

          <!-- 评价 / 参数 / 详情：Tab 切换，默认停在商品评价 -->
          <el-tabs v-model="activeTab" class="block tab-block">
            <!-- 1. 商品评价：抽成独立组件，自取自渲染；条数透上来显示在 Tab 标题 -->
            <el-tab-pane :label="reviewTabLabel" name="reviews">
              <ProductReview :product-id="route.params.id" @update:total="reviewTotal = $event" />
            </el-tab-pane>

            <!-- 2. 商品参数 -->
            <el-tab-pane label="商品参数" name="specs">
              <table v-if="specsList.length" class="specs-table">
                <tbody>
                  <tr v-for="(s, i) in specsList" :key="i">
                    <td class="spec-name">{{ s.name }}</td>
                    <td class="spec-value">{{ s.value }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="tab-empty">暂无参数</div>
            </el-tab-pane>

            <!-- 3. 商品详情：body 富文本；img 的 src 是相对路径 /image/body/xxx，同源直接可用 -->
            <el-tab-pane label="商品详情" name="detail">
              <div v-if="product.body" class="detail-body" v-html="product.body"></div>
              <div v-else class="tab-empty">暂无详情</div>
            </el-tab-pane>
          </el-tabs>

        </div>

        <!-- 右侧信息面板 -->
        <aside class="side-col">
          <div class="panel">
            <!-- 国家补贴横幅：文案来自后台补贴券模板，没有可领模板不渲染 -->
            <div v-if="subsidy" class="subsidy-banner">
              <div class="subsidy-left">
                <el-icon class="subsidy-icon"><Discount /></el-icon>
                <span>{{ subsidy.name }}</span>
              </div>
              <el-button
                class="subsidy-btn"
                :disabled="subsidy.claimed || claimingSubsidy"
                :loading="claimingSubsidy"
                @click="claimSubsidy"
              >
                {{ subsidy.claimed ? '已领取' : '立即领取' }}
              </el-button>
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
                  <span class="price-unit">¥</span>{{ formatPrice(price) }}
                  <span v-if="hasSpecs && !selectedSku" class="price-from">起</span>
                </span>
                <span v-if="product.promotionTag" class="promo-tag">{{ product.promotionTag }}</span>
              </div>
              <div v-if="product.originalPrice || marketPrice" class="price-sub">
                <span v-if="product.originalPrice" class="origin">
                  活动前 ¥{{ formatPrice(product.originalPrice) }}
                </span>
                <span v-if="marketPrice" class="market">
                  市场价 ¥{{ formatPrice(marketPrice) }}
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
            <!-- 规格选择：淘宝式，每维度一行平铺标签；选中红框，缺货置灰 -->
            <div class="spec-section" v-if="hasSpecs">
              <div class="spec-row" v-for="g in skuSpecs" :key="g.name">
                <span class="row-label">{{ g.name }}</span>
                <div class="spec-values">
                  <button
                    type="button"
                    class="spec-chip"
                    v-for="v in g.values"
                    :key="v"
                    :class="{
                      active: selectedSpec[g.name] === v,
                      disabled: !canSelectValue(g.name, v),
                    }"
                    @click="selectSpec(g.name, v)"
                  >
                    {{ v }}
                  </button>
                </div>
              </div>

            </div>

            <!-- 基本信息 -->
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">品牌</span>
                <span class="info-value">{{ product.brand || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">购买方式</span>
                <span class="info-value">官方标配</span>
              </div>
              <div class="info-row">
                <span class="info-label">配送</span>
                <span class="info-value">商家配送，预计 1-3 天送达</span>
              </div>
              <div class="info-row">
                <span class="info-label">库存</span>
                <span class="info-value" :class="{ 'stock-out': soldOut }">
                  {{ soldOut ? '已售罄' : `${currentStock} 件` }}
                </span>
              </div>
            </div>

            <!-- 数量 -->
            <div class="quantity-row">
              <span class="row-label">数量</span>
              <el-input-number
                v-model="quantity"
                :min="1"
                :max="Math.max(currentStock || 1, 1)"
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

    <!-- 窄屏底部固定购买栏（PC 隐藏）：详情页在窄屏是上下堆叠，
         加购/购买按钮在页面中段，滚动到底才能看到，这里固定到屏幕底部 -->
    <div v-if="product && !soldOut" class="mobile-buy-bar">
      <el-button class="mb-cart" size="large" :disabled="soldOut" @click="addToCart">
        加入购物车
      </el-button>
      <el-button class="mb-buy" type="primary" size="large" :disabled="soldOut" @click="buyNow">
        立即购买
      </el-button>
    </div>
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
  top: 20px;
  /* 关键：父容器 align-items:stretch 会把本元素拉到和容器等高，
     吸顶元素与容器等高就没有滚动空间，sticky 形同失效；
     必须 flex-start 让它按内容高度收缩，吸顶才生效 */
  align-self: flex-start;
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

/* 多规格未选全时的「起」字 */
.price-from {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 400;
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

/* ===== 规格选择（淘宝式内联）===== */
.spec-section {
  border-top: 1px solid var(--border-light);
  padding: 12px 0 4px;
}

.spec-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 10px;
}

.spec-row .row-label {
  width: 80px;
  flex-shrink: 0;
  line-height: 30px;
  color: var(--text-placeholder);
}

.spec-values {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 规格标签：选中红框，缺货灰底划线不可点 */
.spec-chip {
  min-width: 54px;
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-regular);
  background: var(--bg-page);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.spec-chip:hover:not(.disabled):not(.active) {
  border-color: var(--color-primary-light);
}

.spec-chip.active {
  color: #ff3b30;
  background: #fff1f0;
  border-color: #ff3b30;
}

.spec-chip.disabled {
  color: var(--text-placeholder);
  opacity: 0.55;
  cursor: not-allowed;
  text-decoration: line-through;
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
  font-size: 14px;
  line-height: 2;
}

.info-label {
  color: var(--text-placeholder);
  width: 80px;
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
  width:80px;
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

/* ===== Tab 区块（评价 / 参数 / 详情） ===== */
.tab-block {
  padding-top: 8px;
}

.tab-block :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.tab-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-placeholder);
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
  display: block;
  margin: 0 auto;
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

/* 窄屏底部固定购买栏：PC 隐藏，窄屏由媒体查询开启 */
.mobile-buy-bar {
  display: none;
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  /* 图集：缩略图列改横向滚动，避免竖排 64px 宽挤掉主图 */
  .gallery {
    flex-direction: column;
    padding: 0 12px;
  }

  .thumb-list {
    width: 100%;
    flex-direction: row;
    max-height: none;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .thumb {
    flex: 0 0 auto;
    scroll-snap-align: start;
  }

  /* 面包屑换行，避免长商品名撑破容器 */
  .breadcrumb {
    font-size: 13px;
    height: auto;
    line-height: 1.6;
    white-space: normal;
  }

  /* 信息面板去掉横向内边距 */
  .panel {
    padding: 0 12px;
  }

  .title {
    font-size: 19px;
  }

  .price {
    font-size: 26px;
  }

  .price-unit {
    font-size: 17px;
  }

  /* 规格标签：行标签在上，标签流式换行 */
  .spec-row {
    flex-direction: column;
    gap: 6px;
  }

  .spec-row .row-label {
    width: auto;
    line-height: 1.6;
  }

  /* 规格/信息行标签不再固定 80px 宽 */
  .info-label,
  .row-label {
    width: auto;
    min-width: 64px;
  }

  .info-row {
    gap: 10px;
  }

  /* 增值保障卡片改 2 列（3 列在窄屏太挤） */
  .insurance-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  /* 区块内边距收紧 */
  .block {
    padding: 16px 12px;
  }

  /* 参数表：窄屏两列挤在一起，改成上下堆叠 */
  .specs-table,
  .specs-table tbody,
  .specs-table tr,
  .specs-table td {
    display: block;
    width: 100%;
  }

  .specs-table tr + tr {
    border-top: 1px solid var(--border-light);
  }

  .spec-name {
    width: 100%;
    padding: 8px 12px 0;
    background: transparent;
    font-weight: 600;
  }

  .spec-value {
    padding: 2px 12px 10px;
  }

  /* 页内购买按钮在窄屏隐藏，统一由底部固定栏承接，避免同一页出现两套加购/购买入口；
     宽屏无固定栏，保留页内按钮正常下单 */
  .buy-row {
    display: none;
  }

  /* 底部固定购买栏：bottom 避开手机浏览器自带工具栏，滚动时不被其遮挡 */
  .mobile-buy-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: var(--browser-ui-bottom, 0px);
    z-index: var(--z-header);
    display: flex;
    gap: 10px;
    padding: 8px calc(12px + var(--safe-right)) calc(8px + var(--safe-bottom))
      calc(12px + var(--safe-left));
    background: #fff;
    border-top: 1px solid var(--border-light);
  }

  .mb-cart,
  .mb-buy {
    flex: 1;
    margin: 0;
  }

  .mb-cart {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  /* 页面底部留白由 DefaultLayout 的 .layout--pad-bottom 统一负责，
     这里不再重复加 padding，否则会多出一段空白 */
}
</style>
