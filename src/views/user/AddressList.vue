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
      <div v-for="address in addresses" :key="address.id" class="address-item">
        <div class="address-main">
          <p class="address-head">
            <span class="consignee">{{ address.consignee }}</span>
            <span class="phone">{{ address.phone }}</span>
            <el-tag v-if="Number(address.isDefault) === 1" type="primary" size="small">
              默认
            </el-tag>
          </p>
          <p class="address-detail">{{ address.region }} {{ address.detailAddress }}</p>
        </div>
        <div class="address-actions">
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
      </div>
    </div>

    <!-- 复用商品页那个地址编辑弹窗 -->
    <AddressDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-head .section-title {
  margin: 0 0 var(--space-md);
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.address-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.address-main {
  flex: 1;
  min-width: 0;
}

.address-head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0 0 6px;
}

.consignee {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.phone {
  font-size: 13px;
  color: var(--text-regular);
}

.address-detail {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.address-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  /* 地址项竖排：信息一行，操作一行 */
  .address-item {
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-sm);
  }

  .address-main {
    flex-basis: 100%;
  }

  .address-actions {
    width: 100%;
    justify-content: flex-end;
    gap: var(--space-md);
  }
}
</style>
