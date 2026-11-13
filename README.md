# 杰米商城 · PC 端（ecommerce-mall）

「杰米多多」电商的 **PC 端商城前端**。与微信小程序共用同一套后端数据（同一张 `user` 表、同一套 C 端业务接口），区别只在登录入口和 UI。

后端主仓库是 [`e-commerce-boot`](https://github.com/Katherine0313/e-commerce-boot.git)（Java 微服务），线上地址 `https://www.xiaojiecpn.com`。

## 仓库清单

| 仓库 | 内容 |
|---|---|
| **[ecommerce-mall](https://github.com/Katherine0313/ecommerce-mall.git)** | **PC 商城前端（Vue 3 + Vite），本仓库** |
| [e-commerce-boot](https://github.com/Katherine0313/e-commerce-boot.git) | Java 后端微服务（核心） |
| [e-commerce](https://github.com/Katherine0313/e-commerce.git) | 后台管理系统（Vue 3 + Ant Design Vue） |
| [e-commerce-uniapp](https://github.com/Katherine0313/e-commerce-uniapp.git) | 微信小程序（uni-app） |
| [ecommerce-python](https://github.com/Katherine0313/ecommerce-python.git) | AI 客服服务（Python FastAPI + LangGraph + 知识库检索） |

## 技术栈

| | |
|---|---|
| 框架 | Vue 3（`<script setup>`） |
| 构建 | Vite 5 |
| UI | Element Plus |
| 状态 | Pinia |
| 路由 | Vue Router |
| 请求 | Axios |
| 样式 | 无预处理器；全局变量与工具类在 `src/style/index.css` |

## 功能

| 模块 | 路由 |
|---|---|
| 首页 | `/`（轮播、分类、猜你喜欢、秒杀） |
| 商品 | `/products-list`、`/category/:id`、`/product/:id`、`/search` |
| 交易 | `/cart`、`/checkout`、`/pay/:orderId` |
| 订单与售后 | `/orders`、`/orders/:id`、`/aftersales`、`/aftersales/apply/:orderId` |
| 用户中心 | `/user` 下辖订单、个人资料、收货地址、收藏、优惠券、会员 |
| 其他 | `/article/:id` 文章详情、`/ai-chat` AI 客服、`/login` |

## 目录

```
src/
├── main.js             入口（含 element-plus 与全局样式引入顺序）
├── App.vue
├── api/                按业务模块拆的接口封装
├── assets/             图片与静态资源
├── components/         通用组件
├── constants/          常量
├── router/             路由表
├── stores/             Pinia 状态
├── style/index.css     全局变量 / 重置 / 工具类 / 响应式
├── utils/              请求封装、鉴权、格式化
└── views/              页面
public/                 静态资源（含各省市区 json）
deploy/
└── xiaojiecpn-mall.conf   生产 Nginx 配置（/api 与 /image 反代 + SPA 伪静态）
docs/
├── planning/           规划三件套：findings / task_plan / progress
└── personal.md         个人中心改版方案
```

## 本地运行

```bash
npm install
npm run dev        # 开发（http://localhost:5173）
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
```

**接口走同域相对路径 `/api`**，不需要配置环境变量：

- 本地：`vite.config.js` 的 dev proxy 把 `/api`、`/image`、`/upload` 转发到 `http://127.0.0.1:8080`（Java 网关），避免跨域。后端没起时把 target 换成 `https://api.jiemids.com`
- 生产：Nginx 同域反代 `/api` 与 `/image`，见 `deploy/xiaojiecpn-mall.conf`

## 部署

构建产物 `dist/` 由 `e-commerce-boot` 的 `./deploy/release-mall.sh` 统一发布（npm build → tar 上传 → rsync 到站点目录，保留 `.env` 等文件，自动留备份）。Nginx 配置见 `deploy/xiaojiecpn-mall.conf`。

> `release-mall.sh` 已把站点目录与工程目录写死并加了校验，**两个前端站点必须用各自的脚本** —— 后台管理端用 `release-web.sh`，PC 商城用 `release-mall.sh`，漏带环境变量会发错站点。
