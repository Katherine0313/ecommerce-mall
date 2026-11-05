# 进度记录（progress）

> 本文件记录「做到了哪、做了什么决定、为什么」。
> 任务拆解见 [task_plan.md](./task_plan.md)，代码现状与后端契约见 [findings.md](./findings.md)。

---

## 一、总体进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 | 架构搭建（脚手架 / 代理 / 请求封装 / 布局 / 路由 / 详情页） | ✅ 已完成 |
| P0.5 | 列表页 / 搜索页改用分页接口 + 加载更多 | ✅ 已完成（**未提交**） |
| P0.6 | 全局样式重构（变量换命名体系 + 工具类 + 响应式） | ⚠️ **半成品**（组件未同步改名，见 P1） |
| — | **项目探索 + 三件套文档建立** | ✅ 已完成（2026-10-30） |
| — | **后端契约探索（e-commerce-boot）** | ✅ 已完成（2026-10-30） |
| — | **管理端 / 小程序端对照探索** | ✅ 已完成（2026-10-30） |
| — | **README 删除后的文档重整** | ✅ 已完成（2026-10-30） |
| — | **轮播图转 WebP + 首页接后端数据** | ✅ **本次完成（2026-10-30）** |
| — | **发布脚本独立（`deploy/release-mall.sh`）** | ✅ **本次完成（2026-10-31）** |
| 阶段一 | 修 Bug 与补齐地基 | ⬜ 未开始 |
| P1 | 商品浏览（首页改版 ✅ / 详情补齐 / 筛选 / 状态统一） | 🔶 **首页已完成，其余待做** |
| P2 | 账号 + 购物车 | ⬜ 未开始（⚠ 阻塞于后端 demo 登录） |
| P3 | 交易（下单 / 模拟支付 / 订单） | ⬜ 未开始 |
| P4 | 增强（收藏 / 评价 / 售后 / 优惠券 / 会员 / AI 客服） | 🔶 **评价已完成（2026-11-02）**，其余待做 |
| P5 | 部署 | ✅ 首版已上线，替换页面时重复「构建 + 发布」 |

---

## 二、已完成

### P0 架构（commit `e0fc7f6` / `e66d650` / `d659c43`）

- [x] Vite + Vue 3 项目初始化，依赖 vue-router / pinia / axios / element-plus
- [x] `vite.config.js`：`@` 别名 + `/api` `/image` `/upload` 三个代理 + 端口 5173
- [x] 目录骨架：`api / stores / router / layouts / views / components / utils / styles`
- [x] `utils/request.js`：自动带 Bearer token、`success===false` 统一 reject、401 清 token 跳登录
- [x] `utils/format.js`：`formatPrice` 金额格式化（前端不参与金额计算）
- [x] `layouts/DefaultLayout.vue`：sticky Header（logo + 搜索 + 导航）+ Footer（备案信息）
- [x] `router/index.js`：懒加载路由 + 登录守卫 + catch-all 回首页 + 切页回顶
- [x] `stores/user.js`：token 存 localStorage，`setToken` / `logout` / `isLoggedIn`
- [x] `components/ProductCard.vue`：图片 + 促销标签 + 名称 + 副标题 + 价格/原价/市场价
- [x] `views/ProductDetail.vue`：面包屑 + 图 + 价格区 + 品牌库存 + 富文本介绍 + 加购按钮
- [x] `views/ProductList.vue`、`views/Search.vue`：骨架屏 / 错误 / 空态 / 加载更多
- [x] `style/index.css`：设计变量 + 重置 + 工具类 + 响应式（Element Plus 主色覆盖）
- [x] `deploy/xiaojiecpn-mall.conf`：Nginx `/api` `/image` `/upload` 代理 + SPA 回退
- [x] 首次上线：构建 → 发布到 `/www/wwwroot/xiaojiecpn.com` → 线上验收（首页 / `/api/home` / `/product/1` / 图片均 200）
- [x] 旧静态站文件清理（`pages/`、`js/`、`images/`、`style/page.css`、`src/styles/global.css` 等已从 Git 删除）

### 项目探索 + 文档（2026-10-30）

- [x] 通读 `src/` 全部 15 个文件 + `vite.config.js` + `index.html` + `deploy/` + `style/index.css`
- [x] 建立 [findings.md](./findings.md)（架构 / 数据流 / 8 类问题 / 后端契约 / 工作区全貌 / 四仓库对照）
- [x] 建立 [task_plan.md](./task_plan.md)（6 个阶段 + 验收标准 + 依赖关系）
- [x] 建立本文件 [progress.md](./progress.md)

### 后端契约探索（2026-10-30）

- [x] 通读 `e-commerce-boot` 的 7 个微服务 + `common` 层，共 305 个 Java 文件
- [x] 摸清网关路由表、`EXCLUDE_AUTH_PATHS` 免登录白名单、`JwtInterceptor` 鉴权模型
- [x] 逐个核对 C 端接口：商品 / 首页 / 购物车 / 地址 / 订单 / 评价 / 收藏 / 售后 / 优惠券 / 会员
- [x] 核对 `ProductVO` / `PageVO` / `CartVO` / `OrderVO` 字段与前端取值是否一致（**一致** ✅）
- [x] 确认 C 端登录缺口的具体位置与最小改造方案

### 管理端 / 小程序端对照探索（2026-10-30）

- [x] 探索 `e-commerce`（管理端，stepin + ant-design-vue）：发现 10 类问题，含 vite dev proxy 死配置、购物车 store 契约不一致、菜单双数据源
- [x] 探索 `e-commerce-uniapp`（小程序端，uni-app + uview-plus）：发现 8 类问题，含 **AI 客服 SSE 端到端未接通**、`<FlyToCart>` 组件零引用、401/403 混为一谈
- [x] 产出四仓库对照表，明确商城端的定位与可复用资产
- [x] 把小程序端的首页组件清单 / API 文件清单整理成商城端阶段二、阶段三的现成参考

### 轮播图转 WebP + 首页接后端数据（2026-10-30，本次）

- [x] `e-commerce-boot/upload/image/swiper/web-swiper1~4.png` → WebP：**11.0MB → 315KB（压缩 36x）**
  - PIL `method=6` + `quality=80`，最长边缩到 1600px
  - 比例 16:9 → **2:1**（对齐小程序已有横幅 750×375），原图居中裁上下各 5.6%，已逐张目视确认文案未被切到
  - **未覆盖 `1.webp`~`4.webp`** —— 那 4 张是小程序 `custom-swiper.vue` 在用的
- [x] 产物放 `ecommerce-mall/public/swiper/swiper1~4.webp`：Vite 构建时拷进 `dist/swiper/`，
  随 `release-mall.sh` 一起发布，**不需要另外在服务器上同步后端 upload 目录**
- [x] `Home.vue` 接真实后端数据（原来只是静态线框草稿）：
  - 左侧分类栏：数据来自 `GET /api/home` 的 `categories`（嵌套树：8 个一级 + 17 个二级，Redis 缓存）
  - 中间轮播：4 张 WebP，`el-carousel` + 外层 `aspect-ratio: 2/1`
  - 右侧促销位：`GET /api/products/hot?limit=4`
  - 下方猜你喜欢：`GET /api/home` 的 `recommend` 字段，复用 `ProductCard` + 全局 `.product-grid`
- [x] 交互按用户要求做成淘宝式：**纯文字分类栏（无图、无数量），hover 浮出二级分类**
  - 纯 CSS `:hover` + `position:absolute` 浮层（不挤压轮播图），浮层跟着所属分类行对齐
  - 分类栏**不加 `overflow:hidden`** —— 会把浮层裁掉
- [x] 用 CDP 真实 hover 验证（不是靠推理）：浮层 `display:block`、380×96、内容「手机 / 苹果手机 / 安卓手机」
- [x] `npm run build` 通过，`dist/swiper/` 4 张图就位

#### 猜你喜欢模块改版（2026-10-30）

- [x] 商品流：**recommend 优先置顶** + 全量商品去重补齐，客户端分页 **6 行 × 6 列 = 36 个/页**
- [x] 数据来源：`GET /api/home` 的 `recommend`（12 个）+ `GET /api/products`（全量 136 个上架商品，后端 SQL `LIMIT 200`）
- [x] 合并去重：`productFlow = [...recommend, ...all.filter(p => !recommendIds.has(p.id))]`
- [x] 网格固定 6 列（`.guess-grid`），窄屏逐级降到 5 / 4 / 3 / 2 列
- [x] 用 `el-pagination`（prev / pager / next / total）翻页
- [x] CDP 实测验证：第 1 页 36 卡片 / 6 行 / 每行 6 列；分页器「1 2 3 4 Total 136」；
  翻完 4 页共出现 136 次、**重复 0 个**；首页前 3 个确实是 recommend 的商品

#### 商品详情页按 Mall.vue 重做（2026-10-30）

参考 `e-commerce/src/pages/goods/list/Mall.vue`（管理端商品预览弹窗）+ 小程序 `pages/goods/detail.vue`：

- [x] 左右分栏：左栏定宽 460px（主图 + 商品参数 + 图文详情），右栏自适应信息面板且 **sticky 吸顶**
- [x] 标题改用 `product.title`（长营销标题），副标题 `subTitle`；`product.name` 只用于面包屑
- [x] 价格卡：现价 / 促销标签 / 活动前原价 / 市场价
- [x] 基本信息卡：品牌 / 规格 / 配送 / 库存
- [x] 服务保障 4 项：正品保证 / 极速退款 / 七天无理由 / 全国联保
- [x] 数量选择器（`el-input-number`，上限 = 库存）
- [x] 增值保障 3 张卡（一年意外保 2% / 全面保修 1% / 电池无忧 20），选中态联动合计
- [x] 加入购物车 / 立即购买双按钮 + 合计行；`stock <= 0` 时按钮置灰并提示已售罄
- [x] **商品参数 specs 表**（后端 `specs` 字段，`[{name,value}]`）
- [x] 图文详情：装饰线标题 + 富文本 body，**`<img>` 补 `loading="lazy"`**（Mall.vue 里明确处理过的性能坑）
- [x] CDP 实测：合计 ¥8499.00 → 选「全面保修」后 ¥8583.99（+84.99）；数量上限 = 库存 574

### README 删除后的文档重整（2026-10-30，本次）
- [x] 确认 `README.md` 已从磁盘删除、Git 暂存区为 `D`
- [x] 逐节核对 README 原有 10 节内容的归属，确认已被三件套吸收
- [x] 补上 README 独有、三件套原本没覆盖的两处：**移动端适配现状**（→ findings 第九节）、**部署配置**（→ findings 第十节）
- [x] 清理三个 md 里所有「见 README 第 X 节」的引用，改为指向彼此或直接展开
- [x] **修正 P1 的根因诊断**：不是「变量从未定义」，而是「全局样式重构改了命名体系、3 个组件 15 处引用没同步改」
- [x] 新增 findings 第八节「工作区改动全貌」——逐文件标出 9 项前进 + 1 项倒退（只有 `Home.vue`），明确禁止 `git checkout .`
- [x] 新增 findings 第十一节「四仓库对照」+ 商城端可抄的小程序资产清单
- [x] task_plan 新增 1.6「目录卫生」，并把阶段二 2.1 的首页改版加上小程序组件对照

### P4 评价：商品详情页评价区（2026-11-02）

- [x] 后端补了 C 端只读接口（`e-commerce-boot` order-service）：
      `GET /api/reviews/product/{id}`（分页）+ `GET /api/reviews/product/{id}/summary`（统计），免登录
- [x] 新增 `src/api/review.js`：`getProductReviews` / `getReviewSummary`（走 `@/utils/request`，baseURL 是 `/api`）
- [x] `src/views/products/ProductDetail.vue` 加「商品评价」section，**插在「商品参数」之前**
      —— 详情页三块顺序定为 **商品评价 → 商品参数 → 图文详情**
- [x] 展示：平均分 + 好评率 + 星级分布条 + 评价列表（昵称 / 星级 / 标签 / 内容 / 晒图 / 商家回复 / 时间）
- [x] 虚拟评价标「系统评价」标签、昵称「系统」；真实评价昵称由后端脱敏（手机号打码）
- [x] **默认只展开前 3 条** + 「查看全部评价」按钮（接口一次拉 20 条，展开不再请求）
- [x] 一条评价最多一个视频 → 单独一行 `<video controls preload="none">`，视频不进图片九宫格
- [x] 评价接口失败 `.catch(() => null)` 兜住，**评价挂了不影响详情页其它内容**
- [x] **顺带补上一直没渲染的图文详情 body**：模板加 `<section class="detail-body" v-html="product.body"></section>`
      （`.detail-body` 的 CSS 早就写好了，只是没有对应 DOM；`v-html` 写法照 `ArticleDetail.vue` 既有做法，
      body 是后台运营录入的富文本不是用户输入，风险可控）
- [x] `npx vite build` 通过
- [x] **发版**（2026-11-02）：`./deploy/release-mall.sh`（**在 `e-commerce-boot` 仓库根目录执行**；
      ⚠️ 裸的 `release-web.sh` 发的是后台管理端 jiemids.com，不是商城 —— 2026-10-31 发错过一次）
      → 已发到 `/www/wwwroot/xiaojiecpn.com`
- [x] 线上只读验收：同源代理 `www.xiaojiecpn.com/api/reviews/product/7` → ✅ 200；
      页面 `www.xiaojiecpn.com/product/7` → ✅ 200
- [ ] 人工过一眼页面渲染 + 如有 EdgeOne 缓存需手动刷新

---

## 三、进行中

| 事项 | 状态 | 备注 |
|---|---|---|
| — | — | 当前无进行中的任务，等待启动阶段一 |

**Git 工作区当前状态**（2026-10-30 复查，未提交）：

- **已暂存删除**：旧站图片 / `js/` / `pages/` / `public/favicon.ico` / `src/styles/global.css` / `style/page.css` / **`README.md`**
- **已修改**：`package.json`、`src/api/product.js`、`src/components/ProductCard.vue`、`src/layouts/DefaultLayout.vue`、`src/main.js`、`src/views/*.vue`、`style/index.css`、`vite.config.js`
- **未跟踪**：`src/stores/user.js`（新写的登录态 store）、`findings.md` / `task_plan.md` / `progress.md`（三件套）、`public/swiper/`（4 张轮播图）
- ✅ `src/views/Home.vue` 的静态线框草稿**已改版完成**（接 `/api/home` + 轮播图），不再是倒退项

---

## 四、待办（按优先级）

### 阶段一：必修

- [ ] **P1 CSS 变量同步改名**：3 个组件 15 处 `var(--mall-*)` → 新命名体系（详见 task_plan 1.1）
- [ ] **P2 `/login` 路由缺失**：401 跳转落进 catch-all，被弹回首页
- [ ] **P4 购物车导航指向首页**：`to=""`
- [ ] **P7 清理遗留**：`stores/counter.js`、空 `pages/`、`robots.txt` 重写
- [ ] **P5.1 目录卫生**：全局样式挪到 `src/styles/`，删空 `pages/`
- [ ] **P5.2 README 删除后引用清理**：已完成（记录备查）

### 阶段二：P1 浏览

- [x] Home.vue 改版（分类栏 + 轮播 + 促销位 + 猜你喜欢，全部接后端）
- [x] 详情页重做（库存 0 置灰 / `specs` / 保障 / 数量 / 增值保障 / body 懒加载）
- [ ] 详情页**图集**：⚠️ 后端 `products.image` 只有单个主图字段，**没有图集数组** —— 需要后端加字段或图集表
- [ ] 详情页加购接 C 端登录（依赖后端 `POST /api/demo-login`）
- [ ] 列表页筛选 UI（分类 + 品牌 + 价格区间 + 排序，**后端已支持，直接做**）
- [ ] 抽出 `EmptyState` / 骨架屏公共组件，三视图统一

### 阶段三～五

- [ ] P2 账号 + 购物车（**等后端加 `POST /api/demo-login`**）
      —— API 层与公共组件可参考小程序端 `api/cart.js` / `api/order.js` / `components/*`
- [ ] P3 交易链路（下单带 `idempotencyKey`、金额调 `/api/orders/quote`、订单状态按 code 分组）
- [ ] P4 收藏 / 售后 / 优惠券 / 会员（后端都已就绪，前端直接接）
- [x] P4 评价（2026-11-02 完成）：后端补 `GET /api/reviews/product/{id}` + `/summary`（免登录），
      商城详情页加评价区（评分条 / 评价列表 / 商家回复 / 视频播放器），
      顺序 **商品评价 → 商品参数 → 图文详情**；顺带补上一直没渲染的图文详情 body。
      **2026-11-02 已发版**（`./deploy/release-mall.sh`，注意别用 `release-web.sh`）；线上只读验收 200 ✅
- [ ] P5 每次发布走「构建 → `./deploy/release-mall.sh` → 清 **EdgeOne** 缓存 → curl 验证」
      —— 发布脚本在 `e-commerce-boot` 仓库，**必须用 `release-mall.sh`**，它写死了 `WEB_DIR=../ecommerce-mall` + `WEB_ROOT=/www/wwwroot/xiaojiecpn.com`；
      裸的 `release-web.sh` 默认发后台管理端到 jiemids.com（2026-10-31 已发错过一次，误把后台端重发到 www.jiemids.com）

---

## 五、决策记录

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-10-29 | 单店 B2C，不做商家入驻 / 平台抽佣 | 业务定位 |
| 2026-10-29 | 不做 SKU，只做单规格 | 沿用现有商品表，先跑通链路 |
| 2026-10-29 | Vue 3 + Vite SPA，不做 SSR | 先跑通购物链路 |
| 2026-10-29 | 首页/商品浏览不登录，加购/下单才登录 | 降低首版门槛 |
| 2026-10-29 | 旧站不备份，直接在原目录开发 | 部署时再切 Nginx 根目录 |
| 2026-10-29 | 首期沿用后端模拟支付 | 真实微信支付后置 |
| 2026-10-29 | 商城视觉独立，不引 ant-design-vue | 与后台管理端区分 |
| 2026-10-30 | 列表页/搜索页改用 `/api/products/page` + 「加载更多」，不用分页器 | PC 端 DOM 承受力强，后端已提供 total |
| 2026-10-30 | 分页/搜索统一用 `loadSeq` 请求序号丢弃迟到响应 | 路由快速切换时避免旧结果覆盖新结果 |
| 2026-10-30 | 建立 task_plan / findings / progress 三件套 | 与 README（总纲）分层：README 说"要做什么"，三件套管"正在做什么" |
| 2026-10-30 | 列表页筛选直接做，不等后端 | **实测发现后端 `/api/products/page` 早已支持 brand / 价格区间 / sort**，之前的判断有误 |
| 2026-10-30 | Home.vue 改版保留草稿结构，不 `git checkout` 丢弃 | 草稿表达了新的首页设计意图（侧栏 + 轮播 + 猜你喜欢），只是缺数据层 |
| 2026-10-30 | C 端登录方案定为 user-service 加 `POST /api/demo-login`（dev profile 专用） | 后端无任何 C 端非微信登录接口；`JwtUtil.generateUserToken` 已是 public，复用成本低；`user` 表已有 phone 字段，无需建表 |
| 2026-10-30 | **禁止 `git checkout .` / `git stash` 撤销工作区**，只逐文件处理 | 工作区 9 项是前进（样式重构 / 分页接口 / 骨架屏 / sticky 头 / 布局），只有 `Home.vue` 是倒退 |
| 2026-10-30 | **README.md 删除**，内容由三件套吸收 | 三件套已覆盖 README 的全部信息并扩充（后端契约、四仓库对照、移动端适配、部署配置） |
| 2026-10-30 | 轮播图放 `ecommerce-mall/public/swiper/`，不放后端 upload 目录 | 前端静态资源随 `dist` 一起发布，不需要在服务器上额外同步后端目录；小程序那 4 张仍在后端目录，互不影响 |
| 2026-10-30 | 轮播图比例 16:9 → 2:1 | 对齐项目已有的横幅比例（小程序 750×375），同时让轮播高度可控（1200px 宽 → 600px 高） |
| 2026-10-30 | 分类栏做成淘宝式：**纯文字、无图、无数量，hover 展开二级分类** | 用户明确要求；8 个一级分类竖排 250px 正好，17 个二级分类平铺不下，hover 浮层是淘宝/京东标准形态 |
| 2026-10-30 | `el-carousel` 不用 `height="auto"` | Element Plus 的 `.el-carousel__item{height:100%}` + 容器初始 0px 会造成"测量高度→回填 0"死循环；改用外层 `aspect-ratio: 2/1` + 轮播 `height:100%` 逐层铺满 |
| 2026-10-30 | 猜你喜欢模块：**recommend 置顶 + 全量商品补齐 + 客户端分页 36/页** | 用户要求。合并时按 id 去重，保证同一商品不会两处重复；用老接口 `GET /api/products` 一次拉全量（后端 SQL `LIMIT 200`，商品超出会截断，代码里已注释） |

---

## 六、下一步

**立即可做（不依赖后端）**：阶段一全部 5 项 + 阶段二全部 4 项。

建议顺序：

1. 修 CSS 变量改名（影响所有页面的视觉评审，10 分钟）
2. 补 `/login` 路由
3. 修导航死链
4. 清理遗留 + 目录卫生
5. 首页改版（照小程序的结构做）
6. 列表页筛选 UI

阶段三开始前需要确认后端 `e-commerce-boot` 的 `POST /api/demo-login` 是否已就绪（目前**没有**，见 findings.md 6.9）。
