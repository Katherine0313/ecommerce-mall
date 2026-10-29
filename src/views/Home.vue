<script setup>
import { ref, onMounted } from 'vue'
import { getHome } from '@/api/home'
import ProductCard from '@/components/ProductCard.vue'

const loading = ref(true)
const error = ref('')
const categories = ref([])
const recommends = ref([])

onMounted(async () => {
  try {
    const data = await getHome(12)
    categories.value = data?.categories || []
    recommends.value = data?.recommend || []
  } catch (e) {
    error.value = e?.message || '首页数据加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert v-else-if="error" :title="error" type="error" show-icon :closable="false" />

    <template v-else>
      <section v-if="categories.length">
        <h2 class="section-title">商品分类</h2>
        <div class="category-grid">
          <router-link
            v-for="c in categories"
            :key="c.id"
            :to="`/category/${c.id}`"
            class="category-item"
          >
            <img v-if="c.image" :src="c.image" :alt="c.name" />
            <span>{{ c.name }}</span>
          </router-link>
        </div>
      </section>

      <section>
        <h2 class="section-title">猜你喜欢</h2>
        <div v-if="recommends.length" class="product-grid">
          <ProductCard v-for="p in recommends" :key="p.id" :product="p" />
        </div>
        <el-empty v-else description="暂无推荐商品" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  transition: box-shadow 0.2s;
}

.category-item:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.category-item img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}
</style>
