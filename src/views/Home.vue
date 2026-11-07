<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Iphone, Monitor, Cellphone, Headset, Watch, Camera, Box, House, Goods,
} from '@element-plus/icons-vue'
import { getHome } from '@/api/home'
import { getProducts } from '@/api/product'
import { getBanners, reportBannerBrowse } from '@/api/banner'
import ProductCard from '@/components/ProductCard.vue'

// 首页轮播图：优先用后台配置的 Banner（position=11）；
// 后台没配时回落到 public/swiper 下的静态图，保证首页不至于空白
const FALLBACK_BANNERS = [
  { src: '/swiper/swiper1.webp', alt: '3C数码新品季 手机电脑智能设备一站购齐', link: '/products-list' },
  { src: '/swiper/swiper2.webp', alt: '限时狂欢 电脑配件低至7折起', link: '/products-list' },
  { src: '/swiper/swiper3.webp', alt: '影像装备焕新出发 相机镜头运动拍摄', link: '/products-list' },
  { src: '/swiper/swiper4.webp', alt: '智能清洁 扫地机器人高效清扫', link: '/products-list' },
]
const banners = ref([])

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
      banners.value = arr.length
        ? arr.flatMap((b) => {
            const urls = Array.isArray(b.images) && b.images.length ? b.images : [b.image]
            return urls
              .filter(Boolean)
              .map((src) => ({ id: b.id, src, alt: b.title || '', link: bannerLink(b) }))
          })
        : FALLBACK_BANNERS
    })
    .catch(() => {
      banners.value = FALLBACK_BANNERS
    })
}

// 点击统计：后台能看每张 Banner 的点击量
function handleBannerClick(b) {
  if (b.id) reportBannerBrowse(b.id).catch(() => {})
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
  { src: '/image/side-bar/side-bar1.webp', alt: '促销活动 1' },
  { src: '/image/side-bar/side-bar2.webp', alt: '促销活动 2' },
  { src: '/image/side-bar/side-bar3.webp', alt: '促销活动 3' },
  { src: '/image/side-bar/side-bar4.webp', alt: '促销活动 4' },
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
                <el-icon class="cat-icon"><component :is="categoryIcon(c)" /></el-icon>
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
              <el-carousel-item v-for="(b, i) in banners" :key="i">
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
  height:350px;
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
