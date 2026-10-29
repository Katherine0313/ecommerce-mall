<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProducts } from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()
const router = useRouter()

const keyword = ref(route.query.keyword || '')
const loading = ref(false)
const error = ref('')
const products = ref([])

async function load(value) {
  if (!value) {
    products.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    products.value = await getProducts({ keyword: value })
  } catch (e) {
    error.value = e?.message || '搜索失败'
    products.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { keyword: q } : {} })
}

// 关键词变化时重新搜索（含从首页搜索框跳转过来）
watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = value || ''
    load(value)
  },
  { immediate: true }
)
</script>

<template>
  <div class="container">
    <form class="search-bar" @submit.prevent="onSearch">
      <el-input v-model="keyword" placeholder="输入商品名称" clearable />
      <el-button type="primary" native-type="submit">搜索</el-button>
    </form>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-alert v-else-if="error" :title="error" type="error" show-icon :closable="false" />

    <template v-else>
      <div v-if="products.length" class="product-grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
      <el-empty v-else :description="route.query.keyword ? '没有找到相关商品' : '输入关键词开始搜索'" />
    </template>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 8px;
  max-width: 560px;
  margin: 0 0 20px;
}
</style>
