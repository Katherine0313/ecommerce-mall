# 个人中心改版方案（参考京东）

> 版本：V1.0 ｜ 日期：2026-11-07 ｜ 范围：`/user` 二级布局及下辖全部页面 + 支撑后端接口
> 参考：用户提供的京东「订单中心」截图 + 京东「我的」信息层级
> 结论：不动旧接口与现有路由，只**新增**订单/售后分页计数接口并修一个手机号绑定 bug；视觉与信息架构重构。保留品牌橙 `#FF6700`，借用京东的「三段式骨架 + 订单卡 + 状态语义」，替换当前的「彩虹渐变名片 + 纯文字侧栏 + 设置页式宫格」。
> 后端核对结论：展示数据 80% 已具备，必须先补 1 个 bug、2 个接口缺口和 1 项性能改造，详见第 9 节。

---

## 0. 一句话结论

当前个人中心最大的问题不是细节，而是**没有电商感**：身份区用蓝→红→橙三段撞色渐变，侧栏是 8 个纯文字按钮，首页像后台设置页，订单卡所有状态都是同一个橙色标签。

改版做四件事：

1. **换骨架**：左侧分组导航（带图标、选中竖条）+ 右侧内容，和京东订单中心一致。
2. **换身份区**：删掉彩虹渐变，改成「白卡 + 橙色柔光 + 头像/等级/成长值/三组数据」的高级感名片。
3. **换订单区**：把截图里的订单卡结构复刻过来——灰底表头（时间/订单号/状态）、商品行、右列操作、底部合计；同时补上订单搜索和状态语义色。
4. **补后端缺口**：订单/售后分页 + 各状态计数，订单列表批量装配去 N+1，修复 PC 验证码绑定手机号；否则 Tab 数量、分页、换绑手机号都落不了地。

---

## 1. 参考对象拆解（京东订单中心截图）

从截图里提取可复用的规则，而不是照抄业务模块：

| 京东做法 | 可复用性 | 我们的落地 |
|---|---|---|
| 左侧纵向分组导航，图标 + 分组标题 | 高 | 保留现有路由，合并为「交易 / 资产 / 账户」3 组 |
| 选中项左侧红色竖条 + 加粗 | 高 | 改为橙色竖条 + 浅橙底 |
| 顶部页面标题 + 订单搜索 + 次要操作 | 高 | 订单页加搜索框（后端 `GET /orders?keyword=` 已支持） |
| 状态筛选 Tab 带数量 | 高 | 沿用现有 Tab，补数量与「售后」独立入口 |
| 订单卡：灰底表头（下单时间 / 订单号 / 状态） | 高 | 直接采用 |
| 商品行：左图 + 标题 + 单价×数量 | 高 | 直接采用，图片 72–80px |
| 右列操作区（查看详情 / 再次购买） | 高 | 桌面端右列，移动端下移成一行 |
| 订单状态用文字 + 颜色，不堆彩色标签 | 高 | 建立 6 种状态语义色 |
| 服务承诺条（正品保障 / 极速退款…） | 中 | 首页底部加静态服务条，增强信任 |
| 京东红 `#E1251B` 主题 | 低 | **不照搬**，保留品牌橙，避免全站换色 |
| 发票 / 企业购 / 京东 PLUS / 15 项导航 | 低 | 无对应业务，不做 |

> 说明：截图是订单中心，不是个人中心首页。首页的信息层级参考京东「我的」：身份区 → 订单入口 → 资产 → 服务 → 推荐。

---

## 2. 现状诊断（按严重度排序）

### P0：直接影响观感

1. **彩虹渐变名片** — `Profile.vue` 的 `.user-card` 使用 `linear-gradient(90deg, #8AA2EB → #FD1D1D → #FCB06C)`，蓝、红、橙三种高饱和色同屏，和全站 `#FF6700` 品牌色冲突，是"丑"的最大来源。
2. **侧栏没有图标** — `UserLayout.vue` 的 `MENU_GROUPS` 已经定义了 `icon` 字段，但模板只渲染文字，字段完全没用上。导航层级弱，像后台系统。
3. **四个订单入口同一个图标** — `Profile.vue` 的 `ORDER_ENTRIES` 全部渲染 `<Box />`，待付款和待收货视觉上无法区分。
4. **订单状态全部是橙色 warning 标签** — `OrderList.vue` 里 `el-tag type="warning"` 写死，待付款、已完成、已取消看起来一样，信息失效。

### P1：结构与信息密度

5. **首页像设置页** — 「名片 + 4 个订单入口 + 6 格功能」三段堆叠，缺少资产（券/收藏/地址）和推荐位，用户进来没有下一步动作。
6. **内容区白卡套白底** — 全局 `body` 是白色，`UserLayout` 侧栏和内容卡都没有描边/阴影，边界靠留白猜。
7. **侧栏分组不合理** — 「个人中心」被放进「我的」组，和交易组割裂；「我的订单」在交易组，但首页又有一套订单入口，重复。
8. **订单页没有搜索** — 后端 `getOrderList(keyword)` 已支持，前端完全没暴露。
9. **空状态只有一行字** — 收藏/优惠券/订单的空态没有插画、没有引导按钮。

### P2：一致性

10. `Member.vue` 用硬编码 `padding: 24px` 和自成一套的金色文字色 `#6b4a0f`，和其他页的 token 体系脱节。
11. 各页标题都叫 `.section-title`（20px），但卡片内的小节标题没有统一层级。
12. 缺少加载骨架屏，首屏是整块 `v-loading` 遮罩，观感廉价。

---

## 3. 设计目标与原则

**目标**

- 3 秒内看清：我是谁、我有什么、我该点哪里。
- 和全站商品页/购物车同一个视觉语言，不再像独立后台。
- 桌面端信息密度接近京东，移动端保留拇指可达的卡片流。

**原则**

1. **一个品牌色**：橙 `#FF6700` 只用于主操作、价格、选中态；状态色独立定义。
2. **白卡 + 细描边**，不用大面积彩色渐变；需要品牌感时用"橙色柔光"而不是整块渐变。
3. **一屏一个主任务**：首页主任务是"看订单"，订单页主任务是"筛选 + 处理订单"。
4. **图标必须承担语义**：不同订单状态用不同线性图标，不再复用同一个 Box。
5. **桌面右列、移动下移**：订单操作在桌面放右列，≤768px 折叠到底部一行。

---

## 4. 视觉规范

### 4.1 新增设计变量（追加到 `src/style/index.css`，不改动现有变量）

```css
:root {
  /* 语义状态色：订单/售后统一使用 */
  --status-pay: #ff6700;        /* 待付款 */
  --status-ship: #3a6ff8;       /* 待发货 */
  --status-receive: #12a07a;    /* 待收货 */
  --status-done: #86909c;       /* 已完成 */
  --status-cancel: #b3bac5;     /* 已取消 */
  --status-aftersale: #f5222d;  /* 退款/售后 */

  /* 状态浅底：图标圆底、标签底色 */
  --status-pay-bg: #fff4ec;
  --status-ship-bg: #eef3ff;
  --status-receive-bg: #e8f7f1;
  --status-done-bg: #f2f3f5;
  --status-cancel-bg: #f7f8fa;
  --status-aftersale-bg: #fff1f0;

  /* 个人中心专用 */
  --user-side-width: 196px;
  --bg-soft: #fafbfc;           /* 表头/空态底 */
  --border-strong: #e5e6eb;
  --radius-card: 10px;
  --shadow-card: 0 1px 2px rgba(31, 35, 41, 0.04), 0 8px 24px rgba(31, 35, 41, 0.06);

  /* 数字字体：价格、统计值等宽，避免跳动 */
  --font-num: 'DIN Alternate', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
```

> 只做追加，不改 `--color-primary` 等现有变量，避免影响商品页/购物车/结算页。

### 4.2 色板

| 用途 | 值 | 说明 |
|---|---|---|
| 品牌主色 | `#FF6700` | 主按钮、价格、选中竖条 |
| 主色浅底 | `#FFF4EC` | 选中项背景、图标圆底 |
| 正文 | `#1F2329` | 标题、昵称 |
| 常规 | `#4E5969` | 标签、辅助信息 |
| 次要 | `#86909C` | 时间、订单号 |
| 描边 | `#F0F1F3` / `#E5E6EB` | 卡片内分隔 / 卡片外框 |
| 页面底 | `#FFFFFF` | 保持全站白底，靠描边分层 |

### 4.3 字号与间距

| 层级 | 字号/字重 | 场景 |
|---|---|---|
| 页面标题 | 20 / 600 | 「我的订单」「会员中心」 |
| 区块标题 | 15 / 600 | 「我的订单」「资产与工具」 |
| 正文 | 14 / 400 | 商品名、字段值 |
| 辅助 | 12–13 / 400 | 时间、订单号、提示 |
| 价格 | 18–24 / 700 + tabular-nums | 实付金额 |

间距只取 `4 / 8 / 12 / 16 / 24 / 32`；卡片内边距首页 20–24，列表页 16；卡片间距 16。

### 4.4 圆角与阴影

- 卡片圆角 `10px`，内部图片 `6px`，按钮沿用 Element。
- 卡片默认 `1px solid #F0F1F3`；hover 时 `box-shadow: 0 8px 24px rgba(31,35,41,.06)`，位移 `translateY(-2px)`（仅交互卡片，列表卡不位移）。
- 取消当前所有彩色大渐变；身份卡改用：

```css
background:
  radial-gradient(120% 160% at 100% 0%, rgba(255, 103, 0, 0.10) 0%, rgba(255, 103, 0, 0) 55%),
  #ffffff;
```

---

## 5. 信息架构与导航

### 5.1 侧栏分组（替换 `UserLayout.vue` 的 `MENU_GROUPS`）

| 分组 | 菜单项 | 路由 | 图标 |
|---|---|---|---|
| 交易 | 我的订单 | `/user/orders` | `List`（带待处理角标） |
| 交易 | 退款/售后 | `/user/aftersales` | `RefreshLeft` |
| 交易 | 我的优惠券 | `/user/coupons` | `Ticket` |
| 资产 | 我的收藏 | `/user/favorites` | `Star` |
| 资产 | 收货地址 | `/user/addresses` | `Location` |
| 账户 | 会员中心 | `/user/member` | `Medal` |
| 账户 | 个人资料 | `/user/personal-info` | `User` |
| 账户 | 个人中心首页 | `/user` | `HomeFilled` |

> 「退款/售后」改为独立页面 `/user/aftersales`。后端已有 `GET /api/after-sales` 专用列表接口（支持状态/关键词/时间筛选），前端 `src/api/aftersale.js` 也已封装，只缺页面；比在订单页里塞一个 Tab 更清晰。若不想加路由，可暂时隐藏该入口，不影响其余方案。

### 5.2 侧栏视觉

```
┌──────────────┐
│  交易        │  ← 12px 次要色，上间距 16
│ ▍我的订单  ②│  ← 选中：左侧 3px 橙条 + 600 字重 + #FFF4EC 底
│  退款/售后   │
│  我的优惠券  │
│              │
│  资产        │
│  我的收藏    │
│  收货地址    │
│              │
│  账户        │
│  会员中心    │
│  个人资料    │
│  个人中心    │
└──────────────┘
```

实现要点：

- 菜单项 `display:flex; align-items:center; gap:10px; height:44px; padding:0 16px;`
- 图标 18px，默认 `#86909C`，选中变橙。
- 选中竖条用 `::before`：`left:0; width:3px; height:20px; background: var(--color-primary);`
- 侧栏 `position: sticky; top: calc(var(--header-height) + 16px);`，去掉当前"白卡无边界"问题，加 `1px solid var(--border-light)`。
- 宽度 196px（当前 180px 在 14px 字号下偏挤）。

---

## 6. 页面级方案

### 6.1 个人中心首页 `/user`（重构 `Profile.vue`）

**桌面线框**

```
┌────────────────────────── 内容区（约 960px）──────────────────────────┐
│ ┌──────────────────────── 身份卡 ────────────────────────────────┐  │
│ │  ⬤  昵称  [银卡会员]                        成长值 1,860 / 5,000 │  │
│ │ 64px  ID 10086 · 2025-08 注册        ┌───────────────┐          │  │
│ │                                     │▓▓▓▓▓▓▓░░░░░░░│ 距金卡 3,140│  │
│ │      已支付订单 12   累计实付 ¥3,280   [编辑资料]                │  │
│ └───────────────────────────────────────────────────────────────┘  │
│ ┌─────────────── 我的订单                          查看全部 > ────┐  │
│ │   [钱包]      [包裹]      [货车]      [评价]      [售后]       │  │
│ │   待付款      待发货      待收货      待评价      退款/售后      │  │
│ │     2           1           0           3           0          │  │
│ └───────────────────────────────────────────────────────────────┘  │
│ ┌─────────────── 资产与工具 ─────────────────────────────────────┐  │
│ │  优惠券 3 张   收藏 8 件   地址 2 个   会员中心   个人资料       │  │
│ └───────────────────────────────────────────────────────────────┘  │
│ ┌─────────────── 为你推荐 ───────────────────────────────────────┐  │
│ │  [商品卡]   [商品卡]   [商品卡]   [商品卡]                      │  │
│ └───────────────────────────────────────────────────────────────┘  │
│ ┌─────────────── 服务承诺 ───────────────────────────────────────┐  │
│ │  正品保障     7 天无理由     极速退款     全场包邮             │  │
│ └───────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**模块说明**

1. **身份卡**
   - 头像 64px，白环 + `#FFD8B3` 1px 描边；右侧昵称 18/600，等级用小胶囊（浅橙底 + 橙字），不再是纯文字。
   - 成长值进度条 4px，放在右侧三组数据的上方或右下；文案「距离「金卡会员」还差 3,140 成长值」。
   - 右下「编辑资料 →」跳 `/user/personal-info`。
   - 移动端：头像与昵称一行，成长值与统计换行铺开，不并排挤压。
   - 数据字段直接复用 `getMemberProfile()`：`name / avatar / levelName / growthValue / growthToNext / nextLevelName / paidOrderCount / totalPaidAmount`。

2. **我的订单**
   - 5 个入口：待付款、待发货、待收货、待评价、退款/售后。
   - 图标改为 `Wallet / Box / Van / ChatDotRound / RefreshLeft`，放在 44px 圆底（对应 `--status-*-bg`），角标右上。
   - 「待评价」= `orderStatus === 5 && !reviewed`。后端 `OrderVO` 已返回 `reviewed`，可直接用，不需要再猜。
   - 角标数量直接读 `/api/orders/counts`（`pendingPay / pendingShip / pendingReceive / pendingReview`）和 `/api/after-sales/counts`（售后），不再为了数字拉全量订单。
   - 桌面 5 等分；≤768px 5 列，图标 24px、标签 12px。

3. **资产与工具**
   - 合并原「常用功能」宫格，一横条 5 项：优惠券 / 收藏 / 地址 / 会员 / 个人资料；每项显示数量（能拿到就显示，拿不到只显示文本）。
   - 数量来源：`getMyCoupons()`、`getFavorites()`、`getAddressList()`；用 `Promise.allSettled` 并行，任一失败不影响整页。

4. **为你推荐**
   - 复用 `getHome(4)` 的"猜你喜欢"数据 + 现有 `ProductCard.vue`，4 列。没有数据或接口失败时整块隐藏，不显示空态。
   - 推荐位是首页新增的展示型调用，不影响核心信息；若想缩小首屏请求，可放到 P3。

5. **服务承诺**
   - 静态 4 项，线性图标 + 13px 文字，居中排列，`--bg-soft` 底、无卡片阴影，作为页面收尾。

**删除项**

- 删除彩虹渐变。
- 删除 6 格「常用功能」宫格（内容并入资产条和侧栏）。
- 删除 4 个相同 Box 图标。

---

### 6.2 订单列表 `/user/orders`（对齐京东截图）

**桌面线框**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 我的订单                                  [ 搜索订单号 / 商品 ]        │
│ [全部 12] [待付款 2] [待发货 1] [待收货 0] [待评价 3] [已完成 6] [已取消 2] │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ 2026-08-16 16:21   订单号 3592...  已完成                        │ │
│ ├─────────────────────────┬────────────────────────┬───────────────┤ │
│ │ [商品图 72]              │ 商品名称（两行截断）     │ ¥533.00       │ │
│ │                         │ 规格 / 共 1 件           │ 在线支付       │ │
│ │                         │                         │ [查看详情]     │ │
│ │                         │                         │ [再次购买]     │ │
│ ├─────────────────────────┴────────────────────────┴───────────────┤ │
│ │ 共 1 件   实付 ¥533.00                    [申请售后] [确认收货]     │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**关键改动**

1. **搜索**：标题右侧输入框，回车调订单分页接口（见第 9 节），`placeholder="搜索订单号 / 商品名称"`；清空后恢复全量。后端 `keyword` 已支持，缺的是分页接口。
2. **Tab 数量**：改为读取后端计数接口，不再前端 `tabCount()`。Tab 顺序：全部 / 待付款 / 待发货 / 待收货 / 待评价 / 已完成 / 已取消。「退款/售后」不再作为订单 Tab，走侧栏独立页 `/user/aftersales`（后端已有专用接口）。
3. **订单卡三段结构**：
   - 表头：`--bg-soft` 底、12px 灰字；左侧下单时间 + 订单号；右侧状态文字（语义色），去掉 `type="warning"` 写死。
   - 商品区：图片 80×80（移动 60），名称两行，单价 + 数量。
   - 右列（桌面）：金额、支付方式、操作按钮纵向排列；≤768px 收到底部横排。
4. **状态样式**使用文字 + 圆点，不放大色块：

```js
const STATUS_META = {
  1: { label: '待付款', color: 'var(--status-pay)',      bg: 'var(--status-pay-bg)',      icon: Wallet },
  3: { label: '待发货', color: 'var(--status-ship)',     bg: 'var(--status-ship-bg)',     icon: Box },
  4: { label: '待收货', color: 'var(--status-receive)',  bg: 'var(--status-receive-bg)',  icon: Van },
  5: { label: '已完成', color: 'var(--status-done)',     bg: 'var(--status-done-bg)',     icon: CircleCheck },
  6: { label: '已取消', color: 'var(--status-cancel)',   bg: 'var(--status-cancel-bg)',   icon: CircleClose },
}
```

> 建议把这段状态元数据抽到 `src/constants/order.js`，`Profile.vue` 与 `OrderList.vue` 共用，消除两处重复的 `STATUS` 常量。

5. **操作按钮**：主操作（去支付/确认收货）用橙色实心/描边；次操作（取消、售后、查看物流）用文字按钮；「再次购买」在已完成订单上出现（商品详情加入购物车或直接跳商品页，按现有能力先跳商品页）。
6. **加载与空态**：`v-loading` 换成骨架卡（2–3 张灰色占位卡片）；空态用 `el-empty` + 「去逛逛」按钮（与收藏页一致）。
7. **移动端**：表头两行（时间 + 状态 / 订单号），商品行保持左图右文，操作按钮整行右对齐，44px 触控高度。

---

### 6.3 退款/售后 `/user/aftersales`（新增页面）

后端和前端 API 都已具备：`GET /api/after-sales`（status / search / startDate / endDate / dateField）、详情、日志、申请、寄回、确认取件。当前缺口是**页面**，不是接口。

**桌面线框**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 退款/售后                              [ 搜索售后单号 / 商品 ]        │
│ [全部 5] [审核中 2] [退货中 1] [退款中 1] [已退款 1] [售后拒绝 0]      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ 售后单 AS2026...   申请时间 2026-08-12   订单 ORD2026...   审核中  │ │
│ │ 商品名称 / 规格                     退款金额 ¥89.00                │ │
│ │ 售后类型：退货退款   原因：商品破损         [查看进度] [补充凭证]    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**关键改动**

- 状态 Tab 使用后端 `/after-sales/status-constants` 返回的常量，不在前端硬编码颜色；「审核中 / 退货中 / 退款中」用对应语义色。
- 售后卡字段：售后单号、申请时间、关联订单号、商品名/图、退款金额、售后类型、原因、当前状态、主操作。
- 主操作按状态切换：`reviewing` → 查看进度；`returning` 且自行寄回 → 填写物流；`returning` 且上门取件 → 确认取件；终态 → 查看详情。
- 空态文案按 Tab 变化；列表分页依赖第 9 节的分页接口，未上线前先用全量列表。
- 移动端卡片：状态放右上，金额单独一行，操作按钮整行。

### 6.4 会员中心 `/user/member`

保留现有金卡设计（它是全站少数"有质感"的模块），做三处统一：

- 金卡内边距、圆角、进度条颜色改用 token，去掉硬编码 `24px`。
- 等级列表每项加「当前」橙色竖条，权益文案前加 `CircleCheck` 小图标。
- 已满级时进度条右侧改「已满级」胶囊，不用 100% 空跑。

### 6.5 我的收藏 `/user/favorites`

- 由纵向列表改为**商品卡网格**：`repeat(auto-fill, minmax(180px, 1fr))`，图 1:1，两行名称，价格 + 底部「取消收藏」。
- 桌面 4 列、平板 3 列、移动 2 列。
- 取消收藏在 hover 时浮现在图片右上角（移动端常显），保留气泡确认。
- 空态加「去逛逛」。

### 6.6 我的优惠券 `/user/coupons`

- Tab 补数量（可用 / 已使用 / 已过期）。
- 券卡做成票券：左面额区浅橙底 + 右侧信息区，中间用「虚线 + 两个圆缺口」分割；过期券整体 `opacity: .55`、去饱和。
- 可用券右上加「去使用」链接（跳首页）。
- 移动端左区 96px，面额字号 16。

### 6.7 收货地址 `/user/addresses`

- 卡片列表：姓名 + 手机 + 默认胶囊 + 地址两行，右上下拉或「编辑 / 删除」文字按钮。
- 新增按钮保持在页头右上；≤768px 改为底部 `sticky` 全宽按钮，避免页头拥挤。
- 默认地址卡左侧加 3px 橙条。

### 6.8 个人资料 `/user/personal-info`

- 拆成两张卡：「基本资料」（头像 / 昵称 / 用户名 / 手机号）和「账号安全」（注册时间 / 注销账号）。
- 字段行统一 `label 96px + 值 + 右侧操作`，label 用 13px 次要色；移动端 label 在上、值在下。
- 头像 hover 出现「更换」遮罩（移动端直接点）。
- 注销按钮保留危险色，但只在「账号安全」卡内，不再单独占一个大区块。

### 6.9 订单详情 `/user/orders/:id`

不改结构，仅统一：状态头部用同一套状态色；物流时间线用 13px；金额区用 `--font-num`。

---

## 7. 移动端适配（≤768px）

| 模块 | 桌面 | 移动 |
|---|---|---|
| 侧栏 | 196px 竖排 sticky | 顶部横向滚动 chip（沿用现有做法，补图标） |
| 身份卡 | 头像左、统计右 | 头像+昵称一行，成长值/统计各占一行 |
| 订单入口 | 5 等分 | 5 等分，图标 24，标签 12，触控 ≥44 |
| 资产条 | 5 等分 | 3×2 网格 |
| 订单卡 | 右列操作 | 底部整行按钮，主操作在右 |
| 收藏 | 4 列网格 | 2 列网格 |
| 地址新增 | 页头按钮 | 底部固定按钮 + 安全区 |

断点严格沿用项目约定：`≤768px / 769–1024px / >1024px`，不新增断点。

---

## 8. 交互与状态规范

- **加载**：列表页用骨架卡，详情页保留 `v-loading`；骨架色 `#F2F3F5`。
- **空态**：`el-empty` + 一句引导 + 一个主按钮；订单空态文案按 Tab 变化（"还没有待付款订单"）。
- **错误**：`ElMessage.error(e?.message || '加载失败')` 保持现有约定，不新增全局错误页。
- **hover**：仅可点击卡片位移 2px + 阴影；列表行只变底色。
- **焦点**：保留全局 `:focus-visible` 橙色描边；自定义按钮补 `min-height: 44px`。
- **数字**：金额、成长值、数量统一 `font-variant-numeric: tabular-nums`。

---

## 9. 后端工作清单（已核对 `e-commerce-boot`）

> 核对范围：`order-service`、`user-service`、`aftersale-service`、`product-service`。
> 结论：视觉方案需要的数据**大部分已经具备**，但有 **1 个现有 bug、2 个接口缺口** 和 **1 项性能改造**必须先补，否则新页面只能"看起来好看、点下去不可用"。

### 9.1 已具备，不需要后端改动

| 需求 | 现有能力 | 位置 |
|---|---|---|
| 身份卡全部字段 | `GET /api/member/profile`：`levelName/growthValue/growthToNext/paidOrderCount/totalPaidAmount` | `MemberController` / `MemberProfileVO` |
| 订单搜索 | `GET /api/orders?keyword=`，按订单号、商品名模糊 | `OrderController` / `OrderMapper.xml` |
| 订单卡"是否已评价" | `OrderVO.reviewed` | `OrderServiceImpl.toVO` |
| 订单卡"是否有售后" | `OrderVO.afterSale`（`EXISTS after_sales`） | `OrderMapper.xml` |
| 物流摘要 | `OrderVO.logisticsStatus / latestTrace` | `OrderServiceImpl.toVO` |
| 订单操作 | 支付 / 确认收货 / 取消 / 删除 | `OrderController` |
| 售后全流程 | 列表 / 详情 / 日志 / 申请 / 寄回 / 确认取件 | `AfterSaleController` |
| 优惠券 | `GET /api/coupons/mine?status=` | `CouponController` |
| 收藏 | `GET /api/favorites` | `FavoriteController` |
| 地址 | `GET /api/address` | `AddressController` |
| 会员等级 | `GET /api/member/levels` | `MemberController` |
| 推荐位 | `GET /api/home?limit=4` | `HomeController` |
| 头像 / 昵称 / 注销 | `/api/user/avatar`、`/api/user/name`、`/api/user/deactivate` | `UserController` |

### 9.2 必须补（P0）

#### 9.2.1 手机号绑定：PC 验证码流程目前是坏的（bug）

- 前端 `PersonalInfo.vue`：先 `sendLoginCode(phone)` 拿模拟验证码，再 `bindPhone(phone, code)`，即 `POST /api/user/phone`，body 是 `{phone, code}`。
- 后端 `PhoneDTO` 只有 `code` 字段；`UserServiceImpl.bindPhone(userId, code)` 把这个 `code` 当成微信 `getPhoneNumber` 的 code 去换手机号。
- 结果：PC 上点"绑定手机号"必然失败（微信接口不认本地模拟码），个人资料页的换绑功能实际上不可用。
- 改造：
  1. `PhoneDTO` 增加可选 `phone`。
  2. `UserServiceImpl.bindPhone` 按 `phone` 是否存在分流：
     - `phone != null`：校验 `^1\d{10}$` → 读 Redis `pc:auth:code:{phone}` 并原子删除（复用 `PcAuthServiceImpl` 的 GET_AND_DELETE Lua，抽成 `PhoneCodeStore`，不要复制脚本）→ 码不匹配返回 `400 验证码错误或已过期` → `userMapper.findForLoginByPhone(phone)` 命中他人返回 `409 该手机号已被其他账号绑定` → 更新 `user.phone`。
     - `phone == null`：保持微信 `getPhoneNumber` 流程不变，兼容小程序。
  3. 路径不变，网关无需改路由。
- 实施状态：已落地。`PhoneDTO` 增加 `phone`；验证码读取抽成 `PhoneCodeStore` 并同时供 `PcAuthServiceImpl` 登录复用；`bindPhone` 按 `phone` 分流，PC 走短信码，微信流程原样保留。
- 验收：PC 正确码成功；错误/过期码 400；他人手机号 409；小程序绑定仍成功。

#### 9.2.2 订单列表：状态筛选 + 计数 + 分页

- 现状：`GET /api/orders?keyword=` 返回全量 `List<OrderVO>`，无 `status`、无分页、无计数。前端要做 Tab 数量，只能拉全量再本地数。
- 新增两个接口（保留旧接口，避免破坏其他调用）：
  - `GET /api/orders/page?status=&keyword=&page=1&pageSize=10` → `PageVO<OrderVO>`
  - `GET /api/orders/counts` → `OrderCountsVO`
- `status` 直接用 `orderStatus` 数字（1/3/4/5/6，可选），兼容现有 `?status=` 跳转；语义值留到后续加「待评价」筛选时再补。
- `OrderCountsVO`：`all, pendingPay, pendingShip, pendingReceive, pendingReview, finished, cancelled, refunded`。
- 实施状态：已落地。后端 `GET /api/orders/page` + `/api/orders/counts` 已上线；前端 `OrderList.vue` 已切到服务端分页（每页 10 条）、Tab 角标走 `/counts`、支持订单号/商品名搜索、取消/收货后空页自动回退；批量装配去 N+1 见 9.2.3。
- 统计口径：
  - 待付款 = `order_status = 1`
  - 待发货 = `order_status = 3`
  - 待收货 = `order_status = 4`（后端 `desc` 是"已发货"，C 端统一显示"待收货"，由前端 `constants/order.js` 映射）
  - 待评价 = `order_status = 5 AND NOT EXISTS (product_reviews WHERE order_id = o.id AND is_deleted = 0)`
  - 已完成 = `order_status = 5`
  - 已取消 = `6`；已退款 = `7`
- SQL：复用 `listByUser` 的 WHERE，新增 `countByUser` 与 `countsByUser`。计数用一条 `SUM(CASE WHEN ...)` 聚合，不要 7 次 count。
- 分页默认 10、上限 50；`page < 1` 归 1。
- 改动：`OrderController`、`OrderService(+Impl)`、`OrderMapper(+XML)`、新增 `OrderCountsVO`。
- 前端：`OrderList.vue` 切到 `/page` + `/counts`，删除本地 `tabCount()`。

#### 9.2.3 订单列表批量装配，去掉 N+1

- 现状 `toVO` 每单执行：`orderItemMapper.listByOrderId`、`productReviewMapper.findByOrderId`、`LogisticsBuilder.build`；而 `LogisticsBuilder` 内部还要查一次 `DeliveryExpressMapper`。
- 10 条订单 ≈ 10 次商品 + 10 次评价 + 10 次物流 + 10 次快递字典，再加计数，首屏 SQL 会到 30+。
- 改造：
  - `OrderItemMapper.listByOrderIds`：一次 IN 查询，按 orderId 分组。
  - `ProductReviewMapper.findReviewedOrderIds`：一次 IN 查询，返回 `Set<Long>`。
  - 快递公司字典一次查询后在内存映射；`LogisticsBuilder.build` 只做纯计算，不再查库。
  - `toVO` 拆成 `toVO(order, items, reviewed, logistics)`，分页时批量装配。
- 实施状态：已落地。`pageOrders` 现在固定 4~5 条 SQL（count / 分页 / 明细 / 评价 / 快递字典），与每页条数无关；单条详情仍走原 `toVO`。
- 验收：10 条订单分页 ≤ 6 条 SQL；`/counts` 不构建 VO。

#### 9.2.4 售后列表：分页 + 计数

- 现状：`GET /api/after-sales` 返回 `List<AfterSaleVO>`，每行 `toVO` 再查明细，无分页、无计数；新增的 `/user/aftersales` 页面需要 Tab 数量。
- 新增：
  - `GET /api/after-sales/page?status=&search=&page=&pageSize=` → `PageVO<AfterSaleVO>`
  - `GET /api/after-sales/counts` → `AfterSaleCountsVO`（`all / reviewing / returning / refunding / exchanging / exchanged / refunded / rejected`）
- 批量明细：`listByAfterSaleIds` 一次查出，按 `afterSaleId` 分组。
- 保留旧列表接口；前端新页面用 `/page` + `/counts`。
- 改动：`AfterSaleController`、`AfterSaleService(+Impl)`、`AfterSaleMapper(+XML)`、新增 `AfterSaleCountsVO`。
- 实施状态：已落地。新增接口与 `AfterSaleCountsVO`、`listByAfterSaleIds` 批量明细；旧 `/api/after-sales` 保留；前端新增 `/user/aftersales` 页面。

### 9.3 建议补（P1/P2，不阻塞上线）

1. **首页资产数量**：本期可直接用 `Promise.allSettled` 并行调 `/coupons/mine`、`/favorites`、`/address` 取 `.length`，零后端改动；缺点是传输明细。量上来后再加轻量计数：
   - `GET /api/coupons/mine/counts` → `{available, used, expired}`
   - `GET /api/favorites/count`
   - `GET /api/address/count`
   - 或者由网关聚合为 `GET /api/user/overview`，一次返回资产 + 待办数量；跨服务失败要能降级。
2. **收藏分页**：`GET /api/favorites/page` + `total`，收藏超过 50 条时再上。
3. **账号安全**：若要展示"最近登录时间/设备"，需要 auth-service 增加登录日志；本期不做，页面只展示注册时间。
4. **推荐位**：`/api/home?limit=4` 已可用，无后端工作。

**已具备，无需新增**

- 订单状态常量：`GET /api/admin/orders/status-constants`（`AdminOrderController#statusConstants` → `AdminOrderServiceImpl#getStatusConstants()`，返回 `map`=code→文案、`color`=code→颜色）。注意该控制器带类级 `@RequirePerm("order:order:list")`，是后台身份接口，C 端不能直接调用。
- 售后状态常量：`GET /api/after-sales/status-constants`（`AfterSaleController#statusConstants`），已在 `WebMvcConfig` 白名单内，C 端可直接用；前端 `api/aftersale.js` 已封装 `getAfterSaleStatusConstants`。
- C 端订单页本期继续用前端 `constants/order.js` 映射文案与颜色，不阻塞。若后续希望 C 端文案与后台同源，可在 `OrderController` 加一个只读转发（P2，非必须）。

### 9.4 接口契约汇总

| 优先级 | 接口 | 入参 | 出参 |
|---|---|---|---|
| P0 | `POST /api/user/phone` | `{phone, code}` 或 `{code}` | 兼容 PC / 微信两种绑定 |
| P0 | `GET /api/orders/page` | `status, keyword, page, pageSize` | `PageVO<OrderVO>` |
| P0 | `GET /api/orders/counts` | — | `OrderCountsVO` |
| P0 | `GET /api/after-sales/page` | `status, search, page, pageSize` | `PageVO<AfterSaleVO>` |
| P0 | `GET /api/after-sales/counts` | — | `AfterSaleCountsVO` |
| P1 | `GET /api/coupons/mine/counts` | — | 可用 / 已用 / 过期 |
| P1 | `GET /api/favorites/count` | — | `number` |
| P1 | `GET /api/address/count` | — | `number` |
| P2 | `GET /api/user/overview` | — | 资产 + 待办聚合 |
| 已有 | `GET /api/admin/orders/status-constants` | — | `{map, color}`（后台权限，C 端不直连） |
| 已有 | `GET /api/after-sales/status-constants` | — | 售后状态常量（C 端可用） |

### 9.5 数据库与索引

- 先确认现有索引再补，不要重复建：
  - `orders (user_id, is_deleted, created_at)`：列表分页与排序
  - `orders (user_id, is_deleted, order_status)`：状态筛选与计数
  - `product_reviews (order_id, is_deleted)`：批量判断是否已评价
  - `after_sales (user_id, is_deleted, created_at)`、`(user_id, status, is_deleted)`
- 计数查询只扫订单表 + `EXISTS` 子查询，不要 JOIN 商品/明细。
- 项目约定：时间由 Java `LocalDateTime.now()` 传入，不用 MySQL `NOW()`，避免时区差 8 小时；分页与计数保持一致。
- 所有查询带 `is_deleted = 0`。

### 9.6 兼容性与实施顺序

- 只**新增**接口和可选字段，不改旧接口响应结构；旧 `/api/orders`、`/api/after-sales` 保留。
- `/api/user/phone` 通过 `phone` 是否存在分流，向后兼容微信端。
- 新路径都在既有 `/api/orders`、`/api/after-sales` 前缀下，网关不需要改配置。
- 顺序：**先合后端（9.2.1 → 9.2.2/9.2.3 → 9.2.4）→ 再切前端**；切换前旧接口仍可用，可灰度。

### 9.7 后端验收

- [ ] PC 验证码绑定成功；错误码/被占用手机号有明确提示；微信绑定不受影响。
- [ ] 订单 7 个 Tab 的数量与卡片一致；「待评价」只统计 `FINISHED && !reviewed`。
- [ ] 订单分页翻页正确，`keyword` + `status` 组合过滤正确，空结果返回 `total = 0`。
- [ ] 10 条订单首屏 SQL ≤ 6，无逐单物流/评价查询。
- [ ] 售后各状态计数与列表一致；分页与关键词组合正确。
- [ ] 旧接口回归：订单列表、售后列表、小程序绑定手机号均正常。

---

## 10. 实施计划

> 实施状态（2026-11-07）：P0 后端（手机号绑定、订单分页/计数/去 N+1、售后分页/计数）已完成；
> P1 外壳与首页、P2 订单页与售后页、P3 五个子页已完成；前端 `npm run build` 通过；
> 剩余：索引脚本未补、运行时联调（绑定手机号/售后分页/角标）与 P4 视觉走查。

### P0：后端接口（先行，不阻塞视觉）

1. 修 `POST /api/user/phone` 的 PC 验证码绑定（9.2.1）。
2. 新增订单分页 + 计数接口，并批量装配去 N+1（9.2.2、9.2.3）。
3. 新增售后分页 + 计数接口（9.2.4）。
4. 补索引，跑 9.7 的后端验收。

### P1：外壳 + 首页（视觉收益最大）

1. `src/style/index.css`：追加第 4.1 节变量。
2. `src/views/layouts/UserLayout.vue`：重写侧栏（渲染图标、分组、选中竖条、描边、196px）。
3. `src/views/user/Profile.vue`：重写身份卡 + 订单入口 + 资产条 + 服务承诺；删除渐变与功能宫格。
4. 新增 `src/constants/order.js`：状态元数据（标签/颜色/图标），供首页与订单页共用。

### P2：订单页 + 售后页（对齐用户给的截图）

5. `src/views/user/OrderList.vue`：切到 `/api/orders/page` + `/api/orders/counts`，三段式订单卡、状态语义色、搜索、骨架/空态。
6. 新增 `src/views/user/AfterSaleList.vue` + 路由 `/user/aftersales`：接 `/api/after-sales/page` + `/counts`，状态 Tab、售后卡、进度入口。

### P3：子页统一

7. `Favorites.vue` 改网格；`Coupons.vue` 改票券；`AddressList.vue` 卡片化；`PersonalInfo.vue` 双卡分区（含手机号绑定修复后的联调）；`Member.vue` 去硬编码。
8. `Profile.vue` 接资产数量（`Promise.allSettled`）与「为你推荐」（`getHome(4)` + `ProductCard`）。

### P4：打磨

9. 骨架屏、空态插画/按钮、hover/focus 细节、四档截图走查。
10. `npm run build` 验证；登录后走查 `/user`、`/user/orders`、`/user/aftersales`、`/user/favorites`、`/user/coupons`、`/user/addresses`、`/user/personal-info`、`/user/member`。

**改动文件清单（前端）**

```
src/style/index.css                    追加变量
src/constants/order.js             新增（状态元数据）
src/views/layouts/UserLayout.vue   重写侧栏
src/views/user/Profile.vue         重写首页
src/views/user/OrderList.vue       重写订单卡 + 搜索 + 分页
src/views/user/AfterSaleList.vue   新增售后列表页
src/router/index.js                新增 /user/aftersales 路由
src/views/user/Favorites.vue       网格化
src/views/user/Coupons.vue         票券化
src/views/user/AddressList.vue     卡片化
src/views/user/PersonalInfo.vue    双卡分区
src/views/user/Member.vue          去硬编码、统一 token
src/api/order.js                   新增 page/counts 封装
src/api/aftersale.js               新增 page/counts 封装
```

**改动文件清单（后端 `e-commerce-boot`）**

```
user-service/.../dto/PhoneDTO.java                       增加 phone
user-service/.../support/PhoneCodeStore.java             新增（验证码取出即删除，登录/绑定共用）
user-service/.../service/impl/PcAuthServiceImpl.java     改用 PhoneCodeStore
user-service/.../service/impl/UserServiceImpl.java       按 phone 分流 PC / 微信
user-service/.../controller/UserController.java          改传 phone（路径复用）
order-service/.../controller/OrderController.java        新增 /page /counts
order-service/.../service/OrderService.java             新增分页/计数
order-service/.../service/impl/OrderServiceImpl.java     批量装配去 N+1
order-service/.../mapper/OrderMapper.java               新增分页/计数方法
order-service/src/main/resources/mappers/order/OrderMapper.xml  新增 SQL
order-service/.../vo/OrderCountsVO.java                  新增
order-service/.../mapper/OrderItemMapper.java + XML      新增 listByOrderIds
order-service/.../mapper/ProductReviewMapper.java + XML  新增 findReviewedOrderIds
aftersale-service/.../controller/AfterSaleController.java 新增 /page /counts
aftersale-service/.../service/AfterSaleService(+Impl)     新增分页/计数
aftersale-service/.../mapper/AfterSaleMapper.java + XML   新增分页/计数/批量明细
aftersale-service/.../vo/AfterSaleCountsVO.java           新增
docs/sql/xxx_add_user_center_indexes.sql                  索引脚本（待补，不阻塞功能）
```

**不改动**

- 结算 / 购物车 / 商品页。
- 旧 `/api/orders`、`/api/after-sales` 列表接口保留，避免影响小程序与后台。
- 现有移动端底部 TabBar（`/user` 已归属 "我的"）。

---

## 11. 验收清单

- [ ] 首页不再出现蓝/红/橙撞色渐变，身份卡为白底 + 橙色柔光。
- [ ] 侧栏图标正常渲染，选中项有橙色竖条 + 浅橙底 + 加粗。
- [ ] 首页 5 个订单入口图标各不相同，角标位置正确。
- [ ] 订单页状态颜色区分：待付款橙、待发货蓝、待收货绿、已完成灰、已取消浅灰、售后红。
- [ ] 订单页搜索可用，能按订单号/商品名过滤；清空恢复全量；分页翻页正常。
- [ ] 订单 7 个 Tab 数量来自 `/api/orders/counts`，与卡片数一致；「待评价」只含未评价的已完成订单。
- [ ] 售后页状态 Tab、计数、分页、进度入口正常；「退款/售后」侧栏入口可直达。
- [ ] 个人资料页 PC 验证码绑定手机号成功，错误码/占用号提示正确。
- [ ] 桌面端订单操作在右列；≤768px 收到底部一行且触控 ≥44px。
- [ ] 375 / 768 / 1024 / 1440 四档无横向滚动、无遮挡。
- [ ] 所有新增颜色来自 token，页面内无新硬编码色值。
- [ ] 空态、加载骨架、接口失败的降级都可见且不白屏。
- [ ] `npm run build` 通过；8 个 `/user` 子路由逐一走查无回归。

---

## 12. 风险与取舍

1. **品牌色选择**：京东用红 `#E1251B`，我们保留橙 `#FF6700`。理由是换主色会连带影响商品页、购物车、结算页和大促标签，收益不抵成本。若确实想要"京东红"，应作为全站主题变更单独评估，不能只在个人中心局部改红（会出现两套主色）。
2. **「待评价」口径**：`OrderVO.reviewed` 已存在，但 `toVO` 是逐单查评价表，属 N+1。批量接口上线前，订单页首屏会偏慢；上线后以 `status=5 && !reviewed` 为准。不要在前端把 `FINISHED` 整体当待评价，会多算。
3. **手机号绑定是阻塞项**：`POST /api/user/phone` 当前只接受微信 code，PC 验证码流程会失败。不先修这个，个人资料页的换绑功能就是死按钮；修复时要同时校验手机号归属，避免把他人手机号绑到自己账号。
4. **分页会改变前端取数方式**：`OrderList.vue` 从"一次拉全量 + 本地过滤"改成"服务端分页 + 计数"，要同步处理 Tab 切换时的 `page` 重置、搜索回车、空结果 `total=0`，不要出现"第 3 页切 Tab 后还是第 3 页"。
5. **资产数量增加请求**：首页会从 2 个请求变成 4–5 个。必须用 `Promise.allSettled`，任一失败不影响主内容；不建议为了数量阻塞首页渲染。
6. **推荐位依赖 `getHome`**：首页接口可能返回分类+商品，字段需确认；没有数据就隐藏整块，不显示空卡片。
7. **密度控制**：京东信息密度高（12px 字号、紧凑行高），我们的触控目标和表单字号（移动端 16px）更高。只借结构，不借字号，避免"看起来像京东但点不中"。
8. **不要照搬的业务**：订单回收站、发票、企业购、京东 PLUS、15 项导航均无后端支撑，不新增空入口。

---

## 13. 改版前后对照

| 维度 | 现在 | 改版后 |
|---|---|---|
| 身份区 | 蓝红橙渐变，白字 | 白卡 + 橙色柔光，头像/等级/成长值/统计 |
| 侧栏 | 8 个纯文字按钮 | 3 组、图标 + 橙色竖条选中态 |
| 订单入口 | 4 个相同 Box 图标 | 5 个语义图标 + 状态浅色圆底 |
| 首页结构 | 名片 + 订单 + 6 格宫格 | 名片 + 订单 + 资产 + 推荐 + 服务 |
| 订单卡 | 灰头 + 橙色标签 | 表头三段 + 状态语义色 + 右列操作 |
| 订单搜索 | 无 | 支持订单号/商品名 |
| 订单数量/分页 | 拉全量本地数 | 后端 `/counts` + `/page` |
| 退款/售后 | 只能从订单详情进 | 独立列表页 + 状态 Tab |
| 手机号绑定 | PC 端实际不可用 | 修复后 PC 验证码可绑定 |
| 收藏 | 列表行 | 商品卡网格 |
| 优惠券 | 左右分栏 | 票券 + 缺口 + 可用/过期状态 |
| 移动端 | 基本可用 | 5 列订单入口 / 2 列收藏 / 底部固定按钮 |
