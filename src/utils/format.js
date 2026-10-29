// 金额展示：后端返回 number，前端只做格式化
export const formatPrice = (value) => Number(value ?? 0).toFixed(2)
