import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getToken } from '@/utils/token.js'
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

  const isLoggedIn = () => !!getToken()

  // 购物车行身份：多规格用 skuId，旧数据/单规格用商品 ID
  const rowKey = (item) => (item.skuId != null ? `s${item.skuId}` : `p${item.productId}`)

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
  // extra：{ skuId, specJson, price }，详情页选了规格时带上
  async function addItem(product, quantity = 1, insuranceDetail = [], insuranceFee = 0, extra = {}) {
    const productId = product.id ?? product.productId
    const skuId = extra.skuId ?? null
    const specJson = extra.specJson || {}
    const price = extra.price != null ? Number(extra.price) : Number(product.price) || 0
    const exist = items.value.find((i) =>
      skuId != null ? i.skuId === skuId : i.productId === productId && i.skuId == null
    )
    if (exist) {
      exist.quantity += quantity
      exist.insuranceDetail = insuranceDetail
      exist.insuranceFee = insuranceFee
      exist.skuId = skuId
      exist.specJson = specJson
      exist.price = price
    } else {
      items.value.push({
        productId,
        skuId,
        name: product.name,
        image: product.image || '',
        price,
        specJson,
        quantity,
        insuranceDetail,
        insuranceFee,
      })
    }

    try {
      await addCartItem({
        productId,
        skuId,
        specJson: Object.keys(specJson).length ? JSON.stringify(specJson) : null,
        quantity,
        insuranceDetail,
        insuranceFee,
      })
    } catch (e) {
      await load()
      throw e
    }
  }

  async function removeItem(productId, skuId) {
    items.value = items.value.filter((i) =>
      skuId != null ? i.skuId !== skuId : i.productId !== productId
    )
    try {
      await removeCartItem(productId, skuId)
    } catch {
      await load()
    }
  }

  async function updateQuantity(productId, skuId, quantity) {
    const exist = items.value.find((i) =>
      skuId != null ? i.skuId === skuId : i.productId === productId && i.skuId == null
    )
    if (!exist) return
    const qty = Math.max(1, quantity)
    exist.quantity = qty
    try {
      await updateCartItem(productId, { quantity: qty, skuId: skuId ?? exist.skuId ?? null })
    } catch {
      await load()
    }
  }

  async function clear(productIds, skuIds) {
    if (skuIds?.length) {
      items.value = items.value.filter((i) => !skuIds.includes(i.skuId))
    } else if (productIds?.length) {
      items.value = items.value.filter((i) => !productIds.includes(i.productId))
    } else {
      items.value = []
    }
    try {
      await clearCart(productIds, skuIds)
    } catch {
      await load()
    }
  }

  /** 只清本地内存里的购物车快照，不动后端数据（退出登录用） */
  function resetLocal() {
    items.value = []
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
    resetLocal,
    rowKey,
  }
})
