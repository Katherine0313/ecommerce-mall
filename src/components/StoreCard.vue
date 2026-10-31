<template>
  <!-- 店铺信息卡片：单店模式，店名取静态配置 -->
  <div class="store-card">
    <!-- 用 :src 绑定：避免 Vite 把 /image 运行时路径当成模块静态解析 -->
    <div class="store-avatar-wrap">
      <!-- 兔耳朵挂件：从圆头像顶部冒出，金色描边呼应“官方认证”皇冠 -->
      <span class="bunny-ear ear-left" aria-hidden="true"></span>
      <span class="bunny-ear ear-right" aria-hidden="true"></span>
      <img :src="logoSrc" class="store-avatar" alt="杰米商城" />
    </div>
    <div class="store-info">
      <div class="store-name-row">
        <span class="store-name">{{ shopName }}</span>
      </div>
      <div class="store-subtitle">自营店铺 · 正品保障</div>
    </div>
    <div class="store-card-right">
      <span class="store-badge">
        <!-- 皇冠图标：金色描边感更强，比打勾更贴合“官方认证”的尊贵感 -->
        <svg class="badge-crown" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3.2 7.6l4.4 3.7L12 4.5l4.4 6.8 4.4-3.7-1 12.6H4.2l-1-12.6z"
            fill="url(#crown-gold)"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
          <defs>
            <linearGradient id="crown-gold" x1="4" y1="5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#ffe08a" />
              <stop offset="1" stop-color="#f2b01e" />
            </linearGradient>
          </defs>
        </svg>
        官方认证
      </span>
      <el-button class="store-enter-btn" @click="$router.push('/products-list')">进入店铺</el-button>
    </div>
  </div>
</template>

<script setup>
// 单店模式：店名与站点 Logo 保持一致；Logo 由后端 /image 静态目录托管
const shopName = '杰米商城'
const logoSrc = '/image/zongjie.webp'
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

/* 头像挂件容器：让兔耳朵相对头像定位 */
.store-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

/* 圆形 Logo，固定尺寸不被压扁；z-index 高于耳朵，盖住耳朵根部 */
.store-avatar {
  position: relative;
  z-index: 1;
  width: 52px;
  height: 52px;
  border-radius: 50px;
  object-fit: cover;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

/* 兔耳朵挂件：金色描边 + 粉色内耳，从圆头像顶部冒出 */
.bunny-ear {
  position: absolute;
  top: -9px;
  z-index: 0;
  width: 15px;
  height: 28px;
  background: #fff;
  border: 2px solid #f0b429;
  border-radius: 50%;
  pointer-events: none;
}

/* 内耳：粉色椭圆，随外耳一起旋转 */
.bunny-ear::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #ffb7c5;
}

.ear-left {
  left: 8px;
  transform: rotate(-18deg);
}

.ear-right {
  right: 8px;
  transform: rotate(18deg);
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

/* 官方认证：金色皇冠 + 文字，胶囊底突出“权威认证” */
.store-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  color: #b47d0b;
  background: linear-gradient(135deg, #fff7e0, #ffe9b3);
  border: 1px solid #f3d488;
  border-radius: 999px;
}

.badge-crown {
  width: 14px;
  height: 14px;
  color: #e6a817;
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
