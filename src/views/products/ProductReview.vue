<script setup>
// 商品详情页 - 商品评价区块（从 ProductDetail.vue 抽出，自取自渲染）
// 数据是公开只读的辅助信息：接口失败就当没有评价，不影响详情页其他内容
import { ref, computed, watch } from 'vue'
import { getProductReviews, getReviewSummary } from '@/api/review.js'

const props = defineProps({
  productId: { type: [Number, String], required: true },
})

// 详情页 Tab 标题要显示评价条数，通过事件透给父组件
const emit = defineEmits(['update:total'])

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

function reset() {
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
  emit('update:total', 0)
}

async function load(id) {
  reset()
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
  emit('update:total', reviewTotal.value)
}

watch(
  () => props.productId,
  (id) => {
    if (id) load(id)
  },
  { immediate: true }
)
</script>

<template>
  <template v-if="reviewTotal > 0">
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
          <el-rate :model-value="Number(item.rating) || 0" disabled size="small"
            disabled-void-color="#dcdfe6" />
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
  </template>
  <div v-else class="tab-empty">暂无评价</div>
</template>

<style scoped>
/* ===== 商品评价 ===== */
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

.tab-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-placeholder);
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  /* 评价统计区竖排 */
  .review-summary {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .review-score {
    width: 100%;
    flex-direction: row;
    justify-content: center;
    gap: 12px;
  }

  .score-bars {
    padding-left: 0;
  }

  /* 评价媒体小图缩小 */
  .review-media-item {
    width: 70px;
    height: 70px;
  }
}
</style>
