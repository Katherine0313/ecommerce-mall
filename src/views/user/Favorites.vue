<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getFavorites, removeFavorite } from '@/api/favorite.js'

const router = useRouter()

const loading = ref(true)
const favorites = ref([])

function load() {
  loading.value = true
  getFavorites()
    .then((list) => {
      favorites.value = list || []
    })
    .catch((e) => {
      ElMessage.error(e?.message || '收藏加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

// 取消收藏：用气泡确认（轻量操作），确认后直接调接口
function handleRemove(item) {
  removeFavorite(item.productId)
    .then(() => {
      ElMessage.success('已取消收藏')
      load()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '操作失败')
    })
}

function goDetail(id) {
  router.push(`/product/${id}`)
}

onMounted(load)
</script>

<template>
  <div class="card page">
    <h2 class="section-title">我的收藏</h2>

    <el-empty v-if="!loading && !favorites.length" description="还没有收藏商品">
      <el-button type="primary" @click="router.push('/')">去逛逛</el-button>
    </el-empty>

    <div v-loading="loading" class="fav-list">
      <div v-for="item in favorites" :key="item.productId" class="fav-item">
        <img
          class="fav-img"
          :src="item.image"
          :alt="item.name"
          loading="lazy"
          @click="goDetail(item.productId)"
        />
        <div class="fav-info" @click="goDetail(item.productId)">
          <p class="fav-name text-ellipsis-2">{{ item.name }}</p>
          <p class="fav-price price">¥{{ item.price }}</p>
          <p v-if="Number(item.status) === 0" class="fav-off">已下架</p>
        </div>
        <el-popconfirm
          title="确定取消收藏吗？"
          confirm-button-text="确定"
          cancel-button-text="再想想"
          width="180"
          @confirm="handleRemove(item)"
        >
          <template #reference>
            <el-button link type="danger" class="fav-remove">取消收藏</el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
}

.fav-list {
  display: flex;
  flex-direction: column;
}

.fav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}

.fav-item + .fav-item {
  border-top: 1px solid var(--border-light);
}

.fav-img {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  cursor: pointer;
}

.fav-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.fav-name {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.fav-price {
  margin: 0;
}

.fav-off {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.fav-remove {
  flex-shrink: 0;
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  /* 收藏项：图片缩小，取消收藏按钮换行到下方独立一行 */
  .fav-item {
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-sm) 0;
  }

  .fav-img {
    width: 72px;
    height: 72px;
  }

  .fav-remove {
    width: 100%;
    text-align: right;
    min-height: 44px;
  }
}
</style>
