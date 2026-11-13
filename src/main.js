import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

// Element Plus 基础样式先引入，全局样式放后面以便覆盖主色
import 'element-plus/dist/index.css'
// 通用全局样式（设计变量 / 重置 / 工具类 / 响应式）
import './style/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 全量注册 Element Plus（表单/分页/弹窗）
app.use(ElementPlus)
app.use(createPinia())
app.use(router)

app.mount('#app')
