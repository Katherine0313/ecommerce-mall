<script setup>
import { formatPrice } from '@/utils/format'

defineProps({
  product: { type: Object, required: true },
})
</script>

<template>
  <router-link :to="`/product/${product.id}`" class="product-card">
    <div class="thumb">
      <span v-if="product.promotionTag" class="promo-tag">{{ product.promotionTag }}</span>
      <!-- 后台有商品没配图（image 为空），img 会渲染成破图，这里用占位块兜底 -->
      <div v-if="!product.image" class="thumb-empty">暂无图片</div>
      <img v-else :src="product.image" :alt="product.name" loading="lazy" />
    </div>
    <div class="info">
      <h3 class="name">{{ product.name }}</h3>
      <p v-if="product.subTitle" class="sub">{{ product.subTitle }}</p>
      <div class="price-row">
        <span class="price">¥{{ formatPrice(product.price) }}</span>
        <span v-if="product.originalPrice" class="origin">¥{{ formatPrice(product.originalPrice) }}</span>
        <span v-if="product.marketPrice" class="market">¥{{ formatPrice(product.marketPrice) }}</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #fafafa;
}

/* 促销标签：图片左上角 */
.promo-tag {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  padding: 2px 8px;
  font-size: 12px;
  color: #fff;
  background: var(--color-primary);
  border-radius: 0 0 8px 0;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 无图占位：避免破图 icon + alt 文字直接怼在卡片上 */
.thumb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: var(--text-placeholder);
  background: var(--bg-page);
}

.info {
  padding: 12px;
}

.name {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.sub {
  margin: 4px 0 10px;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price {
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 600;
}

.market {
  color: var(--text-secondary);
  font-size: 12px;
  text-decoration: line-through;
}

/* 活动前原价 */
.origin {
  color: var(--text-secondary);
  font-size: 12px;
  text-decoration: line-through;
}
</style>
