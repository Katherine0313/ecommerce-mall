<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProduct } from '@/api/product'
import { formatPrice } from '@/utils/format'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const product = ref(null)

async function load(id) {
  loading.value = true
  error.value = ''
  product.value = null
  try {
    product.value = await getProduct(id)
  } catch (e) {
    error.value = e?.message || '商品加载失败'
  } finally {
    loading.value = false
  }
}

function addToCart() {
  // 购物车依赖 C 端登录，按 README 计划在 P2 接入
  ElMessage.info('购物车功能将在 P2 阶段接入')
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

      <div class="detail">
        <div class="gallery">
          <img :src="product.image" :alt="product.name" />
        </div>

        <div class="summary">
          <h1 class="title">{{ product.name }}</h1>
          <p class="sub">{{ product.subTitle }}</p>

          <div class="price-box">
            <span class="label">价格</span>
            <span class="price">¥{{ formatPrice(product.price) }}</span>
            <span v-if="product.marketPrice" class="market">¥{{ formatPrice(product.marketPrice) }}</span>
          </div>

          <div class="meta">
            <span>品牌：{{ product.brand || '—' }}</span>
            <span>库存：{{ product.stock ?? '—' }}</span>
          </div>

          <el-button type="primary" size="large" class="cart-btn" @click="addToCart">
            加入购物车
          </el-button>
        </div>
      </div>

      <section class="description">
        <h2 class="section-title">商品描述</h2>
        <p>{{ product.description }}</p>
        <!-- body 为后台富文本，直接渲染 -->
        <div v-if="product.body" class="detail-body" v-html="product.body"></div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.breadcrumb {
  margin-bottom: 16px;
}

.detail {
  display: flex;
  gap: 32px;
  background: #fff;
  border-radius: 10px;
  padding: 24px;
}

.gallery {
  width: 420px;
  flex-shrink: 0;
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
}

.gallery img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.summary {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
}

.sub {
  margin: 0 0 20px;
  color: var(--mall-text-light);
  line-height: 1.6;
}

.price-box {
  background: #fff8f3;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price-box .label {
  color: var(--mall-text-light);
  font-size: 13px;
}

.price {
  color: var(--mall-primary);
  font-size: 30px;
  font-weight: 700;
}

.market {
  color: var(--mall-text-light);
  text-decoration: line-through;
}

.meta {
  display: flex;
  gap: 24px;
  margin: 20px 0 28px;
  color: var(--mall-text-light);
  font-size: 14px;
}

.cart-btn {
  width: 220px;
}

.description {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  margin-top: 20px;
}

.detail-body :deep(img) {
  max-width: 100%;
}

@media (max-width: 768px) {
  .detail {
    flex-direction: column;
  }

  .gallery {
    width: 100%;
  }
}
</style>
