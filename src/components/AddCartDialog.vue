<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const visible = ref(false)

/** 打开「成功加入购物车」弹窗（淘宝同款：只给反馈，不铺商品信息） */
function open() {
  visible.value = true
}
defineExpose({ open })

// 去购物车
function goCart() {
  visible.value = false
  router.push('/cart')
}

// 继续购物
function continueShopping() {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="cart-modal"
    width="360px"
    align-center
    :show-close="false"
    :close-on-click-modal="true"
  >
    <div class="cart-text">
      <span>
        <!-- 绿色填充圆形 + 白色对勾，和淘宝弹窗同款 -->
        <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="#22c55e" />
          <polyline
            points="7 12 10.5 15.5 17 8.5"
            fill="none"
            stroke="#fff"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span>成功加入购物车</span>
    </div>

    <div class="cart-btn">
      <el-button class="btn-go-cart" @click="goCart">去购物车</el-button>
      <el-button type="primary" @click="continueShopping">继续购物</el-button>
    </div>

    <template #footer></template>
  </el-dialog>
</template>

<style scoped>
.cart-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 0 22px;
  font-size: 16px;
  color: var(--text-primary);
}

.cart-text svg {
  vertical-align: middle;
}

.cart-btn {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 「去购物车」用主题色，跟后台 Mall.vue 一致 */
.btn-go-cart {
  background: #ff6700;
  border: 1px solid #ff6700;
  color: #fff;
}

.btn-go-cart:hover {
  background: #ff7a00;
  border-color: #ff7a00;
  color: #fff;
}
</style>
