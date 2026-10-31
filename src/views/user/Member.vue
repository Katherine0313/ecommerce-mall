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

    <!-- 当前等级 -->
    <section class="level-card">
      <div class="level-head">
        <el-icon class="level-icon"><Medal /></el-icon>
        <div>
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
          :stroke-width="8"
          :show-text="false"
          color="#6b4a0f"
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

    <!-- 等级列表 -->
    <section class="block">
      <h3 class="block-title">等级权益</h3>
      <div class="level-list">
        <div
          v-for="level in levels"
          :key="level.id"
          class="level-item"
          :class="{ active: member?.levelId === level.id }"
        >
          <div class="level-info">
            <p class="item-name">{{ level.name }}</p>
            <p class="item-benefit">{{ level.benefits || '—' }}</p>
          </div>
          <span class="item-threshold">{{ level.growthThreshold }} 成长值</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}

/* ===== 等级卡：与小程序的会员金卡一致 ===== */
.level-card {
  padding: 20px 24px;
  background: linear-gradient(135deg, #f7e3b5 0%, #e9c87a 100%);
  border-radius: var(--radius-md);
}

.level-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.level-icon {
  font-size: 36px;
  color: #7a5410;
}

.level-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #6b4a0f;
}

/* 已满级标签 */
.max-tag {
  padding: 0 8px;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  color: #6b4a0f;
  border: 1px solid #6b4a0f;
  border-radius: 999px;
}

.level-benefit {
  margin: 0;
  font-size: 13px;
  color: #7a5a1c;
}

/* ===== 成长值 ===== */
.growth {
  margin-top: 16px;
}

.growth-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #8a6a2a;
}

/* 进度条底色与金卡协调 */
.level-card :deep(.el-progress-bar__outer) {
  background: rgba(107, 74, 15, 0.15);
}

/* ===== 数据 ===== */
.stat-row {
  display: flex;
  gap: 32px;
  margin-top: 16px;
}

.stat-value {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 600;
  color: #6b4a0f;
}

.stat-label {
  margin: 0;
  font-size: 12px;
  color: #8a6a2a;
}

/* ===== 等级列表 ===== */
.block {
  margin-top: 24px;
}

.block-title {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-regular);
}

.level-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.level-item {
  display: flex;
  align-items: center;
  padding: 16px;
}

/* 当前等级高亮（同小程序） */
.level-item.active {
  background: #fff7ea;
}

.level-item + .level-item {
  border-top: 1px solid var(--border-light);
}

.level-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--text-primary);
}

.item-benefit {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.item-threshold {
  font-size: 13px;
}
</style>
