import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 本地开发统一走网关 8080，避免跨域；后端没起时把 target 换成 https://api.jiemids.com
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      // 商品图片（后端存 /image/upload/xxx.webp 相对路径）
      '/image': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      // 用户头像等上传文件
      '/upload': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
