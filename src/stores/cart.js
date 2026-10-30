import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '@/api/cart.js'

/**
 * 购物车：数据存后端（/api/cart），本地只做乐观更新。
 * 未登录时不发请求，避免 401 跳转；登录后再调用 load()。
 */
export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const loading = ref(false)

  const isLoggedIn = () => !!localStorage.getItem('token')

  // 从后端拉取购物车（打开购物车弹窗时调用）
  async function load() {
    if (!isLoggedIn()) {
      items.value = []
      return
    }
    loading.value = true
    try {
      items.value = (await getCart()) || []
    } catch (e) {
      console.error('购物车加载失败', e)
    } finally {
      loading.value = false
    }
  }

  const totalCount = computed(() =>
    items.value.reduce((sum, i) => sum + (i.quantity || 0), 0)
  )

  // 加购：本地先更新，接口失败再回滚成后端真实数据
  async function addItem(product, quantity = 1, insuranceDetail = [], insuranceFee = 0) {
    const productId = product.id ?? product.productId
    const exist = items.value.find((i) => i.productId === productId)
    if (exist) {
      exist.quantity += quantity
      exist.insuranceDetail = insuranceDetail
      exist.insuranceFee = insuranceFee
    } else {
      items.value.push({
        productId,
        name: product.name,
        image: product.image || '',
        price: Number(product.price) || 0,
        quantity,
        insuranceDetail,
        insuranceFee,
      })
    }

    try {
      await addCartItem({ productId, quantity, insuranceDetail, insuranceFee })
    } catch (e) {
      await load()
      throw e
    }
  }

  async function removeItem(productId) {
    items.value = items.value.filter((i) => i.productId !== productId)
    try {
      await removeCartItem(productId)
    } catch {
      await load()
    }
  }

  async function updateQuantity(productId, quantity) {
    const exist = items.value.find((i) => i.productId === productId)
    if (!exist) return
    const qty = Math.max(1, quantity)
    exist.quantity = qty
    try {
      await updateCartItem(productId, { quantity: qty })
    } catch {
      await load()
    }
  }

  async function clear(productIds) {
    if (productIds?.length) {
      items.value = items.value.filter((i) => !productIds.includes(i.productId))
    } else {
      items.value = []
    }
    try {
      await clearCart(productIds)
    } catch {
      await load()
    }
  }

  return {
    items,
    loading,
    totalCount,
    load,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  }
})
