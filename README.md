# 杰米商城 Web 端（PC 商城）

> 本文件记录「这个项目要做什么、当前做到哪、下一步怎么做」。
> 对话记录可能丢失，以本文件为准；每完成一步就勾选对应 checkbox。

## 一、项目定位

把现有的静态企业站替换成 **单店 B2C PC 商城**，淘宝式购物体验，复用已有后端 `e-commerce-boot` 的 `/api/**`（与小程序共用同一套数据和业务）。

- 线上域名：https://www.xiaojiecpn.com
- 后端 API：https://api.jiemids.com
- 后台管理端：https://www.jiemids.com
- 后端仓库：`D:\study\my-workspace\wechat-workspace\e-commerce-boot`
- 小程序仓库：`D:\study\my-workspace\wechat-workspace\e-commerce-uniapp`

## 二、已确认的决策

| 事项 | 结论 |
|---|---|
| 商城类型 | 单店 B2C，**不做**商家入驻 / 平台抽佣 |
| 商品规格 | **不做 SKU**，只做单规格（沿用现有商品表） |
| 渲染方式 | **Vue 3 + Vite SPA**（不做 SSR，先跑通购物链路） |
| 登录 | 先用演示号 `13800138000` 跑通；**首页/商品浏览不登录**，点「加入购物车/立即购买」再登录 |
| 旧站处理 | 不备份，直接在 `ecommerce-mall/` 目录开发，部署时再切换 Nginx 根目录 |
| 支付 | 首期沿用后端的模拟支付，真实微信支付后置 |

## 三、技术栈

- Vue 3 + Vite
- Vue Router
- Pinia
- Axios
- Element Plus（表单/分页/弹窗）+ 自定义商城样式
- 设计主色沿用小程序：`#FF6700`

## 四、当前进度

### P0 架构（已完成）
- [x] 在 `ecommerce-mall` 初始化 Vite 项目
- [x] 安装依赖：vue-router / pinia / axios / element-plus
- [x] Vite 配置 `/api`、`/image`、`/upload` 代理
- [x] 目录骨架（api/stores/router/layouts/views/components/utils/styles）
- [x] Axios 请求封装（自动带 token、401 跳登录）
- [x] DefaultLayout（Header + 内容区 + Footer）
- [x] 路由表 + 登录守卫
- [x] 首页 `Home.vue` 接 `/api/home`
- [x] 商品列表 `ProductList.vue` 接 `/api/products`
- [x] 商品详情 `ProductDetail.vue` 接 `/api/products/{id}`
- [x] 搜索 `Search.vue` 接 `/api/products?keyword=`

### P1 商品浏览（待开始）
- [ ] 首页：轮播 / 分类入口 / 热门推荐
- [ ] 分类页 / 列表页：分页、筛选（先只做分类）
- [ ] 商品详情：图集、价格、库存、加购按钮
- [ ] 搜索页
- [ ] 骨架屏 / 空态 / 错误态

### P2 账号 + 购物车（待开始）
- [ ] 后端补 C 端 demo 登录（user-service，dev profile，手机号 13800138000 换 user 令牌）
- [ ] 登录页
- [ ] 购物车（后端 cart 接口）
- [ ] 地址管理

### P3 交易（待开始）
- [ ] 确认订单
- [ ] 下单 + 模拟支付
- [ ] 订单列表 / 订单详情
- [ ] 取消订单

### P4 增强（待开始）
- [ ] 收藏
- [ ] 评价（后端目前只有提交评价，列表接口待补）
- [ ] 售后
- [ ] AI 客服（`/api/agent`）

### P5 部署（2026-10-29 已完成首版）
- [x] `npm run build`
- [x] Nginx 增加 `/api`、`/image`、`/upload` 反向代理到 gateway:8080 + SPA 回退（`deploy/xiaojiecpn-mall.conf`）
- [x] 发布 dist 到 `/www/wwwroot/xiaojiecpn.com`（自动备份 `xiaojiecpn.com.bak.<时间戳>`）
- [x] 线上验收：首页 200、`/api/home` 200、`/product/1` 200、图片 200
- [ ] 后续替换页面时重复执行「构建 + 发布」即可

## 五、P0 具体操作步骤

### 1. 初始化项目

```bash
cd /d/study/my-workspace/wechat-workspace
npm create vite@latest ecommerce-mall -- --template vue
cd ecommerce-mall
npm install
npm install vue-router pinia axios element-plus @element-plus/icons-vue
npm run dev
```

看到 `http://localhost:5173` 默认页即成功。

> 旧站文件（index.html / pages / js / style / images）先不要删，留在原地；商城代码都在 `ecommerce-mall/` 里。

### 2. Vite 配置（`ecommerce-mall/vite.config.js`）

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      // 本地后端没起时，把 target 换成 https://api.jiemids.com
      '/api':    { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/image':  { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/upload': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
```

### 3. 目录骨架

```
ecommerce-mall/src/
├── api/          # home.js product.js category.js cart.js order.js user.js address.js
├── stores/       # user.js cart.js
├── router/       # index.js
├── layouts/      # DefaultLayout.vue
├── views/        # Home.vue ProductList.vue ProductDetail.vue Search.vue
│                 # Cart.vue Login.vue Checkout.vue OrderList.vue UserCenter.vue
├── components/   # ProductCard.vue EmptyState.vue
├── utils/        # request.js format.js
└── styles/       # tokens.css global.css
```

### 4. 请求封装（`src/utils/request.js`）

```js
import axios from 'axios'

const request = axios.create({ baseURL: '/api', timeout: 10000 })

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

request.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && body.success === false) return Promise.reject(body)
    return body ? body.data : res.data
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default request
```

### 5. API 封装

直接照抄小程序 `e-commerce-uniapp/api/` 的路径，例如：

```js
// src/api/product.js
import request from '@/utils/request'

export const getProducts = (params) => request.get('/products', { params })
export const searchProducts = (keyword) => request.get('/products', { params: { keyword } })
export const getProductDetail = (id) => request.get('/products/' + id)
export const getCategories = () => request.get('/categories')
export const getHome = (limit = 10) => request.get('/home', { params: { limit } })
```

### 6. 路由（`src/router/index.js`）

```js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('@/views/Home.vue') },
  { path: '/category/:id?', component: () => import('@/views/ProductList.vue') },
  { path: '/search', component: () => import('@/views/Search.vue') },
  { path: '/product/:id', component: () => import('@/views/ProductDetail.vue') },
  { path: '/cart', component: () => import('@/views/Cart.vue'), meta: { requiresAuth: true } },
  { path: '/checkout', component: () => import('@/views/Checkout.vue'), meta: { requiresAuth: true } },
  { path: '/orders', component: () => import('@/views/OrderList.vue'), meta: { requiresAuth: true } },
  { path: '/login', component: () => import('@/views/Login.vue') },
  { path: '/user', component: () => import('@/views/UserCenter.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
```

> 商品详情**不加** `requiresAuth`：游客可浏览、可分享；登录判断放在「加入购物车 / 立即购买」按钮。

### 7. P0 验收标准

- [ ] 首页能看到真实分类和商品（来自 `/api/home`）
- [ ] 点击分类进入列表，能看到商品（`/api/products?categoryId=`）
- [ ] 商品详情能打开（`/api/products/{id}`）
- [ ] 搜索关键词能返回结果（`/api/products?keyword=`）
- [ ] 游客浏览全程不报 401
- [ ] 点「加入购物车」才跳登录

## 六、接口对应表（C 端）

| 功能 | 方法 | 路径 |
|---|---|---|
| 首页聚合（分类 + 猜你喜欢） | GET | `/api/home?limit=10` |
| 商品列表 / 按分类 | GET | `/api/products?categoryId=` |
| 商品搜索 | GET | `/api/products?keyword=` |
| 商品详情 | GET | `/api/products/{id}` |
| 热门推荐（推荐分类优先） | GET | `/api/products/hot?limit=8` |
| 分类树 | GET | `/api/categories` |
| 登录（小程序） | POST | `/api/wxlogin` |
| 用户资料 | GET | `/api/user/profile` |
| 购物车列表 | GET | `/api/cart` |
| 加购 | POST | `/api/cart` |
| 改数量 | PUT | `/api/cart/{productId}` |
| 删单项 / 清空 | DELETE | `/api/cart/{productId}`、`/api/cart` |
| 购物车数量 | GET | `/api/cart/count` |
| 地址列表 / 新增 | GET / POST | `/api/address` |
| 地址修改 / 删除 | PUT / DELETE | `/api/address/{id}` |
| 下单 | POST | `/api/orders` |
| 订单列表 / 详情 | GET | `/api/orders`、`/api/orders/{id}` |
| 支付（模拟） | PUT | `/api/orders/{id}/pay` |
| 取消订单 | PUT | `/api/orders/{id}/cancel` |
| 评价 | POST | `/api/orders/{id}/review` |
| 收藏列表 / 是否收藏 | GET | `/api/favorites`、`/api/favorites/check?productId=` |
| 收藏 / 取消 | POST / DELETE | `/api/favorites/{productId}` |
| 售后列表 / 详情 | GET | `/api/after-sales`、`/api/after-sales/{id}` |
| 售后退货/换货提交 | POST | `/api/after-sales/{id}/submit-return` |
| AI 客服 | POST | `/api/agent/chat` |

> 路径以小程序 `e-commerce-uniapp/api/*.js` 为准，联调时对一下。

## 七、后端缺口（需要补，按阶段）

1. **C 端 Web 登录（P2 必做）**
   - 现有 `/api/auth/phone-login` 是**后台管理员**登录，签的是 admin 令牌，C 端接口会拒绝。
   - 需要在 `user-service` 加一个 dev/demo 登录接口，例如 `POST /api/demo-login?phone=13800138000`：
     按 phone 查 user，没有就自动注册（openid 可用 `demo_<phone>`），返回 **user 类型** 的 JWT。
   - 仅 dev profile 开启，生产不暴露。
2. **评价列表**：目前只有提交评价 `POST /api/orders/{id}/review`，没有商品评价列表接口。
3. **搜索筛选/排序**：目前只有关键词 + 分类，没有价格/品牌/销量排序。
4. **支付**：后端 `payOrder` 仍是模拟状态流转，真实微信支付未接。
5. **SKU**：明确不做，商品详情按单规格展示。

## 八、部署

站点根目录：`/www/wwwroot/xiaojiecpn.com`（Nginx 配置 `/www/server/panel/vhost/nginx/html_xiaojiecpn.com.conf`）。

最终结构：

```
www.xiaojiecpn.com
├── /            → ecommerce-mall/dist（Vue 构建产物）
├── /api/**      → http://127.0.0.1:8080/api/**
├── /image/**    → http://127.0.0.1:8080/image/**
└── /upload/**   → http://127.0.0.1:8080/upload/**
```

### 1. 本地构建

```bash
cd /d/study/my-workspace/wechat-workspace/ecommerce-mall
npm run build
```

### 2. 服务器加 Nginx 代理（只需配置一次）

新建 `/www/server/panel/vhost/nginx/extension/xiaojiecpn.com/mall.conf`：

```nginx
# 同源代理到 Spring Cloud 网关，避免 CORS
location ^~ /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
    proxy_buffering off;   # AI 客服 SSE 需要
}

location ^~ /image/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /upload/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Vue Router history 模式：刷新子路由不 404
location / {
    try_files $uri $uri/ /index.html;
}
```

然后：

```bash
/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload
```

### 3. 发布 dist

在 `e-commerce-boot` 仓库执行（复用后台前端的发布脚本）：

```bash
cd /d/study/my-workspace/wechat-workspace/e-commerce-boot
WEB_DIR=/d/study/my-workspace/wechat-workspace/ecommerce-mall \
WEB_ROOT=/www/wwwroot/xiaojiecpn.com \
./deploy/release-web.sh --no-build
```

脚本会先生成站点快照（`xiaojiecpn.com.bak.<时间戳>`），再把 `dist` 同步过去，并保留 `.well-known` 等文件。

### 4. 清 Cloudflare 缓存

替换 `index.html` 后，到 Cloudflare 控制台 Purge Everything（或只清 `www.xiaojiecpn.com/index.html` 和 `/assets/*`）。

### 5. 验证

```bash
curl -I https://www.xiaojiecpn.com/
curl -s  https://www.xiaojiecpn.com/api/home?limit=1
curl -I https://www.xiaojiecpn.com/product/1      # 应为 200（SPA 回退）
curl -I https://www.xiaojiecpn.com/image/upload/1.webp
```

页面里应看到「杰米商城」，商品数据来自 `api.jiemids.com` 同源的 `/api` 代理。

### 6. 回滚

```bash
ssh ecommerce
ls -1dt /www/wwwroot/xiaojiecpn.com.bak.* | head
# 用最新备份覆盖回去（注意保留 .well-known）
rsync -a --delete --exclude '.well-known' <备份目录>/ /www/wwwroot/xiaojiecpn.com/
```

## 九、约定

- 页面/组件文件名用短横线（kebab-case）
- API 层只做请求，不写业务逻辑；业务逻辑放 store 或页面
- 所有金额用后端返回的 `number`，前端只做展示格式化，不参与计算
- 图片地址后端返回 `/image/upload/xxx.webp` 相对路径，直接拼当前域名使用
- 不引入和后台管理端一样的 ant-design-vue，商城视觉独立
