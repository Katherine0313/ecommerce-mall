<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getProducts, getCategories } from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const products = ref([])
const categoryNames = ref({})

// 递归收集分类 id -> name，用于列表页标题
function flattenCategories(list, map = {}) {
  list.forEach((c) => {
    map[c.id] = c.name
    if (c.children?.length) flattenCategories(c.children, map)
  })
  return map
}

async function loadCategories() {
  try {
    categoryNames.value = flattenCategories(await getCategories())
  } catch {
    // 分类名只用于标题，失败不影响商品展示
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    const categoryId = route.params.id || route.query.categoryId
    const keyword = route.query.keyword
    if (categoryId) params.categoryId = categoryId
    if (keyword) params.keyword = keyword
    products.value = await getProducts(params)
  } catch (e) {
    error.value = e?.message || '商品加载失败'
    products.value = []
  } finally {
    loading.value = false
  }
}

loadCategories()
watch(() => [route.params.id, route.query.categoryId, route.query.keyword], load, { immediate: true })
</script>

<template>
  <div class="container">
    <h2 class="section-title">
      <template v-if="route.query.keyword">搜索“{{ route.query.keyword }}”</template>
      <template v-else-if="categoryNames[route.params.id || route.query.categoryId]">
        {{ categoryNames[route.params.id || route.query.categoryId] }}
      </template>
      <template v-else>全部商品</template>
    </h2>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-alert v-else-if="error" :title="error" type="error" show-icon :closable="false" />

    <template v-else>
      <div v-if="products.length" class="product-grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
      <el-empty v-else description="没有找到相关商品" />
    </template>
  </div>
</template>
