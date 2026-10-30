<template>
  <!-- 店铺信息卡片：单店模式，店名取静态配置 -->
  <div class="store-card">
    <!-- 用 :src 绑定：避免 Vite 把 /image 运行时路径当成模块静态解析 -->
    <img :src="logoSrc" class="store-avatar" alt="杰米商城" />
    <div class="store-info">
      <div class="store-name-row">
        <span class="store-name">{{ shopName }}</span>
      </div>
      <div class="store-subtitle">自营店铺 · 正品保障</div>
    </div>
    <div class="store-card-right">
      <span class="store-badge">官方认证</span>
      <el-button class="store-enter-btn" @click="$router.push('/products')">进入店铺</el-button>
    </div>
  </div>
</template>

<script setup>
// 单店模式：店名与站点 Logo 保持一致；Logo 由后端 /image 静态目录托管
const shopName = '杰米商城'
const logoSrc = '/image/store-logo.webp'
</script>

<style scoped>
.store-card {
  display: flex;
  align-items: center;
  gap: 20px;
  border-radius: var(--radius-lg);
  padding: 12px 18px;
  margin-bottom: 16px;
}

/* 圆形 Logo，固定尺寸不被压扁 */
.store-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

/* 允许 flex 子项收缩，长店名不会撑破卡片 */
.store-info {
  flex: 1;
  min-width: 0;
}

.store-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.store-name {
  flex: 1;
  min-width: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 右侧：认证 Badge + 进入店铺按钮竖排 */
.store-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.store-badge {
  font-size: 14px;
  height: 32px;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: 1px solid #ffb380;
  border-radius: 999px;
  padding: 2px 14px;
}

.store-enter-btn {
  height: 32px;
  border-radius: 999px;
  background: #fff;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  font-size: 14px;
}

.store-enter-btn:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-color: var(--color-primary);
}
</style>
