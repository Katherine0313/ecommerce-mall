<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Medal } from '@element-plus/icons-vue'
import { getMemberProfile, getMemberLevels } from '@/api/user.js'

const loading = ref(true)
const member = ref(null)
const levels = ref([])

// 成长值进度
const growthPercent = computed(() => {
  const m = member.value
  if (!m) return 0
  if (!m.nextLevelId) return 100
  const current = m.currentThreshold || 0
  const next = m.nextLevelThreshold || current
  if (next <= current) return 100
  return Math.min(100, Math.max(0, Math.round(((m.growthValue - current) / (next - current)) * 100)))
})

function load() {
  loading.value = true
  Promise.all([getMemberProfile(), getMemberLevels()])
    .then(([memberData, levelList]) => {
      member.value = memberData
      levels.value = levelList || []
    })
    .catch((e) => {
      ElMessage.error(e?.message || '加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="card page">
    <h2 class="section-title">会员中心</h2>

    <!-- ===== 当前等级：深色品牌渐变卡 ===== -->
    <section class="level-card">
      <div class="level-head">
        <span class="level-icon"><el-icon><Medal /></el-icon></span>
        <div class="level-title">
          <p class="level-name">
            {{ member?.levelName || '普通会员' }}
            <span v-if="member && !member.nextLevelId" class="max-tag">已满级</span>
          </p>
          <p class="level-benefit">{{ member?.benefits || '暂无权益说明' }}</p>
        </div>
      </div>

      <div class="growth">
        <div class="growth-head">
          <span>成长值 {{ member?.growthValue ?? 0 }}</span>
          <span v-if="member?.nextLevelId">
            距「{{ member.nextLevelName }}」还差 {{ member.growthToNext ?? 0 }}
          </span>
          <span v-else>已达最高等级</span>
        </div>
        <el-progress
          :percentage="growthPercent"
          :stroke-width="6"
          :show-text="false"
          color="var(--color-primary-light)"
        />
      </div>

      <div class="stat-row">
        <div class="stat">
          <p class="stat-value">{{ member?.paidOrderCount ?? 0 }}</p>
          <p class="stat-label">已支付订单</p>
        </div>
        <div class="stat">
          <p class="stat-value">¥{{ member?.totalPaidAmount ?? '0.00' }}</p>
          <p class="stat-label">累计实付</p>
        </div>
      </div>
    </section>

    <!-- ===== 等级权益：栅格卡片 ===== -->
    <section class="block">
      <h3 class="block-title">等级权益</h3>
      <div class="level-grid">
        <article
          v-for="level in levels"
          :key="level.id"
          class="level-item"
          :class="{ active: member?.levelId === level.id }"
        >
          <div class="item-head">
            <p class="item-name">{{ level.name }}</p>
            <span v-if="member?.levelId === level.id" class="item-current">当前等级</span>
          </div>
          <p class="item-benefit">{{ level.benefits || '—' }}</p>
          <p class="item-threshold">成长值 {{ level.growthThreshold }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
}

.page .section-title {
  margin: 0 0 var(--space-md);
}

/* ===== 等级卡：深色 → 品牌深橙渐变 ===== */
.level-card {
  position: relative;
  padding: var(--space-lg);
  border-radius: var(--radius-card);
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 55%),
    linear-gradient(135deg, var(--text-primary) 0%, var(--color-primary-dark) 100%);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  color: #fff;
}

.level-head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

/* 徽章：半透明圆底 */
.level-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  font-size: 24px;
  color: #fff;
}

.level-title {
  min-width: 0;
}

.level-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

/* 已满级标签 */
.max-tag {
  padding: 0 8px;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
}

.level-benefit {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

/* ===== 成长值 ===== */
.growth {
  margin-top: var(--space-lg);
}

.growth-head {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--space-sm);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-variant-numeric: tabular-nums;
}

/* 进度条底色与深色卡协调 */
.level-card :deep(.el-progress-bar__outer) {
  background: rgba(255, 255, 255, 0.16);
}

/* ===== 数据 ===== */
.stat-row {
  display: flex;
  gap: var(--space-xl);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}

.stat-value {
  margin: 0 0 4px;
  font-family: var(--font-num);
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

/* ===== 等级权益栅格 ===== */
.block {
  margin-top: var(--space-lg);
}

.block-title {
  margin: 0 0 var(--space-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.level-item {
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  background: var(--bg-card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.level-item:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

/* 当前等级高亮 */
.level-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.item-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: 8px;
}

.item-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.item-current {
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-primary);
  background: var(--bg-card);
}

.item-benefit {
  margin: 0 0 var(--space-sm);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.item-threshold {
  margin: auto 0 0;
  font-size: 12px;
  color: var(--text-placeholder);
  font-variant-numeric: tabular-nums;
}

.level-item.active .item-benefit {
  color: var(--text-regular);
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .level-card {
    padding: var(--space-md);
  }

  .level-name {
    font-size: 17px;
  }

  .level-icon {
    width: 38px;
    height: 38px;
    font-size: 20px;
  }

  .stat-row {
    gap: var(--space-lg);
  }

  .stat-value {
    font-size: 18px;
  }

  .level-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }
}
</style>
