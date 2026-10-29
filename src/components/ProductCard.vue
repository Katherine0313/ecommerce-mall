<script setup>
import { formatPrice } from '@/utils/format'

defineProps({
  product: { type: Object, required: true },
})
</script>

<template>
  <router-link :to="`/product/${product.id}`" class="product-card">
    <div class="thumb">
      <img :src="product.image" :alt="product.name" loading="lazy" />
    </div>
    <div class="info">
      <h3 class="name">{{ product.name }}</h3>
      <p class="sub">{{ product.subTitle }}</p>
      <div class="price-row">
        <span class="price">¥{{ formatPrice(product.price) }}</span>
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
  aspect-ratio: 1 / 1;
  background: #fafafa;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  color: var(--mall-text-light);
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
  color: var(--mall-primary);
  font-size: 18px;
  font-weight: 600;
}

.market {
  color: var(--mall-text-light);
  font-size: 12px;
  text-decoration: line-through;
}
</style>
