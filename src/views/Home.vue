<script setup>
import {ref, computed, onMounted, onBeforeUnmount, nextTick} from 'vue'
import {useRouter} from 'vue-router'
import {
  Iphone, Monitor, Cellphone, Headset, Watch, Camera, Box, House, Goods,
} from '@element-plus/icons-vue'
import {getHome} from '@/api/home'
import {getProducts} from '@/api/product'
import {getBanners, reportBannerBrowse} from '@/api/banner'
import ProductCard from '@/components/ProductCard.vue'
import aiAvatar from '@/assets/ai-avatar.webp'

const router = useRouter()

// 悬浮 AI 客服入口：仅首页展示，点击进全屏 AI 对话页（未登录由路由守卫带去登录并回跳）
function goAiChat() {
  // 如果刚刚完成了一次拖拽，吞掉这次 click（拖动不是点击）
  if (suppressClick) {
    suppressClick = false
    return
  }
  router.push('/ai-chat')
}

/* ===== 悬浮按钮拖拽（手机端固定 + 可拖动 + 松手吸附边界） ===== */
const aiFloatStyle = ref({})       // 动态写入 left/top
const isDragging = ref(false)
let dragStartX = 0, dragStartY = 0
let btnStartLeft = 0, btnStartTop = 0
let dragMoved = false
let savedSwipe = ''                // 记录按下前的 touch-action，拖动时禁用
let suppressClick = false          // 拖动结束后抑制一次 click
const EDGE_MARGIN = 12             // 吸附距边距离（px）
const DRAG_THRESHOLD = 5           // 拖动超过多少 px 才算拖动（避免点击误触）
let btnRect = null

const floatRef = ref(null)

function onDragStart(e) {
  const evt = e.touches ? e.touches[0] : e
  dragStartX = evt.clientX
  dragStartY = evt.clientY
  isDragging.value = true
  dragMoved = false

  const btn = floatRef.value
  if (btn) {
    btnRect = btn.getBoundingClientRect()
    btnStartLeft = btnRect.left
    btnStartTop = btnRect.top
    savedSwipe = btn.style.touchAction || ''
    btn.style.touchAction = 'none'
  }

  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  window.addEventListener('touchmove', onDragMove, {passive: false})
  window.addEventListener('touchend', onDragEnd)
  window.addEventListener('touchcancel', onDragEnd)
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

function onDragMove(e) {
  if (!isDragging.value || !btnRect) return
  if (e.cancelable) e.preventDefault()

  const evt = e.touches ? e.touches[0] : e
  const dx = evt.clientX - dragStartX
  const dy = evt.clientY - dragStartY

  if (!dragMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
    return
  }
  dragMoved = true

  const maxLeft = window.innerWidth - btnRect.width - EDGE_MARGIN
  const maxTop = window.innerHeight - btnRect.height - EDGE_MARGIN

  const newLeft = clamp(btnStartLeft + dx, EDGE_MARGIN, maxLeft)
  const newTop = clamp(btnStartTop + dy, EDGE_MARGIN, maxTop)

  aiFloatStyle.value = {
    left: newLeft + 'px',
    top: newTop + 'px',
    right: 'auto',
    bottom: 'auto',
  }
}

function onDragEnd() {
  if (!isDragging.value) return
  isDragging.value = false

  const btn = floatRef.value
  if (btn) btn.style.touchAction = savedSwipe

  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('touchmove', onDragMove)
  window.removeEventListener('touchend', onDragEnd)
  window.removeEventListener('touchcancel', onDragEnd)

  // 拖动距离不够：不算拖动，保持当前位置，不抑制 click。
  // 注意不能清空 aiFloatStyle：手机端按钮靠 right/bottom 固定在右下角，
  // 清空后会退回 static 位置，手指抬起时按钮已不在原地，合成 click 就点不到它了。
  if (!dragMoved) {
    suppressClick = false
    return
  }

  // 吸附到最近的左右边界
  const rect = btn.getBoundingClientRect()
  const midX = window.innerWidth / 2
  const snapLeft = rect.left + rect.width / 2 < midX
      ? EDGE_MARGIN
      : window.innerWidth - rect.width - EDGE_MARGIN

  const snappedTop = clamp(rect.top, EDGE_MARGIN, window.innerHeight - rect.height - EDGE_MARGIN)

  aiFloatStyle.value = {
    left: snapLeft + 'px',
    top: snappedTop + 'px',
    right: 'auto',
    bottom: 'auto',
  }

  // 标记：下一次 click 是拖动的尾巴，吞掉。
  // 部分手机浏览器拖完不派发 click，定时清掉，避免吞掉下一次正常点击。
  suppressClick = true
  setTimeout(() => {
    suppressClick = false
  }, 350)
}

// 首页轮播图：优先用后台配置的 Banner（position=11）；
// 后台没配时回落到 public/swiper 下的静态图，保证首页不至于空白
// categoryName：按分类名匹配首页分类树（含子串匹配，如「配件」命中「数码配件」），
// 点击后进该分类的商品列表页
const FALLBACK_BANNERS = [
  {src: '/swiper/swiper1.webp', alt: '手机', categoryName: '手机'},
  {src: '/swiper/swiper2.webp', alt: '电脑', categoryName: '电脑'},
  {src: '/swiper/swiper3.webp', alt: '相机', categoryName: '相机'},
  {src: '/swiper/swiper4.webp', alt: '配件', categoryName: '配件'},
]
const banners = ref([])

// 兜底轮播的跳转：按分类名在分类树里找 id；找不到就去商品列表页
function resolveCategoryLink(name) {
  const exact = categories.value.find((c) => c.name === name)
  const fuzzy = categories.value.find((c) => c.name?.includes(name))
  const category = exact || fuzzy
  return category ? `/category/${category.id}` : '/products-list'
}

// 实际渲染的轮播：后台有配置用后台的，否则用按分类解析过链接的兜底图。
// 做成 computed，分类树晚于轮播到达时链接也能正确更新
const displayBanners = computed(() =>
    banners.value.length
        ? banners.value
        : FALLBACK_BANNERS.map((b) => ({...b, link: resolveCategoryLink(b.categoryName)}))
)

// Banner 跳转：商品 → 商品详情，文章 → 文章详情，外部链接 → 原地址
function bannerLink(b) {
  if (b.linkType === 1) return `/product/${b.linkValue}`
  if (b.linkType === 2) return `/article/${b.linkValue}`
  if (b.linkType === 3) return b.linkValue
  return ''
}

function loadBanners() {
  getBanners(11)
      .then((list) => {
        const arr = list || []
        // 一条 Banner 最多 4 张图：展开成多个轮播项，images 为空时回落到单图 image
        // 后台没配时保持空数组，模板走 displayBanners 的兜底轮播
        banners.value = arr.length
            ? arr.flatMap((b) => {
              const urls = Array.isArray(b.images) && b.images.length ? b.images : [b.image]
              return urls
                  .filter(Boolean)
                  .map((src) => ({id: b.id, src, alt: b.title || '', link: bannerLink(b)}))
            })
            : []
      })
      .catch(() => {
        banners.value = []
      })
}

// 点击统计：后台能看每张 Banner 的点击量
function handleBannerClick(b) {
  if (b.id) reportBannerBrowse(b.id).catch(() => {
  })
}

// 猜你喜欢模块：6 行 × 6 列 = 36 个商品为 1 页
const PAGE_SIZE = 40

// 首页聚合接口：一次拿到「分类树 + 猜你喜欢」，首屏只发一个请求
const categories = ref([])

// 父级分类图标：按分类名映射，新增的分类未命中时用通用图标兜底
const CATEGORY_ICONS = {
  手机: Iphone,
  电脑: Monitor,
  平板: Cellphone,
  耳机音箱: Headset,
  手表: Watch,
  相机: Camera,
  数码配件: Box,
  智能家居: House,
}
const categoryIcon = (c) => CATEGORY_ICONS[c.name] || Goods

// 合并后的商品流：recommend 优先置顶，其余商品去重后按原顺序补齐
const productFlow = ref([])
const page = ref(1)
// 右侧促销位：4 张固定图片（后端 /image/side-bar/ 目录托管，点击进商品列表）
const sideBars = [
  {src: '/image/side-bar/side-bar1.webp', alt: '促销活动 1'},
  {src: '/image/side-bar/side-bar2.webp', alt: '促销活动 2'},
  {src: '/image/side-bar/side-bar3.webp', alt: '促销活动 3'},
  {src: '/image/side-bar/side-bar4.webp', alt: '促销活动 4'},
]

const loading = ref(true)
const error = ref('')

const totalProducts = computed(() => productFlow.value.length)
const totalPages = computed(() => Math.ceil(totalProducts.value / PAGE_SIZE))
const pageProducts = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return productFlow.value.slice(start, start + PAGE_SIZE)
})

onMounted(async () => {
  // 轮播图与下面两个接口互不依赖，任一失败不影响其余渲染
  loadBanners()

  // 两个接口互不依赖，任一失败不影响其余渲染
  const [homeRes, allRes] = await Promise.allSettled([
    getHome(12),
    // 一次拉全量上架商品（后端 SQL 有 LIMIT 200，商品数超出会被截断）
    getProducts(),
  ])

  let recommendIds = new Set()
  if (homeRes.status === 'fulfilled') {
    categories.value = homeRes.value?.categories || []
    const recommend = homeRes.value?.recommend || []
    recommendIds = new Set(recommend.map((p) => p.id))
  } else {
    error.value = homeRes.reason?.message || '首页数据加载失败'
  }

  if (allRes.status === 'fulfilled') {
    const all = allRes.value || []
    // recommend 置顶，其余商品去掉已在 recommend 里的，避免重复展示
    const rest = all.filter((p) => !recommendIds.has(p.id))
    productFlow.value = [...(homeRes.status === 'fulfilled' ? homeRes.value?.recommend || [] : []), ...rest]
  }

  loading.value = false

  // 手机端：初始化悬浮按钮到固定位置（右下角）
  await nextTick()
  const btn = floatRef.value
  if (btn) {
    const r = btn.getBoundingClientRect()
    // 仅当当前是手机端（屏幕窄）时才写入固定定位
    if (window.innerWidth <= 768) {
      aiFloatStyle.value = {
        right: EDGE_MARGIN + 'px',
        bottom: '80px',  // 避开底部 Tab
        top: 'auto',
        left: 'auto',
      }
    }
  }
})

// 离开页面时清理 window 上可能残留的事件监听
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('touchmove', onDragMove)
  window.removeEventListener('touchend', onDragEnd)
  window.removeEventListener('touchcancel', onDragEnd)
})
</script>

<template>
  <div class="container">
    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert v-else-if="error" :title="error" type="error" show-icon :closable="false" />

    <template v-else>
      <!-- 主体容器：左侧分类栏 + 中间轮播 + 右侧促销位 -->
      <div class="hero">
        <!-- 左侧：商品分类（一级分类 + hover 展开二级分类） -->
        <div class="side-bar l">
          <div class="side-title">商品分类</div>
          <ul class="cat-list">
            <li
                v-for="c in categories"
                :key="c.id"
                class="cat-item"
            >
              <router-link :to="`/category/${c.id}`" class="cat-link">
                <!-- 父分类图标（Element Plus 图标集） -->
                <el-icon class="cat-icon">
                  <component :is="categoryIcon(c)" />
                </el-icon>
                <span class="cat-name">{{ c.name }}</span>
                <!-- 有子分类才给展开箭头（淘宝同款） -->
                <span v-if="c.children?.length" class="cat-arrow">›</span>
              </router-link>

              <!-- hover 浮出的二级分类面板：绝对定位，不挤压轮播图 -->
              <div v-if="c.children?.length" class="sub-panel">
                <div class="sub-head">{{ c.name }}</div>
                <div class="sub-list">
                  <router-link
                      v-for="s in c.children"
                      :key="s.id"
                      :to="`/category/${s.id}`"
                      class="sub-item"
                  >
                    {{ s.name }}
                  </router-link>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 中间：Banner 轮播 -->
        <div class="banner">
          <div class="banner-wrap">
            <el-carousel class="banner-carousel" height="100%" :interval="5000" arrow="hover">
              <el-carousel-item v-for="(b, i) in displayBanners" :key="i">
                <!-- 站内跳转走 router-link，外部链接用 a 标签新窗口打开 -->
                <router-link v-if="b.link && b.link.startsWith('/')" :to="b.link" class="banner-link"
                             @click="handleBannerClick(b)">
                  <img :src="b.src" :alt="b.alt" :loading="i === 0 ? 'eager' : 'lazy'" />
                </router-link>
                <a v-else-if="b.link" :href="b.link" target="_blank" rel="noopener" class="banner-link"
                   @click="handleBannerClick(b)">
                  <img :src="b.src" :alt="b.alt" :loading="i === 0 ? 'eager' : 'lazy'" />
                </a>
                <div v-else class="banner-link">
                  <img :src="b.src" :alt="b.alt" :loading="i === 0 ? 'eager' : 'lazy'" />
                </div>
              </el-carousel-item>
            </el-carousel>
          </div>
        </div>

        <!-- 右侧：促销位（4 张固定图片） -->
        <div class="side-bar r">
          <router-link
              v-for="(s, i) in sideBars"
              :key="s.src"
              to="/products-list"
              class="side-img-link"
          >
            <img :src="s.src" :alt="s.alt" :loading="i === 0 ? 'eager' : 'lazy'" />
          </router-link>
        </div>
      </div>

      <!-- 猜你喜欢：recommend 优先置顶，其余全量商品补齐，6 行 6 列一页 -->
      <div class="product-section">
        <h2 class="section-title guess-title">
          <span class="title-line"></span>
          <span class="title-dot"></span>
          <span class="title-text">猜你喜欢</span>
          <span class="title-dot"></span>
          <span class="title-line"></span>
        </h2>
        <div v-if="pageProducts.length" class="guess-grid">
          <ProductCard v-for="p in pageProducts" :key="p.id" :product="p" />
        </div>
        <el-empty v-else description="暂无推荐商品" />

        <!-- 首页专属悬浮 AI 客服入口：其它页面不挂；手机端固定+可拖动 -->
        <button
            ref="floatRef"
            type="button"
            class="ai-float"
            :class="{'is-dragging': isDragging}"
            :style="aiFloatStyle"
            aria-label="AI 客服"
            @mousedown="onDragStart"
            @touchstart="onDragStart"
            @click="goAiChat"
        >
          <img class="ai-float-avatar" :src="aiAvatar" alt="" />
          <span class="ai-float-text">AI 客服</span>
        </button>
        <!-- 分页：6 行 6 列 = 36 个商品一页 -->
        <div v-if="totalPages > 1" class="guess-pager">
          <el-pagination
              layout="prev, pager, next, total"
              background
              :total="totalProducts"
              :page-size="PAGE_SIZE"
              :current-page="page"
              @current-change="(p) => (page = p)"
          />
        </div>
      </div>

    </template>

  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 10px;
}

/* 三栏主体：左右侧栏固定 250px，中间轮播图自适应 */
.container .hero {
  display: flex;
  gap: 16px;
  /* 不写死高度：让轮播图按 2:1 比例撑开这一行，两侧侧栏跟着等高 */
  align-items: stretch;
  margin-top: 20px;
  height: 350px;
}

.side-bar {
  width: 250px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-radius: var(--radius-md);
}

/* 分类栏不能加 overflow:hidden —— 会把 hover 出来的二级分类浮层裁掉 */
.side-bar.l {
  position: relative;
}

.side-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0 16px 8px;
  border-bottom: 1px solid var(--border-light);
}

.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cat-item {
  position: relative;
}

.cat-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-regular);
  transition: background 0.15s, color 0.15s;
}

.cat-link:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

/* 父分类图标：与文字同色，hover 跟随主题色 */
.cat-icon {
  font-size: 15px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color 0.15s;
}

.cat-link:hover .cat-icon {
  color: var(--color-primary);
}

.cat-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 可展开的分类右侧给个箭头 */
.cat-arrow {
  font-size: 15px;
  line-height: 1;
  color: var(--text-placeholder);
}

/* ===== hover 展开的二级分类浮层（淘宝式） ===== */
.sub-panel {
  position: absolute;
  top: -6px;
  left: 100%;
  z-index: 20;
  width: 420px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  /* 默认透明且不可交互，hover 时淡入并向左滑出 */
  opacity: 0;
  visibility: hidden;
  transform: translateX(-8px);
  pointer-events: none;
  transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s;
}

/* 与分类栏之间的隐形连接区：鼠标斜向移入浮层不会中途掉出 hover */
.sub-panel::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 0;
  bottom: 0;
  width: 12px;
}

.cat-item:hover .sub-panel {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
  pointer-events: auto;
}

/* 当前 hover 的父分类与浮层呼应：行高亮加粗，箭头变主色 */
.cat-item:hover > .cat-link {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.cat-item:hover > .cat-link .cat-arrow {
  color: var(--color-primary);
}

.sub-head {
  font-size: 13px;
  color: var(--text-placeholder);
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.sub-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.sub-item {
  padding: 4px 10px;
  font-size: 13px;
  color: var(--text-regular);
  border-radius: var(--radius-sm);
  transition: background 0.15s, color 0.15s;
}

.sub-item:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

/* ===== 中间轮播图 ===== */
.banner {
  flex: 1;
  min-width: 0;
}

/* 外层高度跟随 hero 容器（flex 拉伸），轮播与图片依次 100% 铺满，
   图片用 object-fit: cover 裁切，保持画面填满不拉伸 */
.banner-wrap {
  height: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.banner-carousel {
  height: 100%;
}

.banner-link {
  display: block;
  width: 100%;
  height: 100%;
}

.banner-link img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ===== 右侧促销位：4 张 16:9 图片竖排 ===== */
.side-bar.r {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-img-link {
  display: block;
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}

.side-img-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.side-img-link img {
  display: block;
  width: 100%;
  /* 固定高度：4 张等高，改这里即可；120px 时右栏总高约 530px */
  height: 80px;
  object-fit: cover;
  background: var(--bg-page);
}

/* ===== 猜你喜欢标题：左右渐变装饰线 + 圆点（与小程序 Guess.vue 同款） ===== */
.guess-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: var(--space-lg) 0 var(--space-md);
}

/* 左右渐变装饰线：从透明过渡到品牌橙，指向标题 */
.title-line {
  width: 120px;
  height: 2px;
  background: linear-gradient(to right, transparent, var(--color-primary));
}

/* 右边那条反向渐变，让两端都从透明开始 */
.title-line:last-child {
  background: linear-gradient(to left, transparent, var(--color-primary));
}

/* 标题两侧的小圆点 */
.title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}

.title-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ===== 猜你喜欢商品网格：固定 6 列，一页 6 行 ===== */
.guess-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-md);
}

.guess-pager {
  display: flex;
  justify-content: center;
  margin: var(--space-lg) 0 var(--space-xl);
}

/* ===== 悬浮 AI 客服入口（仅首页） ===== */
.product-section {
  position: relative;
}

.ai-float {
  position: absolute;
  top: 100px;
  right: -130px;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px 8px 8px;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.ai-float:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
}

.ai-float-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.ai-float-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

/* 窄屏逐级降列 */
@media (max-width: 1200px) {
  .guess-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 992px) {
  .guess-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  /* 悬浮按钮固定在视口上，不随页面滚动；可 JS 拖拽覆盖位置 */
  .ai-float {
    position: fixed !important;
    z-index: 999;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
  }

  .ai-float.is-dragging {
    cursor: grabbing;
    transition: none;
  }

  .ai-float-avatar {
    width: 36px;
    height: 36px;
  }

  .ai-float-text {
    font-size: 13px;
  }

  .guess-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  /* ===== 主体改竖排：轮播 → 分类 → 促销位 ===== */
  /* 选择器必须带 .container，优先级(0,2,0) 才能覆盖上面的 .container .hero，
     否则 height:350px 仍然生效，内容被 overflow:hidden 裁掉 */
  .container .hero {
    flex-direction: column;
    height: auto; /* 小屏取消固定高度，高度由内容撑开 */
    overflow: visible; /* 不裁剪二级分类浮层 */
    gap: 12px;
  }

  /* 轮播：改固定比例，高度由宽度撑开（原来靠 hero 的 350px 撑） */
  .banner {
    width: 100%;
    flex: none;
  }

  .banner-wrap {
    aspect-ratio: 2 / 1;
    height: auto;
    box-shadow: var(--shadow-sm);
  }

  /* ===== 分类栏：小屏只保留一级分类横滑一行，二级分类不进首页 ===== */
  .side-bar.l {
    width: 100%;
    /* 小屏分类栏占满整行 */
  }

  /* 一级分类：竖排改成横滑，8 个分类一屏放不下 */
  .cat-list {
    display: flex;
    gap: var(--space-sm);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 8px;
  }

  .cat-list::-webkit-scrollbar {
    display: none;
  }

  .cat-item {
    flex: 0 0 auto;
    scroll-snap-align: start;
  }

  .cat-link {
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 68px;
    padding: 8px 4px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    text-align: center;
  }

  .cat-icon {
    font-size: 20px;
  }

  .cat-name {
    flex: none;
    white-space: normal;
    line-height: 1.3;
  }

  /* 箭头在竖排布局里没意义了 */
  .cat-arrow {
    display: none;
  }

  /* 二级分类在窄屏不展示，首页只保留一级分类入口；分类页再展开子分类 */
  /* hover 浮层在触屏上没有意义，直接不渲染 */
  .sub-panel {
    display: none;
  }

  /* ===== 促销位：4 张图改 2×2 网格，不再竖排 4 张（竖排会拉出 400px 高） ===== */
  .side-bar.r {
    width: 100%;
    margin-top: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  /* 小屏图片按 16:9 自适应，不再写死 80px 高度 */
  .side-img-link img {
    height: auto;
    aspect-ratio: 16 / 9;
  }

  /* 图片容器跟随栅格列宽，避免宽高比和实际宽度对不上留白 */
  .side-img-link {
    width: 100%;
  }

  /* ===== 猜你喜欢标题：装饰线缩短，避免把标题挤成两行 ===== */
  .title-line {
    width: 32px;
  }

  .title-text {
    font-size: 17px;
  }
}

@media (max-width: 560px) {
  .guess-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
