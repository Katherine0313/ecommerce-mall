<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getArticleDetail, reportArticleBrowse } from '@/api/article'

const route = useRoute()
const loading = ref(true)
const article = ref(null)

onMounted(() => {
  const id = route.params.id
  getArticleDetail(id)
    .then((data) => {
      article.value = data
      // 浏览量 +1，失败不影响阅读
      if (data?.id) reportArticleBrowse(data.id).catch(() => {})
    })
    .catch((e) => {
      ElMessage.error(e?.message || '文章加载失败')
    })
    .finally(() => {
      loading.value = false
    })
})
</script>

<template>
  <div class="container">
    <el-skeleton v-if="loading" :rows="6" animated />

    <el-empty v-else-if="!article" description="文章不存在或已下架" />

    <article v-else class="card article">
      <h1 class="article-title">{{ article.title }}</h1>
      <div class="article-meta">
        <span v-if="article.author">{{ article.author }}</span>
        <span v-if="article.createTime">{{ article.createTime }}</span>
        <span>{{ article.browseCount || 0 }} 次浏览</span>
      </div>
      <img v-if="article.cover" :src="article.cover" class="article-cover" alt="" />
      <!-- 正文是后台富文本（管理员录入），小程序端用 rich-text 渲染，这里同样直接输出 -->
      <div class="article-content" v-html="article.content"></div>
    </article>
  </div>
</template>

<style scoped>
.article {
  margin-top: var(--space-lg);
  padding: var(--space-lg);
}

.article-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.article-cover {
  display: block;
  max-width: 100%;
  margin-bottom: 16px;
  border-radius: var(--radius-sm);
}

.article-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-regular);
  word-break: break-word;
}

.article-content :deep(img) {
  max-width: 100%;
}

/* 正文里的标题、表格、列表用浏览器默认样式会很难看，这里补一套基础排版 */
.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  margin: 20px 0 10px;
  font-weight: 600;
  color: var(--text-primary);
}

.article-content :deep(p) {
  margin: 0 0 12px;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 0 0 12px;
  padding-left: 22px;
}

.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.article-content :deep(th),
.article-content :deep(td) {
  border: 1px solid var(--border-light);
  padding: 6px 10px;
  font-size: 13px;
}
</style>
