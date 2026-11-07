import {
  Wallet,
  Box,
  Van,
  CircleCheck,
  CircleClose,
  RefreshLeft,
} from '@element-plus/icons-vue'

/**
 * 订单状态元数据：首页入口、订单列表、订单详情共用。
 * 状态码与后端 OrderStatusEnum 一致；2「待确认收款」已退役并入 3。
 */
export const ORDER_STATUS = {
  PENDING_PAY: 1,
  PENDING_SHIP: 3,
  SHIPPED: 4,
  FINISHED: 5,
  CANCEL: 6,
  REFUNDED: 7,
}

export const STATUS_META = {
  [ORDER_STATUS.PENDING_PAY]: {
    label: '待付款',
    color: 'var(--status-pay)',
    bg: 'var(--status-pay-bg)',
    icon: Wallet,
  },
  [ORDER_STATUS.PENDING_SHIP]: {
    label: '待发货',
    color: 'var(--status-ship)',
    bg: 'var(--status-ship-bg)',
    icon: Box,
  },
  [ORDER_STATUS.SHIPPED]: {
    label: '待收货',
    color: 'var(--status-receive)',
    bg: 'var(--status-receive-bg)',
    icon: Van,
  },
  [ORDER_STATUS.FINISHED]: {
    label: '已完成',
    color: 'var(--status-done)',
    bg: 'var(--status-done-bg)',
    icon: CircleCheck,
  },
  [ORDER_STATUS.CANCEL]: {
    label: '已取消',
    color: 'var(--status-cancel)',
    bg: 'var(--status-cancel-bg)',
    icon: CircleClose,
  },
  [ORDER_STATUS.REFUNDED]: {
    label: '已退款',
    color: 'var(--status-aftersale)',
    bg: 'var(--status-aftersale-bg)',
    icon: RefreshLeft,
  },
}

/** 状态元数据兜底：后端 desc 只在拿不到映射时使用 */
export function statusMeta(status, fallbackLabel = '') {
  return (
    STATUS_META[Number(status)] || {
      label: fallbackLabel || '未知状态',
      color: 'var(--text-secondary)',
      bg: 'var(--bg-hover)',
      icon: Box,
    }
  )
}

/**
 * 订单列表 Tab：空字符串 = 全部。
 * 注意：后端 page 接口只按 order_status 过滤，「待评价」暂不作为独立 Tab
 *（需要 reviewed=false 这类语义筛选，后续再补），个人中心首页的待评价入口落到「已完成」。
 */
export const ORDER_TABS = [
  { label: '全部', value: '' },
  { label: '待付款', value: ORDER_STATUS.PENDING_PAY },
  { label: '待发货', value: ORDER_STATUS.PENDING_SHIP },
  { label: '待收货', value: ORDER_STATUS.SHIPPED },
  { label: '已完成', value: ORDER_STATUS.FINISHED },
  { label: '已取消', value: ORDER_STATUS.CANCEL },
]

/** 状态码 → /orders/counts 字段 */
export const ORDER_COUNT_FIELDS = {
  [ORDER_STATUS.PENDING_PAY]: 'pendingPay',
  [ORDER_STATUS.PENDING_SHIP]: 'pendingShip',
  [ORDER_STATUS.SHIPPED]: 'pendingReceive',
  [ORDER_STATUS.FINISHED]: 'finished',
  [ORDER_STATUS.CANCEL]: 'cancelled',
}
