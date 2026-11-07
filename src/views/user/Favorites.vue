<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
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
    <div class="page-head">
      <h2 class="section-title">我的收藏</h2>
      <span v-if="favorites.length" class="fav-count">共 {{ favorites.length }} 件</span>
    </div>

    <el-empty v-if="!loading && !favorites.length" description="还没有收藏商品">
      <el-button type="primary" @click="router.push('/')">去逛逛</el-button>
    </el-empty>

    <div v-loading="loading" class="fav-grid">
      <article v-for="item in favorites" :key="item.productId" class="fav-card">
        <div class="fav-media" @click="goDetail(item.productId)">
          <img
            class="fav-img"
            :src="item.image"
            :alt="item.name"
            loading="lazy"
          />
          <span v-if="Number(item.status) === 0" class="fav-off-tag">已下架</span>
          <div class="fav-mask" @click.stop>
            <el-popconfirm
              title="确定取消收藏吗？"
              confirm-button-text="确定"
              cancel-button-text="再想想"
              width="180"
              @confirm="handleRemove(item)"
            >
              <template #reference>
                <el-button
                  class="fav-remove"
                  :icon="Close"
                  circle
                  size="small"
                  aria-label="取消收藏"
                  title="取消收藏"
                />
              </template>
            </el-popconfirm>
          </div>
        </div>

        <div class="fav-body" @click="goDetail(item.productId)">
          <p class="fav-name text-ellipsis-2">{{ item.name }}</p>
          <p class="fav-price">
            <span class="price-unit">¥</span>{{ item.price }}
          </p>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
}

.page-head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.page-head .section-title {
  margin: 0;
}

.fav-count {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 商品卡网格：桌面 4 列 / 平板 3 列 / 移动 2 列 ===== */
.fav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.fav-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  background: var(--bg-card);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.fav-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
  transform: translateY(-2px);
}

/* 图片 1:1 */
.fav-media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--bg-hover);
  cursor: pointer;
}

.fav-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 下架标记 */
.fav-off-tag {
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #fff;
  background: rgba(31, 35, 41, 0.65);
}

/* 取消收藏：桌面 hover 浮现，移动端常显 */
.fav-mask {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.fav-card:hover .fav-mask {
  opacity: 1;
}

.fav-remove {
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
  color: var(--text-regular);
  background: rgba(255, 255, 255, 0.92);
  border: none;
  box-shadow: 0 1px 4px rgba(31, 35, 41, 0.16);
}

.fav-remove:hover,
.fav-remove:focus {
  color: #fff;
  background: var(--color-primary);
}

.fav-body {
  padding: var(--space-sm) var(--space-md) var(--space-md);
  cursor: pointer;
}

/* 两行标题：固定两行高度，保证卡片底部价格对齐 */
.fav-name {
  min-height: 42px;
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  transition: color 0.15s;
}

.fav-card:hover .fav-name {
  color: var(--color-primary);
}

.fav-price {
  margin: 0;
  font-family: var(--font-num);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.price-unit {
  margin-right: 2px;
  font-size: 13px;
  font-weight: 500;
}

/* ===== 平板（≤1024px）：3 列 ===== */
@media (max-width: 1024px) {
  .fav-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ===== 窄屏（≤768px）：2 列 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .fav-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  /* 触屏无 hover：操作按钮常显 */
  .fav-mask {
    opacity: 1;
  }

  .fav-remove {
    width: 32px;
    height: 32px;
    min-height: 32px;
  }

  .fav-card:hover {
    transform: none;
  }

  .fav-body {
    padding: var(--space-sm);
  }

  .fav-name {
    min-height: 39px;
    margin-bottom: 6px;
    font-size: 13px;
  }

  .fav-price {
    font-size: 18px;
  }
}
</style>
