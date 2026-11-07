<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAddressList, deleteAddress } from '@/api/address.js'
import AddressDialog from '@/views/products/Address.vue'

const loading = ref(true)
const addresses = ref([])
const dialogRef = ref(null)

function load() {
  loading.value = true
  getAddressList()
    .then((list) => {
      addresses.value = list || []
    })
    .catch((e) => {
      ElMessage.error(e?.message || '地址加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

// 新增：不传参数就是新增
function openCreate() {
  dialogRef.value?.open()
}

// 编辑：传地址对象
function openEdit(address) {
  dialogRef.value?.open(address)
}

function onSaved() {
  load()
}

// 删除地址：用气泡确认（轻量操作），确认后直接调接口
function handleDelete(address) {
  deleteAddress(address.id)
    .then(() => {
      ElMessage.success('已删除')
      load()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '删除失败')
    })
}

onMounted(load)
</script>

<template>
  <div class="card page">
    <div class="page-head">
      <h2 class="section-title">收货地址</h2>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增地址</el-button>
    </div>

    <el-empty v-if="!loading && !addresses.length" description="还没有收货地址">
      <el-button type="primary" @click="openCreate">新增地址</el-button>
    </el-empty>

    <div v-loading="loading" class="address-list">
      <article
        v-for="address in addresses"
        :key="address.id"
        class="address-card"
        :class="{ 'is-default': Number(address.isDefault) === 1 }"
      >
        <div class="address-head">
          <span class="consignee">{{ address.consignee }}</span>
          <span class="phone">{{ address.phone }}</span>
          <el-tag v-if="Number(address.isDefault) === 1" size="small" effect="light">
            默认
          </el-tag>
        </div>

        <p class="address-detail text-ellipsis-2">{{ address.region }} {{ address.detailAddress }}</p>

        <div class="address-foot">
          <el-button link type="primary" @click="openEdit(address)">编辑</el-button>
          <el-popconfirm
            title="确定删除该地址吗？"
            confirm-button-text="确定"
            cancel-button-text="再想想"
            width="180"
            @confirm="handleDelete(address)"
          >
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </article>
    </div>

    <!-- 复用商品页那个地址编辑弹窗 -->
    <AddressDialog ref="dialogRef" @saved="onSaved" />
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
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.page-head .section-title {
  margin: 0;
}

/* ===== 地址卡列表：桌面 2 列，窄屏单列 ===== */
.address-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.address-card {
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  background: var(--bg-card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.address-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

/* 默认地址：主色描边 + 左侧色条 */
.address-card.is-default {
  border-color: var(--color-primary);
  box-shadow: inset 3px 0 0 var(--color-primary);
}

.address-card.is-default:hover {
  border-color: var(--color-primary);
  box-shadow: inset 3px 0 0 var(--color-primary), var(--shadow-card);
}

.address-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: 8px;
  padding-left: 4px;
}

.consignee {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.phone {
  font-size: 13px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.address-detail {
  min-height: 42px;
  margin: 0 0 var(--space-md);
  padding-left: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-regular);
}

/* 操作按钮固定卡片底部 */
.address-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: auto;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-light);
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .page-head {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .page-head .el-button {
    margin-left: auto;
  }

  .address-list {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }

  .address-card {
    padding: var(--space-sm) var(--space-md);
  }

  .address-detail {
    min-height: 0;
  }
}
</style>
