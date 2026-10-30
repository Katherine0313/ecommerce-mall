# 任务计划（task_plan）

> 本文件回答「接下来做什么、按什么顺序做、做完怎么算合格」。
> 代码现状与后端契约见 [findings.md](./findings.md)，执行记录见 [progress.md](./progress.md)。

**基线**：2026-10-30　**起点 commit**：`e0fc7f6`

---

## 零、总体原则

1. **先修错，再做新功能。** 探索发现的 P1（CSS 变量失效）会让后续所有页面的配色评审失真，必须在写新页面前修掉。
2. **一个阶段一个 commit**，每阶段单独构建 + 自测通过再进下一阶段。
3. **只改当前阶段必需的文件**，不顺手重构、不升级依赖。
4. 验收标准写在这里，做完逐条勾；勾不上的不要标完成。
5. ⛔ **不要 `git checkout .` / `git stash` 撤销工作区。** 当前工作区是一次未完成的大重构
   （全局样式换体系 + 列表/搜索页改分页接口 + sticky 头部 + 布局），**只有 `Home.vue` 是倒退**。
   撤销会把这些一起丢掉。逐文件处理，详见 findings.md 第八节。

---

## 阶段一：修 Bug 与补齐地基（预计 0.5 天）

**目标**：让现有页面的表现和代码意图一致，为后续开发清路。

### 1.1 修 CSS 变量（P1）—— 同步重构没做完的改名

**根因**：工作区把全局样式从 `src/styles/global.css` 换成 `style/index.css` 时，变量命名体系整体换了
（`--mall-*` → `--color-*` / `--text-*` / `--border-*`），但 **3 个组件共 15 处 `var(--mall-*)` 一处都没同步改**。

**修法**：在组件里做机械替换，**统一到新命名体系**，不要把旧变量补回来（两套并存会再次漂移）：

| 旧变量 | 新变量 | 出现次数 |
|---|---|---|
| `--mall-primary` | `--color-primary` | 7 |
| `--mall-text-light` | `--text-secondary` | 7 |
| `--mall-border` | `--border-color` | 1 |

涉及文件：`src/components/ProductCard.vue`（5 处）、`src/views/ProductDetail.vue`（7 处）、`src/layouts/DefaultLayout.vue`（3 处）。

**验收**：首页/列表/详情三页截图检查——价格是橙色、副标题是浅灰、头部有下边框。
`grep -rn "var(--mall-" src/` 应为零结果。

### 1.2 补 `/login` 路由（P2）

- 新建 `src/views/Login.vue`（哪怕先是个占位页），在 `src/router/index.js` 注册 `path: '/login'`，**放在 catch-all 之前**。
- 确认 401 时 `request.js` 跳 `/login?redirect=xxx` 能正常落地，且 `redirect` 参数能被读回。

**验收**：手动把 `localStorage.token` 改坏触发 401 → 页面落到登录页而不是弹回首页。

### 1.3 修导航死链（P4）

- `DefaultLayout.vue` 的「购物车」：要么先加 `meta.requiresAuth` 的 `/cart` 占位路由，要么暂时置灰/隐藏，**不要指向首页**。
- 登录按钮：P2 之前用 `ElMessage.info` 占位是合理的，但文案要写明「P2 接入」。

**验收**：头部所有链接点击后不出现「点了没反应」或「跳到首页」。

### 1.4 清理遗留（P7）

- 删 `src/stores/counter.js`（零引用）。
- 删空目录 `pages/`；`public/` 保留（放 favicon 用），补一个 favicon 或从 `index.html` 摘掉引用。
- `robots.txt` 重写为商城版（至少允许抓取，别拦商品页）。

**验收**：`grep -rn "counter" src/` 无结果；`npm run build` 通过。

### 1.5 补齐 README 删除后的文档缺口（P5）

`README.md` 已从仓库删除（暂存区 `D`），内容由三件套吸收。**但 README 有两处独有内容需要落到别处**（已补）：

- 移动端适配现状 → [findings.md](./findings.md) 第九节
- Nginx 配置与发布流程 → [findings.md](./findings.md) 第十节 + `deploy/xiaojiecpn-mall.conf`（仓库内唯一权威副本）

**本阶段要做**：三个 md 里所有「见 README 第 X 节」的引用已改为指向彼此或直接展开（已完成）；
后续新增内容不要再引用 README。

### 1.6 目录卫生（P5 附带）

- 把全局样式从根目录 `style/index.css` 挪到 `src/styles/index.css`（或 `src/styles/global.css`），
  恢复 Vite 项目约定，与另外两个前端（`src/` 标准）一致
- 删空目录 `pages/`（旧静态站残留）；`public/` 保留并补 favicon，或从 `index.html` 摘掉引用

**验收**：`git ls-files` 里不再有根目录 `style/`；`npm run build` 通过。

---

## 阶段二：P1 商品浏览（预计 1.5 天）

**目标**：把首页从静态线框改版成真实商城首页，让浏览链路完整可逛。

### 2.1 首页改版（Home.vue）✅ 已完成（2026-10-30）

**前置**：当前工作区的 `Home.vue` 是一份**未提交的静态线框草稿**，把 HEAD 里已实现的 `/api/home` 数据版覆盖了。
先 `git diff src/views/Home.vue` 看清草稿意图，**保留草稿的结构设计，在 HEAD 的数据逻辑之上改版**。

**已完成**：

- 数据：调 `getHome(12)` → `data.categories`（分类树，带 children）+ `data.recommend`（猜你喜欢）
- 结构：左侧分类 Sidebar（250px）＋ 中间 Banner 轮播 ＋ 右侧促销位；下方「猜你喜欢」商品网格
- **复用全局 `.product-grid`（auto-fill）**，不要用草稿里的 `repeat(6, 1fr)` 固定 6 列
- 草稿色 `#bac16f` / `#4ec6a0` 全部换成商城主色变量
- 三态齐全：`el-skeleton` / `el-alert` / `el-empty`
- 分类栏做成**淘宝式**：纯文字、不带图片、不带数量，**hover 浮出二级分类面板**
  （纯 CSS `:hover` + `position:absolute` 浮层；分类栏**不能加 `overflow:hidden`**，会把浮层裁掉）

| 区域 | 数据来源 |
|---|---|
| 左侧商品分类栏 | `GET /api/home` 的 `categories`（8 个一级 + 17 个二级） |
| 中间 Banner 轮播 | `public/swiper/swiper1~4.webp` |
| 右侧促销位 | `GET /api/products/hot?limit=4` |
| 下方猜你喜欢 | `GET /api/home` 的 `recommend` |

**轮播图实现要点**：

- 图片在 `public/swiper/`，随 `dist` 一起发布，不用在服务器上同步后端 upload 目录
- 比例 2:1（对齐小程序已有横幅 750×375），外层 `aspect-ratio: 2/1` 定高
- ⚠️ **`el-carousel` 不能用 `height="auto"`**：Element Plus 的 `.el-carousel__item{height:100%}` + 容器初始 0px
  会造成「测量高度 → 回填 0」死循环，最后高度为 0 看不见。改用外层 `aspect-ratio` + 轮播 `height="100%"`

**验收**：首页能看到真实分类和商品；断网/接口 500 时显示错误态而不是白屏。（已用 CDP 真实 hover + 像素测量验证）

### 2.2 商品详情补齐

- 图集：后端返回多图则可切换，单图则保持现状。
- 库存为 0 时「加入购物车」按钮置灰（`stock` 字段后端已给）。
- 补上 `specs`（规格参数，**非 SKU**）的展示——后端已下发，前端未用。
- 「加入购物车」先保持 P2 提示文案，但**必须带登录判断**（游客点击 → 引导登录）。

**验收**：详情页从列表页点得进去、返回正常；缺字段（无副标题/无原价）不报错。

### 2.3 列表页筛选（后端已支持，可直接上）

**修正**：之前判断「后端还没有价格/品牌/排序，要等后端补」——**不成立**。
`GET /api/products/page` 已支持全部筛选参数（源码实测）：

| 参数 | 说明 | 取值 |
|---|---|---|
| `page` / `pageSize` | 分页 | page 从 1 起；**pageSize 上限 60**（前端用 40 ✓） |
| `categoryId` | 分类 | — |
| `keyword` | 关键词 | — |
| `brand` | 品牌 | 精确匹配 |
| `minPrice` / `maxPrice` | 价格区间 | 不允许负数；min > max 报 400 |
| `sort` | 排序 | `default` / `price_asc` / `price_desc` / `newest`（非法值回落 default） |

前端要做的事：

- `src/api/product.js` 的 `getProductPage` 已经能透传任意 params，**接口层不用改**，视图层补筛选 UI 即可
- 筛选条件放路由 query（`/category/3?brand=Apple&sort=price_asc`），这样筛选态可分享、可刷新保持
- **不要做前端假筛选**——后端 `total` 是按筛选条件算的，前端过滤会让总数对不上

**验收**：切换分类/品牌/价格区间/排序时，列表与总数同步更新；旧请求的迟到响应不覆盖新结果（`loadSeq` 机制）。

### 2.4 骨架屏 / 空态 / 错误态统一

- 抽出 `EmptyState.vue` / `SkeletonList.vue` 之类的公共组件（与小程序端的 `components/` 目录结构对齐）。
- 三个视图共用，避免每个页面各写一份 el-empty。

**验收**：列表页、搜索页、详情页三处的空/错/加载表现一致。

---

## 阶段三：P2 账号 + 购物车（预计 2 天，**依赖后端**）

**前置**：后端必须先补 C 端 demo 登录接口，否则前端无法联调。

### 3.1 后端（`e-commerce-boot`）—— 需新增接口

**现状**：后端**没有任何 C 端非微信登录接口**（2026-10-30 源码实测）。

- `/api/login` 是后台管理员登录，签 `type=admin` 令牌，C 端接口会判 **403 无权访问**
- `/api/wxlogin` 需要小程序 `wx.login()` 的 code，PC 浏览器拿不到
- `grep -rn "generateUserToken"` 全仓库只有 `UserServiceImpl.login()` 一处调用

**要加的接口**（在 `user-service`，与 `WxLoginController` 并列）：

```
POST /api/demo-login?phone=13800138000
→ { success:true, data:{ token:"<user JWT>", id:123, avatar:null } }
```

| 项 | 要求 |
|---|---|
| 逻辑 | 按 `user.phone` 查 `User`，查不到就自动建（`openid` = `demo_<phone>`，`name` = `演示用户`），复用 `jwtUtil.generateUserToken(user.getId())` |
| 限流 | **`@Profile("dev")` + 配置开关双重限制**，生产 profile 不注册该 Bean |
| 白名单 | 同步加进 `common/WebMvcConfig.EXCLUDE_AUTH_PATHS`（否则拦截器先拦下来要 token） |
| 建表 | 不需要，`user` 表已有 `phone` / `name` / `avatar` / `openid` 字段 |
| 网关 | 不需要改，`/api/**` 兜底路由会送到 user-service |

> **本地临时通道**（不可作为正式方案）：`wechat.dev-mock-enabled=true` 时，微信 `jscode2session` 返回 40164 会回落成 mock openid `dev_mock_openid` 并正常签发 user 令牌，本地可用任意 code 调 `/api/wxlogin` 联调。生产必须关闭，且依赖微信先返回 40164，不稳定。

### 3.2 前端

- 新建 `src/api/cart.js`、`src/api/order.js`、`src/api/address.js`、`src/api/user.js`、`src/api/member.js`、`src/api/favorite.js`
  （后端接口已全部就绪，只是前端一个都没封装）
- `Login.vue`：手机号一键登录，登录成功取 `token` 存 localStorage，调用 `userStore.setToken`
- 登录成功后读 `redirect` 参数跳回原页面（**当前 request.js 已经会带这个参数，页面要真的用上**）
- 购物车页：列表 / 改数量 / 删除 / 清空 / 合计，对应 `/api/cart` 系列接口
  - `CartVO` 已带 `name` / `image` / `price` / `stock` / `subTotal` 快照，**不用再查商品**
- 地址管理：列表 / 新增 / 编辑 / 删除（DTO：`consignee, phone, region, detailAddress, isDefault`）
- 购物车状态放 `src/stores/cart.js`

**可直接参考小程序的实现**（C 端契约的活文档）：

| 小程序 | 商城端对应 | 说明 |
|---|---|---|
| `api/cart.js`（50 行） | `src/api/cart.js` | 照抄接口路径与参数名 |
| `api/order.js`（122 行） | `src/api/order.js` | 含 `idempotencyKey` |
| `api/address.js` / `coupon.js` / `member.js` / `favorite.js` / `after-sale.js` | 同名 `src/api/*.js` | |
| `api/login.js` | `src/api/auth.js` | ⚠ 但后端缺 C 端登录接口，见 3.1 |
| `components/quantity-stepper.vue` | `src/components/QuantityStepper.vue` | 数量步进器，购物车页与加购弹窗共用 |
| `components/address-popup.vue` | `src/components/AddressPopup.vue` | 地址弹窗，下单页与「我的」共用 |
| `components/login-popup.vue` | `src/components/LoginPopup.vue` | 登录弹窗，未登录点加购时弹出 |
| `components/order-card.vue` | `src/components/OrderCard.vue` | 订单卡片 |
| `utils/format.js`（fmtMoney / formatOrderTime / goodsImgUrl） | `src/utils/format.js` | 目前商城端只有 `formatPrice` |

> 抄的时候要把 uni-app 语法翻译成 Vue 3 web 语法（`view`→`div`、`text`→`span`、`image`→`img`、
> `uni.request`→axios、`uni.showToast`→Element Plus `ElMessage`），不是直接复制。

**验收**：游客点「加入购物车」→ 跳登录 → 登录成功 → 回到详情页并完成加购。

---

## 阶段四：P3 交易（预计 1.5 天）

- 确认订单页：地址、商品、金额、备注
  - 金额**调 `POST /api/orders/quote`** 拿（直减/满减/券），前端不自己算
  - 可用券调 `POST /api/coupons/available`，后端已算好每张券能减多少
- 下单 `POST /api/orders`（**必须带 `idempotencyKey`**，前端生成 UUID）+ 模拟支付 `PUT /api/orders/{id}/pay`
- 订单列表 / 订单详情
  - ⚠️ 后端列表接口**只支持 keyword，不支持按状态筛选** → 状态分组要前端过滤
  - ⚠️ `orderStatus` code **2 和 3 的 C 端文案都是「待发货」** → 分组要按 code 去重，不能只按文案
  - `orderStatusDesc` 由后端下发，前端不用自己映射状态文案
- 取消订单 `PUT /api/orders/{id}/cancel`
- 待付款订单 **30 分钟超时自动关闭**（后端定时任务），前端要处理「刚下单就变已取消」的情况

**验收**：从加购到支付完成，订单状态正确流转，刷新页面状态不丢。

---

## 阶段五：P4 增强（按需，不排期）

- 收藏：`/api/favorites` 系列（后端已就绪：列表 / check / 增 / 删，收藏幂等）
- 评价：**等后端补「商品评价列表」接口**（现在只有 `POST /api/orders/{id}/review`）
- 售后：`/api/after-sales` 系列（后端已就绪）
- 优惠券：领券中心 `/api/coupons/center`、我的券 `/api/coupons/mine`
- 会员：`/api/member/profile`、`/api/member/levels`
- AI 客服：`/api/agent/chat`（SSE 流式，Nginx 已配 `proxy_buffering off`）

---

## 阶段六：P5 部署（每次改完前端都要走）

1. `npm run build`
2. 发布：`WEB_DIR=<mall目录> WEB_ROOT=/www/wwwroot/xiaojiecpn.com ./deploy/release-web.sh --no-build`
   （脚本在 `e-commerce-boot` 仓库，自动备份 `xiaojiecpn.com.bak.<时间戳>`）
3. Cloudflare 清缓存（至少清 `index.html` 和 `/assets/*`）
4. 验证：

```bash
curl -I https://www.xiaojiecpn.com/
curl -s  https://www.xiaojiecpn.com/api/home?limit=1
curl -I https://www.xiaojiecpn.com/product/1      # SPA 回退，应 200
curl -I https://www.xiaojiecpn.com/image/upload/1.webp
```

**回滚**：`rsync -a --delete --exclude '.well-known' <备份目录>/ /www/wwwroot/xiaojiecpn.com/`

---

## 里程碑与依赖关系

```
阶段一（修 Bug）           ← 无依赖，先做
   ↓
阶段二（P1 浏览）          ← 无依赖
   ↓
阶段三（P2 账号+购物车）    ← ⚠ 阻塞于后端 demo 登录接口
   ↓
阶段四（P3 交易）          ← 依赖阶段三
   ↓
阶段五（P4 增强）          ← 可选
```

> 阶段三若后端接口未就绪，可先做「购物车纯前端（localStorage）」作为临时方案，
> 但要**明确标记为临时**，并在后端就绪后切换，避免两套数据源长期并存。

---

## 待确认决策

| 事项 | 需要谁定 | 备注 |
|---|---|---|
| Element Plus 全量 vs 按需引入 | 开发侧 | 建议等功能定型后再按需，现在不折腾 |
| 是否引入 ESLint / Prettier | 开发侧 | 建议阶段一末尾加上，至少覆盖 `src/` |
| 购物车纯前端临时方案是否可接受 | 需求方 | 影响阶段三是否被后端阻塞 |
| 移动端适配深度 | 需求方 | findings.md 第九节说当前只是基础响应式；完整移动端以小程序为准 |
| C 端登录正式方案是否就用手机号 demo 登录 | 需求方 | 是否要上真实验证码（需短信服务成本） |
