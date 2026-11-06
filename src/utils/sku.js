// ===== SKU 规格匹配工具（与小程序 utils/sku.js 同一套算法）=====
// specJson 形如 { 颜色: '曜石黑', 内存: '256G' }，specs 为商品返回的规格维度数组
// [{ name: '颜色', values: ['曜石黑', '雪域白'] }]，顺序与后端 sku_specs 一致。

// 后端 specJson 可能以 JSON 字符串下发，统一转对象
function parseSpec(v) {
  if (!v) return {}
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch (e) {
      return {}
    }
  }
  return v
}

// 规格是否已选全：每个维度都有值
export function isSpecComplete(specJson, specs) {
  return (specs || []).every((g) => specJson && specJson[g.name])
}

// 按选中组合查 SKU：逐字段比对，不依赖 key 拼接顺序；未选全返回 null
export function findSku(skus, specJson, specs) {
  if (!isSpecComplete(specJson, specs)) return null
  return (
    (skus || []).find((sku) => {
      const json = parseSpec(sku.specJson)
      return (specs || []).every((g) => json[g.name] === specJson[g.name])
    }) || null
  )
}

// 候选值能不能选：把「已选的其他值 + 该候选值」拼起来，还得有一条启用且有货的 SKU
export function isValueSelectable(skus, specJson, groupName, value) {
  const next = { ...specJson, [groupName]: value }
  return (skus || []).some((sku) => {
    if (sku.status != null && Number(sku.status) !== 1) return false
    if (Number(sku.stock) <= 0) return false
    const json = parseSpec(sku.specJson)
    return Object.keys(next).every((k) => json[k] === next[k])
  })
}

// 已选规格展示文案：曜石黑 / 256G
export function specText(specJson, specs) {
  return (specs || [])
    .map((g) => (specJson ? specJson[g.name] : ''))
    .filter(Boolean)
    .join(' / ')
}

// 购物车/结算行展示：specJson 可能是对象，也可能是后端下发的 JSON 字符串
export function specLabel(specJson) {
  const obj = parseSpec(specJson)
  return Object.keys(obj)
    .filter((k) => obj[k])
    .map((k) => `${k} ${obj[k]}`)
    .join(' / ')
}
