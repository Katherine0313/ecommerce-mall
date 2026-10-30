<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getProductPage, getCategories } from '@/api/product.js'
import ProductCard from '@/components/ProductCard.vue'

// PC 端 DOM 承受力强，每页 40 条
const PAGE_SIZE = 40

const route = useRoute()

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const products = ref([])
const total = ref(0)
const page = ref(1)
const hasMore = ref(false)
const categoryNames = ref({})

// 请求序号：路由快速切换时只应用最后一次请求的结果
let loadSeq = 0

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

// 当前路由对应的筛选条件（分类 / 关键词）
function currentParams() {
  const params = {}
  const categoryId = route.params.id || route.query.categoryId
  const keyword = route.query.keyword
  if (categoryId) params.categoryId = categoryId
  if (keyword) params.keyword = keyword
  return params
}

// 拉一页商品：target=1 覆盖列表，否则追加；seq 不一致说明路由已切走，丢弃结果
async function fetchPage(target, seq) {
  const res = await getProductPage({ ...currentParams(), page: target, pageSize: PAGE_SIZE })
  if (seq !== loadSeq) return
  const list = res?.list || []
  total.value = res?.total || 0
  page.value = target
  products.value = target === 1 ? list : products.value.concat(list)
  hasMore.value = products.value.length < total.value
}

// 路由变化：重置分页并加载第一页
async function load() {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  products.value = []
  total.value = 0
  page.value = 1
  hasMore.value = false
  try {
    await fetchPage(1, seq)
  } catch (e) {
    if (seq === loadSeq) {
      error.value = e?.message || '商品加载失败'
      products.value = []
    }
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// 点“加载更多”加载下一页；失败保留已展示列表，按钮可重试
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    await fetchPage(page.value + 1, loadSeq)
  } catch {
    // 错误提示已在 request 拦截器统一处理
  } finally {
    loadingMore.value = false
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

      <!-- 分页：还有下一页时给“加载更多”，否则显示总数 -->
      <div v-if="products.length" class="load-more">
        <el-button v-if="hasMore" :loading="loadingMore" @click="loadMore">加载更多</el-button>
        <span v-else class="load-more-tip">已显示全部 {{ total }} 件商品</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.load-more {
  display: flex;
  justify-content: center;
  margin: 8px 0 32px;
}

.load-more-tip {
  color: #999;
  font-size: 14px;
}
</style>
