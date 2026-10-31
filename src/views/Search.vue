<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductPage } from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'

// PC 端 DOM 承受力强，每页 40 条
const PAGE_SIZE = 40

const route = useRoute()

const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const products = ref([])
const total = ref(0)
const page = ref(1)
const hasMore = ref(false)

// 请求序号：连续搜索时只应用最后一次结果
let loadSeq = 0

// 拉一页搜索结果；target=1 覆盖列表，否则追加；seq 不一致说明已发起新搜索，丢弃结果
async function fetchPage(target, seq) {
  const res = await getProductPage({ keyword: route.query.keyword, page: target, pageSize: PAGE_SIZE })
  if (seq !== loadSeq) return
  const list = res?.list || []
  total.value = res?.total || 0
  page.value = target
  products.value = target === 1 ? list : products.value.concat(list)
  hasMore.value = products.value.length < total.value
}

async function load(value) {
  const seq = ++loadSeq
  products.value = []
  total.value = 0
  page.value = 1
  hasMore.value = false
  error.value = ''
  if (!value) return
  loading.value = true
  try {
    await fetchPage(1, seq)
  } catch (e) {
    if (seq === loadSeq) {
      error.value = e?.message || '搜索失败'
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

// 关键词变化时重新搜索（搜索框在顶部导航，这里只负责按 URL 上的 keyword 拉结果）
watch(
  () => route.query.keyword,
  (value) => {
    load(value)
  },
  { immediate: true }
)
</script>

<template>
  <div class="container search-page">
    <el-skeleton v-if="loading" :rows="5" animated />

    <el-alert v-else-if="error" :title="error" type="error" show-icon :closable="false" />

    <template v-else>
      <div v-if="products.length" class="product-grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
      <el-empty v-else :description="route.query.keyword ? '没有找到相关商品' : '输入关键词开始搜索'" />

      <!-- 分页：还有下一页时给“加载更多”，否则显示总数 -->
      <div v-if="products.length" class="load-more">
        <el-button v-if="hasMore" :loading="loadingMore" @click="loadMore">加载更多</el-button>
        <span v-else class="load-more-tip">已显示全部 {{ total }} 件商品</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 搜索框在顶部导航里，本页只展示结果，这里补一点上间距 */
.search-page {
  padding-top: 20px;
}

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
