<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const keyword = ref('')

// 从搜索页返回时同步输入框内容
watch(
  () => route.query.keyword,
  (value) => {
    if (route.name === 'search') keyword.value = value || ''
  },
  { immediate: true }
)

function onSearch() {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { keyword: q } : {} })
}
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="container header-inner">
        <router-link to="/" class="logo">杰米商城</router-link>

        <form class="search" @submit.prevent="onSearch">
          <el-input v-model="keyword" placeholder="搜索商品" clearable />
          <el-button type="primary" native-type="submit">搜索</el-button>
        </form>

        <nav class="nav">
          <router-link to="/">首页</router-link>
          <router-link to="/products">全部商品</router-link>
        </nav>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <div class="container">© 2026 杰米多多电子商务工作室</div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background: #fff;
  border-bottom: 1px solid var(--mall-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 64px;
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--mall-primary);
  white-space: nowrap;
}

.search {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 520px;
}

.nav {
  display: flex;
  gap: 20px;
  margin-left: auto;
  font-size: 15px;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--mall-primary);
}

.main {
  flex: 1;
  padding: 20px 0 40px;
}

.footer {
  background: #fff;
  border-top: 1px solid var(--mall-border);
  padding: 20px 0;
  color: var(--mall-text-light);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 640px) {
  .header-inner {
    flex-wrap: wrap;
    height: auto;
    padding: 10px 0;
    gap: 10px;
  }

  .search {
    order: 3;
    flex-basis: 100%;
  }

  .nav {
    margin-left: auto;
  }
}
</style>
