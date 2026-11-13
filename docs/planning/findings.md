# 探索发现（findings）

> 本文件记录「代码现状是什么」——架构、数据流、接口、以及探索中发现的问题。
> 任务拆解见 [task_plan.md](./task_plan.md)，进度见 [progress.md](./progress.md)。

**探索时间**：2026-10-30　**代码版本**：`e0fc7f6`（1029）

---

## 一、项目是什么

杰米商城 Web 端（PC 端 B2C 商城），替换原静态企业站 `xiaojiecpn.com`。
后端复用 `e-commerce-boot` 的 `/api/**`（与小程序 `e-commerce-uniapp` 共用同一套接口与数据）。

| 项 | 值 |
|---|---|
| 线上域名 | https://www.xiaojiecpn.com |
| 后端网关 | https://api.jiemids.com（服务器内网 `127.0.0.1:8080`） |
| 站点根目录 | `/www/wwwroot/xiaojiecpn.com` |
| 后端仓库 | `D:\study\my-workspace\wechat-workspace\e-commerce-boot` |
| 小程序仓库 | `D:\study\my-workspace\wechat-workspace\e-commerce-uniapp` |

已确认的产品决策（单店 B2C、不做 SKU、不做 SSR、模拟支付）见 [progress.md](./progress.md) 第五节「决策记录」，不再重复。

---

## 二、技术栈与构建

| 项 | 值 |
|---|---|
| 框架 | Vue 3.5（`<script setup>`）+ Vite 8 |
| 路由 | vue-router 5，`createWebHistory` |
| 状态 | Pinia 3 |
| HTTP | axios 1.x，统一封装在 `src/utils/request.js` |
| UI 库 | Element Plus 2.14，**全量注册**（`app.use(ElementPlus)`） |
| 样式 | 无预处理器；全局变量 + 工具类在 `src/style/index.css`（241 行） |
| Node | `^20.19.0 \|\| >=22.12.0` |

主色 `#ff6700`（沿用小程序），在 `src/style/index.css` 的 `:root` 中同时覆盖了 Element Plus 的 `--el-color-primary` 系列。
`main.js` 中先引 `element-plus/dist/index.css` 再引 `src/style/index.css`，覆盖顺序正确。

**代理配置**（`vite.config.js`，生产由 Nginx 承担同样职责）：

```
/api    → http://127.0.0.1:8080
/image  → http://127.0.0.1:8080   # 商品图、分类图
/upload → http://127.0.0.1:8080   # 用户头像等上传文件
```

后端未启动时把 target 改成 `https://api.jiemids.com`。

---

## 三、目录结构（实际现状）

```
ecommerce-mall/
├── index.html              # 挂载点 + SEO meta
├── vite.config.js          # 别名 @ → src、代理、端口 5173
├── robots.txt              # 旧 DedeCMS 遗留的 Disallow 规则，未针对新站点重写
├── deploy/
│   └── xiaojiecpn-mall.conf   # Nginx 片段（/api /image /upload + SPA 回退）
├── style/
│   └── index.css           # 全局样式：设计变量 / 重置 / 工具类 / 响应式
├── pages/                  # 空目录，旧静态站残留
├── public/
│   └── swiper/             # 首页轮播图 swiper1~4.webp（构建时拷进 dist/swiper/）
├── src/
│   ├── main.js             # 应用入口
│   ├── App.vue             # 仅 <router-view/>
│   ├── router/index.js     # 路由表 + 登录守卫
│   ├── layouts/
│   │   └── DefaultLayout.vue   # Header(logo/搜索/导航) + 内容区 + Footer(备案)
│   ├── views/
│   │   ├── Home.vue            # ✅ 分类栏 + 轮播 + 促销位 + 猜你喜欢，全部接后端
│   │   ├── ProductList.vue     # ✅ 分页 + 加载更多 + 分类/关键词筛选
│   │   ├── ProductDetail.vue   # ✅ 图集 + 价格 + 库存 + 介绍
│   │   └── Search.vue          # ✅ 关键词搜索 + 加载更多
│   ├── components/
│   │   └── ProductCard.vue     # 商品卡片（图片/名称/副标题/价格）
│   ├── api/
│   │   ├── home.js        # getHome(limit) → GET /home
│   │   └── product.js     # getProducts / getProductPage / getProduct / getHotProducts / getCategories / getTags
│   ├── stores/
│   │   ├── user.js        # token 存 localStorage，setToken / logout
│   │   └── counter.js     # Vite 模板残留，未被任何地方使用
│   └── utils/
│       ├── request.js     # axios 实例 + 请求/响应拦截
│       └── format.js      # formatPrice（number → 两位小数字符串）
```

> 原 README 第三节的目录骨架描述的是**计划态**（含 cart/order/user/address 等尚未创建的模块），与实际文件树有出入，以本文件为准。

---

## 四、数据流

### 请求链路

```
视图 → src/api/*.js → src/utils/request.js → axios → /api/* (Vite 代理 或 Nginx) → 网关 8080
```

`request.js` 的约定：

- `baseURL: '/api'`，超时 10s
- 请求拦截：从 `localStorage.token` 取值，注入 `Authorization: Bearer <token>`
- 响应拦截：后端统一结构 `{ success, data, message, code }`
  - `success === false` → `Promise.reject(body)`
  - 成功 → 直接返回 `body.data`（**视图拿到的就是裸 data，不是整包**）
- 401 → 清 token + `location.href = '/login?redirect=...'`

### 路由表（`src/router/index.js`）

| 路径 | name | 视图 | 说明 |
|---|---|---|---|
| `/` | home | Home.vue | 首页：分类栏 + 轮播 + 促销位 + 猜你喜欢 |
| `/products` | products | ProductList.vue | 全部商品 |
| `/category/:id` | category | ProductList.vue | 按分类 |
| `/search` | search | Search.vue | `?keyword=` |
| `/product/:id` | product-detail | ProductDetail.vue | 详情，游客可访 |
| `/:pathMatch(.*)*` | — | 重定向 `/` | 兜底 |

所有业务路由都是 `DefaultLayout` 的 children（懒加载 `() => import(...)`），页面切换 `scrollBehavior` 回顶部。
守卫逻辑已写好（`meta.requiresAuth` + `localStorage.token`），但**当前没有任何路由带 `requiresAuth`**，所以守卫暂不生效。

### 两个页面共用的分页模式

`ProductList.vue` 和 `Search.vue` 是同一套模式的两份拷贝：

- `PAGE_SIZE = 40`（PC 端 DOM 承受力）
- `loadSeq` 请求序号自增，响应回来先比对序号，不一致就丢弃——防止路由快速切换时旧结果覆盖新结果
- `target === 1` 覆盖列表，否则 `concat` 追加
- `hasMore = products.length < total`，用「加载更多」按钮代替分页器
- 骨架屏 `el-skeleton` / 错误 `el-alert` / 空态 `el-empty`

---

## 五、探索中发现的问题

### P1｜CSS 变量重构「只改了一半」——15 处引用落空 🔴

**根因不是"变量从未定义"，而是工作区的一次全局样式重构改了变量命名规范，组件没跟着改。**

HEAD 版 `src/styles/global.css`（71 行）**本来是定义好的**：

```css
:root {
  --mall-primary: #ff6700;
  --mall-text: #333;
  --mall-text-light: #999;
  --mall-bg: #f5f5f5;
  --mall-border: #eee;
  --mall-container: 1200px;
}
```

工作区把它替换成了 `src/style/index.css`（241 行），**变量全部换了命名体系**：
`--mall-primary` → `--color-primary`、`--mall-text` → `--text-primary`、
`--mall-text-light` → `--text-secondary`、`--mall-bg` → `--bg-page`、
`--mall-border` → `--border-color`、`--mall-container` → `--container-width`，
并新增了 `--radius-*` / `--space-*` / `--shadow-*` 等。

但**三个组件共 15 处 `var(--mall-*)` 一处都没同步改**：

| 变量 | 引用数 | 位置 | 后果 |
|---|---|---|---|
| `--mall-primary` | 7 | ProductCard ×3、ProductDetail ×2、DefaultLayout ×2 | 价格、促销标签、hover 态**丢失橙色**，回退为继承色 |
| `--mall-text-light` | 7 | ProductCard ×3、ProductDetail ×4 | 副标题、划线价**变黑色** |
| `--mall-border` | 1 | DefaultLayout | 头部下边框不显示 |

CSS 变量未声明**不报错、不告警**，页面照跑，只是配色是错的——截图评审时极易漏掉。

**修法（推荐）**：在 3 个组件里做一次**机械替换**，统一到新命名体系，不要把旧变量补回来（两套并存会再次漂移）：

```
--mall-primary    → --color-primary
--mall-text-light → --text-secondary
--mall-border     → --border-color
```

> 注意：`--mall-text-light` 旧值 `#999`，新 `--text-secondary` 是 `#86909c`（略深一点），
> 视觉上更接近次要信息，语义更准确。

### P2｜`/login` 路由不存在，登录跳转是死路 🔴

`router.beforeEach` 和 `request.js` 的 401 分支都跳 `/login`，
但路由表里**没有 `/login`**，会落到 catch-all 被重定向回 `/`——
用户表现为「401 之后莫名其妙回到首页」，且 `redirect` 参数丢失。

### P3｜Home.vue 已完成改版（原草稿覆盖 HEAD 实现的倒退已修复）✅

`git status` 里 `src/views/Home.vue` 曾是一份**未提交的静态线框草稿**，把 HEAD 里已实现的 `/api/home` 数据版覆盖了。

**2026-10-30 已改版完成**（不是简单回退，而是在保留草稿设计意图的基础上接上真实数据）：

| 区域 | 数据来源 |
|---|---|
| 左侧商品分类栏 | `GET /api/home` 的 `categories`（嵌套树，Redis 缓存） |
| 中间 Banner 轮播 | `public/swiper/swiper1~4.webp`（前端静态资源） |
| 右侧促销位 | `GET /api/products/hot?limit=4` |
| 下方猜你喜欢 | `GET /api/home` 的 `recommend` 字段 |

分类树实测数据（`/api/categories` 实测返回）：

- **8 个一级分类**（手机/电脑/平板/耳机音箱/手表/相机/数码配件/智能家居）
- **17 个二级分类**，商品直接挂在二级分类下（一级分类自身 `productCount=0`）
- `image` 字段只有 6 个一级分类有值（`/image/category/*.webp`），二级分类全为空
- 商品筛选 SQL 是 `p.category_id IN (SELECT id FROM categories WHERE id = #{categoryId} OR parent_id = #{categoryId})`
  → **点一级分类会带上它所有二级分类的商品**，不会查到空列表

交互按淘宝式设计（用户明确要求）：**纯文字分类栏，不带图片、不带数量，hover 浮出二级分类面板**。
纯 CSS `:hover` + `position:absolute` 浮层，浮层跟着所属分类行对齐，不挤压轮播图。

> ⚠️ 分类栏**不能加 `overflow:hidden`** —— 会把 hover 出来的二级分类浮层裁掉。

### P3.1｜商品详情页已按 Mall.vue 重做 ✅（2026-10-30）

参考 `e-commerce/src/pages/goods/list/Mall.vue`（管理端商品预览弹窗，850 行）+ 小程序 `pages/goods/detail.vue`：

| 模块 | 来源 | 说明 |
|---|---|---|
| 左右分栏 + 右栏 sticky | Mall.vue | 左栏定宽 460px，右栏信息面板吸顶 |
| 商品标题 / 副标题 | Mall.vue + 小程序 | 用 `product.title`（长标题），`name` 只用于面包屑 |
| 价格卡 | Mall.vue | 现价 / 促销标签 / 活动前原价 / 市场价 |
| 基本信息卡 | Mall.vue | 品牌 / 规格 / 配送 / 库存 |
| 服务保障 4 项 | Mall.vue + 小程序 | 正品保证 / 极速退款 / 七天无理由 / 全国联保 |
| 数量选择器 | Mall.vue | `el-input-number`，上限 = 库存 |
| 增值保障 3 张卡 | Mall.vue + 小程序 | 一年意外保 2% / 全面保修 1% / 电池无忧 20 |
| 商品参数 specs 表 | 小程序 | 后端 `specs` 字段 `[{name,value}]`，**后端已下发，前端原先没用** |
| 图文详情装饰线标题 | Mall.vue `.detail-title` | `::before/::after` 装饰线 |
| **body 富文本 img 懒加载** | Mall.vue | Mall.vue 里明确处理过的坑：详情富文本常嵌几十张原图，全量加载会卡住 |

**新发现的缺口：详情页做不了「图集」**

实测 `GET /api/products/1` 返回的字段里**只有单个 `image`（主图）**，没有图集数组：

```
id, name, subTitle, brand, image, title, body, price, originalPrice,
promotionTag, marketPrice, stock, categoryId, tagId, salesMode, status,
productCode, weight, volume, specs
```

`products` 表也只有 `image VARCHAR(512)` 一列（详情图在 `body` 富文本里）。
→ 要做淘宝那种「主图轮播 + 缩略图」，**需要后端加 `images` 数组字段或图集表**。

### P4｜「购物车」导航指向首页 🟡

`DefaultLayout.vue` 的 `<router-link to="">购物车</router-link>` —— `to=""` 是当前路径，实际跳的是首页而不是 `/cart`（该路由也还不存在）。

### P5｜README 已被删除，文档职责需要重新划分 🟡

`README.md` 在 Git 暂存区里是 **`D`（已删除）**，磁盘上也没有了。
它原本承担了：项目定位、已确认决策、P0-P5 checklist、接口对应表、后端缺口、部署步骤、约定、移动端适配现状。

**结论**：README 的内容已被 [findings.md](./findings.md) / [task_plan.md](./task_plan.md) / [progress.md](./progress.md)
三件套吸收并**扩充**（后端契约、四仓库对照都比 README 多）。因此 README 删除是合理的。

但**必须补两处 README 独有、目前三件套没覆盖的内容**（已分别补进 findings / task_plan）：

| README 独有内容 | 去向 |
|---|---|
| 移动端适配现状（第十节） | → findings.md 第九节「移动端适配现状」 |
| Nginx 配置片段（第八节） | → findings.md 第十节「部署配置」+ `deploy/xiaojiecpn-mall.conf`（仓库里已有，是唯一权威副本） |

**同时要清理**：三个 md 里所有「详见 README 第 X 节」的引用已改为指向彼此或直接展开。

### P5.1｜原 README 与代码不一致的地方（删除前的最后核对，记录备查）🟢

- 第十节引用的响应式断点路径 `src/styles/global.css:66` —— `src/styles/` 目录**已删除**，全局样式现在是 `src/style/index.css`（断点也从 640px 改成了 768px）
- 第六节接口表写 `/api/products?keyword=`，代码实际用的是**分页接口** `/api/products/page`
- 第五节骨架里 `api/category.js`、`cart.js`、`order.js`、`user.js`、`address.js`、`views/Cart.vue`、`Login.vue`、`Checkout.vue`、`OrderList.vue`、`UserCenter.vue` —— **全部尚未创建**
- `src/styles/tokens.css` + `global.css` 的双文件方案 —— 已合并为单文件 `src/style/index.css`

### P6｜无质量门禁 🟡

没有 ESLint / Prettier / 单元测试 / CI。`package.json` 只有 `dev`、`build`、`preview` 三个脚本。
`.idea/` 已在 `.gitignore`，但 `.idea/workspace.xml` 仍被 Git 跟踪。

### P7｜遗留文件 🟢

- `src/stores/counter.js`：Vite 模板残留，零引用
- `pages/`：空目录，旧静态站残留
- `public/`：空目录，favicon.ico 已删且 `index.html` 未引用
- `robots.txt`：还是旧 DedeCMS 的 `/plus/...` 规则，对新站点无意义（也不拦任何东西）

### P8｜Element Plus 全量引入 🟢

`app.use(ElementPlus)` 打包整个组件库。首版功能少，可接受；功能多了建议改成按需引入 + `unplugin-vue-components` 自动导入。

---

## 六、后端契约（e-commerce-boot 实测）

> 本节内容来自对 `D:\study\my-workspace\wechat-workspace\e-commerce-boot` 的源码探索（2026-10-30）。
> 后端是 **Spring Boot 4.1 + Spring Cloud 2025.1.3 + Spring Cloud Alibaba 2025.1.0** 的微服务，Java 17。

### 6.0 前端已封装的接口与使用情况

| 函数（`src/api/`） | 方法 | 路径 | 使用情况 |
|---|---|---|---|
| `getHome` | GET | `/home?limit=` | ✅ Home.vue（分类树 + 猜你喜欢） |
| `getProductPage` | GET | `/products/page` | ✅ ProductList / Search |
| `getProduct` | GET | `/products/{id}` | ✅ ProductDetail |
| `getCategories` | GET | `/categories` | ✅ ProductList（标题名） |
| `getProducts` | GET | `/products` | ❌ 未使用（旧接口，保留兼容） |
| `getHotProducts` | GET | `/products/hot?limit=` | ❌ 未使用 |
| `getTags` | GET | `/tags` | ❌ 未使用 |

**购物车 / 订单 / 地址 / 收藏 / 售后 / 优惠券 / 会员——前端一个 API 文件都还没有建**，`src/api/` 下只有 `home.js` 和 `product.js`。

### 6.1 服务拓扑与端口

父工程 `ecommerce:e-commerce-boot`，7 个微服务 + 1 个下沉框架层 `common`：

| 模块 | 端口 | 职责 | Java 文件数 |
|---|---|---|---|
| `gateway` | 8080 | 路由转发 + Swagger 聚合 | 2 |
| `auth-service` | — | 后台管理员登录（账号密码 + 图形验证码）、RBAC | 36 |
| `product-service` | — | 商品 / 分类 / 标签 / 首页 / 收藏 / 上传 | 74 |
| `order-service` | — | 购物车 / 订单 / 地址 / 优惠券 / 报表 / 评价 | 99 |
| `aftersale-service` | — | 售后 | 32 |
| `user-service` | 9006 | C 端用户资料 / 会员 / 头像上传 / 小程序登录 | 34 |
| `file-service` | — | 文件服务（仅 1 个 Java 文件） | 1 |
| `common` | — | 下沉框架层：`Result` / `JwtUtil` / `JwtInterceptor` / `PermissionInterceptor` / `UserContext` / `WebMvcConfig` / 促销计算器 | 27 |

基础设施：Nacos（注册发现，`127.0.0.1:8848`）、MySQL（`e_commerce_db`）、Redis（管理员令牌失效标记）。
`common` 里有 `common/promotion/` 一整套促销计算器（`PromotionCalculator` / `QuoteResult`），下单报价走这个。

### 6.2 统一响应与错误约定

```json
{ "success": true, "data": {...}, "message": null, "code": null }
```

- 成功：HTTP 200，`success=true`
- 失败：**真实 HTTP 状态码**（400/401/403/404/500），`success=false`，`message` 可直接展示给用户
- 前端 `request.js` 的处理方式与之匹配：`success===false` → reject；HTTP 401 → 清 token 跳登录 ✅
- `data` 为 `null` 表示无数据（不是空数组），前端取数组前要兜底

### 6.3 网关路由（决定 URL 归属）

关键规则（`gateway/src/main/resources/application.yml`）：

```
/api/login,/api/logout,/api/admin/info,/api/auth/captcha,/api/admin/system/**   → auth-service
/api/home,/api/products/**,/api/categories/**,/api/tags/**,/api/favorites/**,
/api/admin/products/**,...,/api/upload/**,/image/**                             → product-service
/api/cart/**,/api/orders/**,/api/address/**,/api/coupons/**,/api/admin/orders/**,
/api/admin/reviews/**,/api/reviews/**                                            → order-service
/api/after-sales/**                                                           → aftersale-service
/api/agent/**                                                                 → Python ai-service（静态地址）
/ws/**                                                                        → order-service（WebSocket 来单提醒）
/upload/**                                                                    → user-service
/api/** 其余                                                                  → user-service（兜底，带 PreserveHostHeader）
```

> **加新接口前先看这张表**：路径前缀必须命中对应服务，否则会掉进 `user-service` 兜底路由，报 404。
> 例：`/api/demo-login` 属于 user-service，命中 `/api/**` 兜底即可，无需改网关。

静态资源：商品图 `/image/**` → `upload/image/opt/`（压缩图，优先）→ 回落 `upload/image/`（原图），缓存 365 天 immutable。
头像 `/upload/**` → `file:upload/`。两者都在 `/api/**` 之外，**免登录**。

### 6.4 免登录白名单（关键）

`common/WebMvcConfig.EXCLUDE_AUTH_PATHS` —— 只有这些路径不校验 token：

```
/api/wxlogin  /api/login  /api/logout  /api/auth/captcha
/api/products  /api/products/**
/api/categories  /api/categories/**
/api/home
/api/tags  /api/tags/**
/api/after-sales/status-constants
/api/reviews  /api/reviews/**
```

**其余所有 `/api/**` 都要求 `type=user` 的 JWT**（`/api/admin/**` 要求 `type=admin`）。
购物车、订单、地址、收藏、售后、优惠券、会员资料——全部需要 user 令牌。
`/api/reviews/**` 是 2026-11-02 新加的免登录只读路径（商品评价列表 + 统计）。

### 6.5 鉴权模型

`common/JwtInterceptor` 的判定顺序：

1. 取 `Authorization` 头（带不带 `Bearer ` 前缀都认）
2. 校验签名 / 过期 → 失败抛 `BusinessException(401)`
3. **按路径校验身份类型**：`/api/admin` 前缀要求 `type=admin`，其余要求 `type=user`，不匹配抛 **403**
4. 取 `subject` 作为 userId，写入 `UserContext`（ThreadLocal）
5. admin 令牌额外查 Redis 失效标记（角色变更后立即失效）

JWT 由 `JwtUtil` 签发，`expire` 默认 **604800 秒（7 天）**，`secret` 由环境变量 `JWT_SECRET` 提供。
`JwtUtil.generateUserToken(Long userId)` 是 **public** 的——加 C 端登录接口时直接复用。

### 6.6 C 端接口全景（实测）

**免登录**

| 方法 | 路径 | 返回 | 备注 |
|---|---|---|---|
| GET | `/api/home?limit=10` | `{categories:[CategoryTreeVO], recommend:[ProductVO]}` | 首页聚合，分类走 Redis 缓存 |
| GET | `/api/products?categoryId=&keyword=` | `ProductVO[]` | 旧列表，不分页，后端兜底 LIMIT 200 |
| GET | `/api/products/page?page=&pageSize=&categoryId=&keyword=&brand=&minPrice=&maxPrice=&sort=` | `PageVO<ProductVO>` | **分页，支持品牌/价格区间/排序** |
| GET | `/api/products/{id}` | `ProductVO` | 404 商品不存在 |
| GET | `/api/products/hot?limit=8&excludeIds=` | `ProductVO[]` | 推荐分类优先，不够随机补足 |
| GET | `/api/products/random?limit=10&excludeIds=` | `ProductVO[]` | 首页下拉刷新换一批 |
| GET | `/api/categories` | `CategoryTreeVO[]` | 树形，一级含 children |
| GET | `/api/tags` | `TagVO[]` | |
| GET | `/api/after-sales/status-constants` | `AfterSaleStatusConstantsVO` | 公共字典 |

**需 user 令牌**

| 方法 | 路径 | 备注 |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/cart`、`/api/cart/{productId}`、`/api/cart/count` | 加购 DTO：`{productId, quantity, insuranceDetail?, insuranceFee?}` |
| GET/POST/PUT/DELETE | `/api/address`、`/api/address/{id}` | 地址 DTO：`{consignee, phone, region, detailAddress, isDefault}` |
| POST | `/api/orders/quote` | 确认页报价（直减/满减/券），不落库 |
| POST | `/api/orders` | 下单，含 `idempotencyKey` 幂等键 |
| GET | `/api/orders`、`/api/orders/{id}` | 列表**只支持 keyword**，不支持按状态筛选 |
| PUT | `/api/orders/{id}/pay`、`/confirm`、`/ship`、`/finish`、`/cancel` | 状态流转 |
| DELETE | `/api/orders/{id}` | 软删 |
| POST | `/api/orders/{id}/review` | 提交评价（写入 `product_reviews`） |
| GET | `/api/reviews/product/{id}` | **该商品可见评价列表**（分页，免登录）—— 2026-11-02 后端新增 |
| GET | `/api/reviews/product/{id}/summary` | **评价统计**（总数/平均分/好评率/星级分布）—— 2026-11-02 后端新增 |
| GET | `/api/favorites`、`/api/favorites/check?productId=` | |
| POST/DELETE | `/api/favorites/{productId}` | 收藏/取消，幂等 |
| GET/POST | `/api/after-sales`、`/api/after-sales/by-order`、`/{id}/submit-return` | |
| GET | `/api/coupons/center`、`/mine`；POST `/api/coupons/{templateId}/claim`、`/available` | |
| GET | `/api/member/profile`、`/api/member/levels` | 会员等级 / 成长值 |
| GET | `/api/user/profile`；POST `/api/user/name`、`/api/user/phone`、`/api/user/deactivate` | 头像 `POST /api/user/avatar`（multipart） |

**订单状态码**（`OrderStatusEnum`，C 端文案取 `desc`）：

| code | C 端文案 | 后台文案 |
|---|---|---|
| 1 | 待付款 | 待付款 |
| 2 | **待发货** | 待确认 |
| 3 | 待发货 | 待发货 |
| 4 | 已发货 | 已发货 |
| 5 | 已完成 | 已完成 |
| 6 | 已取消 | 已取消 |

流转：`1 → 2 → 3 → 4 → 5`，`1/2/3` 均可取消。
**注意 code 2 和 3 的 C 端文案都是「待发货」**——前端做状态分组时不能只按文案去重，要用 code。
另外 `orderStatus`/`orderStatusDesc` 已由后端下发，**前端不需要自己映射状态文案**。

### 6.7 关键 VO 字段（前端已对齐）

`ProductVO`：`id, name, subTitle, brand, image, title, body, price, originalPrice, promotionTag, marketPrice, stock, categoryId, tagId, salesMode, status, productCode, weight, volume, specs`

> 前端 `ProductCard.vue` / `ProductDetail.vue` 用的 `name / subTitle / image / price / originalPrice / promotionTag / marketPrice / brand / stock / title / body` **字段名与后端完全一致** ✅
> `body` 是后台富文本，列表接口不返回，详情页用 `v-html` 渲染 ✅
> `specs` 是规格参数（有序键值对，**不是 SKU**），前端目前未展示——详情页可补
> `originalPrice` 有活动时才是活动前价，无活动为 `null`；`marketPrice` 是划线价

`PageVO`：`{ list, total, page, pageSize }` —— 与前端 `getProductPage` 的期望一致 ✅
`CartVO`：`productId, name, image, price, originalPrice, promotionTag, description, quantity, insuranceDetail, insuranceFee, stock, subTotal`（含快照字段，前端可直接渲染，不用再查商品）
`OrderVO`：`id, orderNo, payAmount, originalAmount, discountAmount, couponId, couponName, couponAmount, payType, payTypeDesc, orderStatus, orderStatusDesc, remark, consignee, phone, region, detailAddress, shippingType, courier, trackingNumber, signStatus, logisticsStatus, latestTrace, createdAt, payAt, shipAt, confirmAt, finishAt, reviewed, afterSale, items[]`

### 6.8 后端真实缺口（修正之前的判断）

| # | 缺口 | 状态 |
|---|---|---|
| 1 | **C 端非微信登录** | 🔴 唯一硬缺口，见下 |
| 2 | 商品评价**列表**接口 | ✅ **已解决**（2026-11-02 后端补了 `GET /api/reviews/product/{id}` + `/summary`，商城详情页已接入评价区） |
| 3 | 搜索筛选/排序 | ✅ **已解决**——`/api/products/page` 已支持 `brand` / `minPrice` / `maxPrice` / `sort`（`default` / `price_asc` / `price_desc` / `newest`）。原 README 第七节「目前只有关键词 + 分类」的描述**已过时** |
| 4 | 真实微信支付 | 🟡 仍是模拟状态流转（`payOrder` 只改状态） |
| 5 | 订单列表按状态筛选 | 🟡 后端只支持 `keyword`，状态分组要前端过滤 |
| 6 | SKU | ✅ 按决策不做，后端 `specs` 是规格参数不是 SKU |

### 6.9 🔴 C 端登录缺口的具体情况

**当前后端能拿到的令牌只有两种**：

| 接口 | 服务 | 令牌类型 | 能否用于商城 |
|---|---|---|---|
| `POST /api/login` | auth-service | `type=admin` | ❌ 会被 `JwtInterceptor` 判 **403 无权访问** |
| `POST /api/wxlogin` | user-service | `type=user` | ❌ 需要微信小程序 `wx.login()` 的 code，PC 浏览器拿不到 |

`generateUserToken` 全仓库**只有一处调用**：`UserServiceImpl.login()`（小程序登录流程内）。
`grep -rn "demo-login\|phone-login\|sms"` → **零命中**，确认没有任何手机号/验证码登录接口。

> 补充：`/api/auth/phone-login` 这个接口**也已经不存在了**——后台登录已于 2026-10-30 改为账号密码 + 图形验证码。原 README 第七节写的「现有 `/api/auth/phone-login` 是后台管理员登录」这段描述**已过时**。

**开发环境有个现成的临时通道**：`wechat.dev-mock-enabled=true`（仅本地 `application-dev.yml`）时，微信 `jscode2session` 返回 `errcode=40164`（IP 不在白名单）会**回落成固定 mock openid `dev_mock_openid`** 并正常签发 user 令牌。

> ⚠️ 这意味着：**本地**可以用任意 code 调 `/api/wxlogin` 拿到 user 令牌，可以当临时联调通道。
> 但生产 `dev-mock-enabled` 必须为 false，且这条路依赖微信接口先返回一个 40164，不是稳定的登录方式。**不能作为正式方案。**

**正式方案（建议）**：在 `user-service` 加一个 dev profile 专用接口。

```
POST /api/demo-login?phone=13800138000
→ { success:true, data:{ token:"<user JWT>", id:123, avatar:null } }
```

- 位置：`user-service/src/main/java/ecommerce/user/controller/`，与 `WxLoginController` 并列
- 逻辑：按 `user.phone` 查 `User`，查不到就自动建（`openid` 填 `demo_<phone>`，`name` 填 `演示用户`）；复用 `jwtUtil.generateUserToken(user.getId())`
- **必须用 `@Profile("dev")` 或配置开关双重限制**，生产 profile 不注册该 Bean
- `user` 表已有 `phone` / `name` / `avatar` / `openid` 字段，无需改表
- 需要同时加进 `EXCLUDE_AUTH_PATHS`（否则拦截器会先拦下来要求 token）

改造量：一个 Controller + 一个 Service 方法 + 一行白名单，**不需要动网关**（`/api/**` 兜底路由会把它送到 user-service）。

### 6.10 后端已知的能力富余点

商城可以白拿的能力：

- `/api/products/random` —— 首页下拉刷新换一批（`excludeIds` 排除已展示）
- `/api/products/hot` —— 推荐分类优先的热门
- `ProductVO.specs` —— 规格参数，详情页可展示
- `/api/orders/quote` —— 下单前实时报价（直减/满减/券），确认页金额不用前端算
- `/api/coupons/available` —— 后端算好每张券能减多少、为什么不可用
- `/api/member/profile` —— 会员等级 / 成长值
- 幂等键 `idempotencyKey` —— 下单防重复提交，前端生成 UUID

---

## 七、约定（沿用原 README 第九节，继续有效）

- 文件名 kebab-case
- API 层只做请求，不写业务逻辑；业务逻辑放 store 或页面
- 金额一律用后端返回的 number，前端只做展示格式化，**不参与计算**
- 图片返回 `/image/upload/xxx.webp` 相对路径，直接用（浏览器按当前源解析，Nginx/Vite 已代理 `/image`）
- 不引入后台管理端的 ant-design-vue，商城视觉独立

---

## 八、工作区改动全貌（2026-10-30 复查）

`git status` 显示这是一次**未提交的大重构**，不是零散修改。看 diff 就清楚：

| 文件 | 改动 | 方向 |
|---|---|---|
| `src/styles/global.css`（71 行）→ `src/style/index.css`（241 行） | 全局样式重构：变量换命名体系、新增工具类、响应式断点 640→768px | ✅ 前进（但见 P1） |
| `src/api/product.js` | 新增 `getProductPage`（`/products/page`） | ✅ 前进 |
| `src/views/ProductList.vue` | 改分页接口 + `loadSeq` 请求序号 + 「加载更多」 | ✅ 前进 |
| `src/views/Search.vue` | 同上 | ✅ 前进 |
| `src/components/ProductCard.vue` | +23 行（促销标签等） | ✅ 前进 |
| `src/layouts/DefaultLayout.vue` | +77 行（sticky 头 / 头像 / 备案信息） | ✅ 前进 |
| `src/views/ProductDetail.vue` | +23 行 | ✅ 前进 |
| `src/main.js` | 样式入口从 `@/styles/global.css` 改到 `../src/style/index.css` | ✅ 前进 |
| `vite.config.js` / `package.json` | 移除 `vite-plugin-vue-devtools` | ✅ 前进 |
| **`src/views/Home.vue`** | 原为 **-68 行**（把 HEAD 的 `/api/home` 数据版换成静态线框） | ✅ **2026-10-30 已改版**：接真实数据 + 淘宝式分类栏 + 轮播图 |

**关键结论**：工作区 90% 是有价值的重构，当初**只有 `Home.vue` 是倒退**（2026-10-30 已改版修复）。
→ **绝不要 `git checkout .` 或 `git stash` 撤销整个工作区**，那会把分页接口、懒加载骨架屏、sticky 头部、布局这些一起丢掉。
→ 正确做法：只处理 `Home.vue`（按草稿意图改版，保留数据逻辑）。**已完成。**

### 目录卫生问题 🟡

新全局样式 `src/style/index.css` 放在**仓库根目录的 `style/`** 里，而这个目录原本是**旧静态站（DedeCMS）的遗留目录**：

- HEAD 版 `src/style/index.css` 是旧站的 1124 行 CSS（蓝色主题 `--primary: #2563EB`），**被整个覆盖**成新的 241 行商城全局样式
- 旧站的 `images/`、`js/` 已从磁盘删除；`pages/`、`public/` 变成空目录残留

建议：把全局样式挪到 `src/styles/index.css`（或 `src/styles/global.css`），恢复 Vite 项目的目录约定，与另外两个前端（`src/` 标准）一致，同时清掉空的 `pages/`、`public/`。

---

## 九、移动端适配现状

当前是**基础响应式**（桌面优先），不是完整的移动端适配。

**已做的**

- `index.html` 有移动端视口：`<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- 响应式断点（现均在 `src/style/index.css`）：
  - `@media (max-width: 768px)`：`.container` 收窄、`.section-title` 缩小、`.product-grid` 变两列
- `DefaultLayout.vue` 的 `@media (max-width: 640px)`：头部换行、搜索框独占一行
- `ProductDetail.vue` 的 `@media (max-width: 768px)`：图文详情上下堆叠
- 布局主体用 `auto-fill` 网格，宽度自适应，不会横向滚动

**未做的**

- 移动端导航（汉堡菜单 / 底部 Tab）
- 底部购物车栏
- 列表页窄屏专属优化

移动端完整购物体验仍以 `e-commerce-uniapp` 小程序为准（小程序是真正的移动端实现）。

---

## 十、部署配置

| 项 | 值 |
|---|---|
| 站点根目录 | `/www/wwwroot/xiaojiecpn.com` |
| Nginx 配置 | `deploy/xiaojiecpn-mall.conf`（仓库内唯一权威副本）→ 服务器放到 `/www/server/panel/vhost/nginx/extension/xiaojiecpn.com/mall.conf`，主配置 include 该目录 |
| 路由规则 | `/api/**` `/image/**` `/upload/**` → `http://127.0.0.1:8080`；`location /` → `try_files $uri $uri/ /index.html`（SPA 回退） |
| 本地构建 | `npm run build` |
| 发布 | 在 `e-commerce-boot` 仓库执行：`./deploy/release-mall.sh`（专用脚本，写死 `WEB_DIR=../ecommerce-mall` + `WEB_ROOT=/www/wwwroot/xiaojiecpn.com`，自动留 `.bak.<时间戳>` 备份）。⚠️ **不要用裸的 `./deploy/release-web.sh`** —— 它默认发后台管理端到 `/www/wwwroot/jiemids.com`，2026-10-31 已因此发错过一次 |
| CDN | **腾讯云 EdgeOne**（不是 Cloudflare）。替换 `index.html` 后需在 EdgeOne 控制台刷新缓存（至少 `index.html` + `/assets/*`）；自查是否命中边缘缓存：`curl -I https://www.xiaojiecpn.com/ \| grep -i "EO-Cache-Status\|Age"` |
| 回滚 | `rsync -a --delete --exclude '.well-known' <备份目录>/ /www/wwwroot/xiaojiecpn.com/` |

验收 `curl`：

```bash
curl -I https://www.xiaojiecpn.com/
curl -s  https://www.xiaojiecpn.com/api/home?limit=1
curl -I https://www.xiaojiecpn.com/product/1      # SPA 回退，应 200
curl -I https://www.xiaojiecpn.com/image/upload/1.webp
```

---

## 十一、四仓库对照（商城端的定位）

| 维度 | 商城端 `ecommerce-mall` | 管理端 `e-commerce` | 小程序端 `e-commerce-uniapp` |
|---|---|---|---|
| 定位 | PC 商城（淘宝式） | 后台管理 | 移动端商城 |
| 框架 | Vue 3 + Vite 裸搭 | Vue 3 + `stepin` 框架包 | uni-app (Vue 3) |
| UI 库 | Element Plus 2（全量） | ant-design-vue 3 | uview-plus + uni-ui |
| 请求解包 | 单层 `res.data` | 双层 `res.data.data` | 单层 `res.data.data` |
| 登录 | ❌ **后端缺 C 端登录接口** | 账号 + 密码 + 图形验证码 | 微信 `uni.login` 静默无感 |
| 接口覆盖 | 仅商品浏览 6 个 | admin 全量 | **C 端全量（13 个 api 文件）** |
| 目录约定 | `src/` 标准（但全局样式在根目录 `style/`） | `src/` 标准 | 根目录平铺，**无 `src/`** |
| 购物链路 | **未通** | — | 已通 |
| 成熟度 | 最低 | 高（脏配置多） | 最高 |

### 商城端可以直接抄小程序的什么

小程序端是后端 C 端契约的**活文档**，商城端 P2/P3 可以直接照抄：

| 小程序 | 商城端对应 | 状态 |
|---|---|---|
| `api/cart.js`（50 行） | `src/api/cart.js` | ❌ 未建 |
| `api/order.js`（122 行） | `src/api/order.js` | ❌ 未建 |
| `api/address.js` / `api/coupon.js` / `api/member.js` / `api/favorite.js` / `api/after-sale.js` | 同名 `src/api/*.js` | ❌ 未建 |
| `api/login.js` | `src/api/auth.js` | ❌ 未建（且后端缺 C 端登录） |
| `components/quantity-stepper.vue` | `src/components/QuantityStepper.vue` | ❌ 未建 |
| `components/address-popup.vue` | `src/components/AddressPopup.vue` | ❌ 未建 |
| `components/login-popup.vue` | `src/components/LoginPopup.vue` | ❌ 未建 |
| `components/order-card.vue` | `src/components/OrderCard.vue` | ❌ 未建 |
| `utils/format.js`（fmtMoney / formatOrderTime / goodsImgUrl） | `src/utils/format.js` | ⚠ 只有 `formatPrice` |

> 注意：抄的时候要把 uni-app 的语法翻译成 Vue 3 web 语法（`view`→`div`、`text`→`span`、`image`→`img`、
> `uni.request`→axios、`uni.showToast`→Element Plus `ElMessage`），不是直接复制。

### 商城端可以直接抄小程序的什么（首页设计）

小程序首页的**结构与商城端 `Home.vue` 草稿高度一致**，可作为改版的现成参考：

| 小程序组件 | 商城端草稿对应 | 说明 |
|---|---|---|
| `pages/index/component/category-panel.vue` | `.side-bar.l`「商品分类」 | 分类宫格 + 骨架屏占位（避免数据回来时页面跳动） |
| `components/custom-swiper.vue` | `.banner`「轮播图」 | 自绘轮播 |
| `pages/index/component/hot-panel.vue` | `.side-bar.r`「促销图片」 | 4 色块 × 左右商品位 |
| `components/Guess.vue` | `.guess`「猜你喜欢」 | 标题带装饰线 + 商品网格；数据源是 `GET /api/products/recommend`（免登录，未登录走销量热门兜底） |

小程序 `Guess.vue` 的商品卡片结构（促销标签 / 名称 / 价格 / 划线价）与商城端 `ProductCard.vue` **几乎一一对应**，
可直接作为商城端首页商品区的样式基准。
