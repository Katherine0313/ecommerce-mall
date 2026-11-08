<script setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Promotion, Menu, Headset } from '@element-plus/icons-vue'
import aiAvatar from '@/assets/ai-avatar.webp'
import {
  getAiConversations,
  getAiConversation,
  getAiMessages,
  deleteAiConversation,
  aiHandoff,
} from '@/api/ai.js'
import { getToken, removeToken } from '@/utils/token.js'
import { formatPrice } from '@/utils/format'

const router = useRouter()

const conversations = ref([])
const activeId = ref(null)
// 消息项：{ id?, type: 'user'|'assistant', content, products: [], streaming? }
const messages = ref([])
const input = ref('')
const sending = ref(false)
const listVisible = ref(false) // 窄屏会话抽屉
const msgListRef = ref(null)
// 思考中的计时（秒）：首个 token 到达前显示「正在思考 Ns」
const thinkingSeconds = ref(0)
let thinkingTimer = null

function startThinkingTimer() {
  stopThinkingTimer()
  thinkingSeconds.value = 0
  thinkingTimer = setInterval(() => {
    thinkingSeconds.value += 1
  }, 1000)
}

function stopThinkingTimer() {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
}

const QUICK_QUESTIONS = ['有什么热销商品', '怎么退换货', '帮我推荐礼物', '人工客服']

// 触发人工客服卡片的关键词
const HANDOFF_RE = /(人工客服|转人工|真人客服|找人工)/

// 人工会话状态
const humanMode = ref(false)
const handoffLoading = ref(false)
let humanTimer = null

let abortController = null
let watchdog = null
let watchdogFired = false

function scrollToBottom() {
  nextTick(() => {
    const el = msgListRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function loadConversations() {
  try {
    const list = await getAiConversations()
    // 按 updatedAt 倒序（后端未必排好，前端兜底）
    conversations.value = (list || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  } catch (e) {
    // 401/403 已由 request 拦截器清 token 跳登录页，这里静默
  }
}

async function openConversation(conv) {
  if (sending.value || !conv) return
  activeId.value = conv.id
  listVisible.value = false
  messages.value = []
  humanMode.value = !!conv.humanMode
  if (humanMode.value) startHumanPolling()
  else stopHumanPolling()
  try {
    const list = await getAiMessages(conv.id)
    messages.value = (list || []).map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      products: [],
    }))
    scrollToBottom()
  } catch (e) {
    // 失败保持空白会话，不影响发新消息
  }
}

function newConversation() {
  if (sending.value) return
  activeId.value = null
  messages.value = []
  listVisible.value = false
  humanMode.value = false
  stopHumanPolling()
}

async function removeConversation(conv) {
  try {
    await deleteAiConversation(conv.id)
    conversations.value = conversations.value.filter((c) => c.id !== conv.id)
    if (activeId.value === conv.id) newConversation()
    ElMessage.success('已删除')
  } catch (e) {
    // 拦截器已提示
  }
}

function clearWatchdog() {
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
}

// 60 秒无数据就主动断开，避免流挂着页面一直转圈
function armWatchdog() {
  clearWatchdog()
  watchdog = setTimeout(() => {
    watchdogFired = true
    abortController?.abort()
  }, 60000)
}

function toLogin() {
  router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
}

async function send(text) {
  const content = (typeof text === 'string' ? text : input.value).trim()
  if (!content || sending.value) return
  const token = getToken()
  if (!token) {
    toLogin()
    return
  }

  // 人工会话：不再走模型，直接把消息落库交给后台客服
  if (humanMode.value) {
    await sendHuman(content)
    return
  }

  // 命中「人工客服」等关键词：先弹出转人工卡片，点击后再进入人工会话
  if (HANDOFF_RE.test(content)) {
    input.value = ''
    messages.value.push({ type: 'user', content, products: [] })
    messages.value.push({
      type: 'assistant',
      content: '',
      products: [],
      handoffCard: true,
      pendingText: content,
    })
    scrollToBottom()
    return
  }

  input.value = ''
  sending.value = true
  messages.value.push({ type: 'user', content, products: [] })
  // 用 reactive 包一层：流式 token 直接改这个对象，才能逐字触发视图更新
  const assistant = reactive({ type: 'assistant', content: '', products: [], streaming: true, thinking: true })
  messages.value.push(assistant)
  scrollToBottom()
  startThinkingTimer()

  abortController = new AbortController()
  watchdogFired = false
  armWatchdog()

  try {
    // SSE 是 POST，不能用 EventSource；手动带与 axios 拦截器一致的 Authorization 头
    const res = await fetch('/api/mall/ai/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: content,
        conversationId: activeId.value || undefined,
      }),
      signal: abortController.signal,
    })

    if (!res.ok) {
      // 与 utils/request.js 拦截器行为对齐：401/403 清 token 回登录页
      if (res.status === 401 || res.status === 403) {
        removeToken()
        toLogin()
        throw new Error('登录已过期，请重新登录')
      }
      if (res.status === 429) throw new Error('提问太频繁了，请稍后再试')
      throw new Error(`请求失败（${res.status}）`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      armWatchdog() // 有数据流动就重置看门狗
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // 末尾可能是半行，留到下一块
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        let event
        try {
          event = JSON.parse(trimmed.slice(5))
        } catch {
          continue // 半行/心跳，跳过
        }
        if (event.type === 'meta') {
          if (event.conversationId) activeId.value = event.conversationId
        } else if (event.type === 'token') {
          // 首个 token 到达：结束「正在思考」并记下耗时
          if (assistant.thinking) {
            assistant.thinking = false
            assistant.thinkSeconds = thinkingSeconds.value
            stopThinkingTimer()
          }
          assistant.content += event.text || ''
          scrollToBottom()
        } else if (event.type === 'products') {
          assistant.products = event.items || []
          scrollToBottom()
        } else if (event.type === 'error') {
          throw new Error(event.message || 'AI 服务出错了')
        }
        // type === 'done'：正常结束，等流关闭即可
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      if (watchdogFired) {
        ElMessage.error('响应超时，请稍后重试')
        if (!assistant.content) assistant.content = '响应超时，请稍后重试'
      }
      // 页面卸载时主动 abort 属于正常行为，不提示
    } else {
      ElMessage.error(e.message || '发送失败，请稍后重试')
      // 一个 token 都没收到的空气泡直接撤掉
      if (!assistant.content && !assistant.products.length) {
        messages.value = messages.value.filter((m) => m !== assistant)
      }
    }
  } finally {
    clearWatchdog()
    stopThinkingTimer()
    assistant.thinking = false
    assistant.streaming = false
    sending.value = false
    abortController = null
    loadConversations() // 刷新会话标题与 updatedAt
  }
}

// ===== 人工客服 =====

function scrollToBottomIfNear() {
  nextTick(() => {
    const el = msgListRef.value
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      el.scrollTop = el.scrollHeight
    }
  })
}

async function sendHuman(content) {
  input.value = ''
  sending.value = true
  const mine = { type: 'user', content, products: [] }
  messages.value.push(mine)
  scrollToBottom()
  try {
    const res = await aiHandoff(activeId.value || undefined, content)
    if (res?.conversationId) activeId.value = res.conversationId
    await refreshHuman()
    loadConversations()
  } catch (e) {
    messages.value = messages.value.filter((m) => m !== mine)
    ElMessage.error('发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

async function confirmHandoff(text) {
  const token = getToken()
  if (!token) {
    toLogin()
    return
  }
  if (handoffLoading.value) return
  handoffLoading.value = true
  try {
    const res = await aiHandoff(activeId.value || undefined, text || '人工客服')
    if (res?.conversationId) activeId.value = res.conversationId
    humanMode.value = true
    await refreshHuman()
    startHumanPolling()
    loadConversations()
  } catch (e) {
    ElMessage.error('转人工失败，请稍后重试')
  } finally {
    handoffLoading.value = false
  }
}

// 轮询人工会话：拉最新消息 + 检查客服是否已结束会话
async function refreshHuman() {
  if (!activeId.value) return
  const id = activeId.value
  try {
    const [list, state] = await Promise.all([getAiMessages(id), getAiConversation(id)])
    if (id !== activeId.value) return
    messages.value = (list || []).map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      products: [],
    }))
    if (state && !state.humanMode) {
      humanMode.value = false
      stopHumanPolling()
      ElMessage.info('人工客服已结束会话，有问题可以继续问 AI 客服')
    }
    scrollToBottomIfNear()
  } catch (e) {
    // 轮询失败静默，下一轮重试
  }
}

function startHumanPolling() {
  stopHumanPolling()
  humanTimer = setInterval(refreshHuman, 3000)
}

function stopHumanPolling() {
  if (humanTimer) {
    clearInterval(humanTimer)
    humanTimer = null
  }
}

function onEnter(e) {
  if (e.shiftKey) return // Shift+Enter 换行
  e.preventDefault()
  send()
}

onMounted(loadConversations)

onBeforeUnmount(() => {
  clearWatchdog()
  stopThinkingTimer()
  stopHumanPolling()
  abortController?.abort()
})
</script>

<template>
  <div class="ai-chat">
    <!-- 左侧会话列表（窄屏隐藏，改用顶部抽屉入口） -->
    <aside class="sidebar">
      <el-button type="primary" class="new-btn" :icon="Plus" @click="newConversation">
        新建对话
      </el-button>
      <div class="conv-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: conv.id === activeId }"
          @click="openConversation(conv)"
        >
          <span class="conv-title">{{ conv.title || '新对话' }}</span>
          <el-popconfirm title="确定删除该对话？" width="200" @confirm="removeConversation(conv)">
            <template #reference>
              <button type="button" class="conv-del" aria-label="删除对话" @click.stop>
                <el-icon><Delete /></el-icon>
              </button>
            </template>
          </el-popconfirm>
        </div>
        <p v-if="!conversations.length" class="conv-empty">暂无历史对话</p>
      </div>
    </aside>

    <!-- 右侧聊天区 -->
    <section class="chat">
      <header class="chat-header">
        <button
          type="button"
          class="icon-btn list-toggle"
          aria-label="会话列表"
          @click="listVisible = true"
        >
          <el-icon><Menu /></el-icon>
        </button>
        <span class="chat-title">{{ humanMode ? '人工客服' : 'AI 客服' }}</span>
        <el-tag v-if="humanMode" type="success" size="small" effect="plain">人工接待中</el-tag>
        <el-button text class="header-new" :icon="Plus" @click="newConversation">新对话</el-button>
      </header>

      <div v-if="humanMode" class="human-banner">
        已转接人工客服，请直接留言，客服回复后会显示在这里
      </div>

      <div ref="msgListRef" class="msg-list">
        <!-- 欢迎语 + 快捷提问（无消息时显示） -->
        <div v-if="!messages.length" class="welcome">
          <img class="welcome-avatar" :src="aiAvatar" alt="AI 客服" />
          <p class="welcome-text">您好，我是商城 AI 客服，请问有什么可以帮您？</p>
          <div class="chips">
            <button
              v-for="q in QUICK_QUESTIONS"
              :key="q"
              type="button"
              class="chip"
              :disabled="sending"
              @click="send(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="msg.id ?? index"
          class="msg-row"
          :class="msg.type"
        >
          <img
            v-if="msg.type === 'assistant'"
            class="msg-avatar"
            :src="aiAvatar"
            alt="AI 客服"
          />
          <div class="bubble-wrap">
            <!-- 转人工卡片：点击后进入人工会话 -->
            <div v-if="msg.handoffCard" class="handoff-card">
              <div class="handoff-icon"><el-icon><Headset /></el-icon></div>
              <div class="handoff-body">
                <p class="handoff-title">需要人工客服协助吗？</p>
                <p class="handoff-desc">AI 客服解决不了时，可以转接人工客服继续沟通</p>
                <el-button
                  type="primary"
                  size="small"
                  :loading="handoffLoading"
                  @click="confirmHandoff(msg.pendingText)"
                >
                  联系人工客服
                </el-button>
              </div>
            </div>
            <template v-else>
            <div v-if="msg.thinkSeconds" class="think-done">已思考 {{ msg.thinkSeconds }} 秒</div>
            <div class="bubble">
              <span v-if="msg.thinking" class="thinking">
                正在思考<span class="thinking-dots"><i></i><i></i><i></i></span>
                <span class="thinking-time">{{ thinkingSeconds }}s</span>
              </span>
              <template v-else>
                <span class="msg-text">{{ msg.content }}</span>
                <span v-if="msg.streaming" class="cursor"></span>
              </template>
            </div>
            <!-- AI 推荐的商品卡片：横向列表，点击跳商品详情 -->
            <div v-if="msg.products && msg.products.length" class="product-cards">
              <router-link
                v-for="p in msg.products"
                :key="p.id"
                :to="`/product/${p.id}`"
                class="product-card"
              >
                <img :src="p.mainImage" :alt="p.name" class="pc-img" loading="lazy" />
                <div class="pc-info">
                  <p class="pc-name">{{ p.name }}</p>
                  <p v-if="p.subTitle" class="pc-sub">{{ p.subTitle }}</p>
                  <div class="pc-bottom">
                    <span class="pc-price">¥{{ formatPrice(p.price) }}</span>
                    <span v-if="p.originalPrice" class="pc-origin">
                      ¥{{ formatPrice(p.originalPrice) }}
                    </span>
                    <span class="pc-sales">已售{{ p.sales ?? 0 }}</span>
                  </div>
                </div>
              </router-link>
            </div>
            </template>
          </div>
        </div>
      </div>

      <div class="input-bar">
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          :placeholder="humanMode ? '请输入留言，客服会尽快回复' : '请输入问题，Enter 发送，Shift+Enter 换行'"
          @keydown.enter="onEnter"
        />
        <el-button
          type="primary"
          class="send-btn"
          :icon="Promotion"
          :loading="sending"
          :disabled="!input.trim()"
          @click="send()"
        >
          发送
        </el-button>
      </div>
    </section>

    <!-- 窄屏会话抽屉 -->
    <el-drawer v-model="listVisible" direction="ltr" size="70%" :with-header="false">
      <div class="drawer-panel">
        <el-button type="primary" class="new-btn" :icon="Plus" @click="newConversation">
          新建对话
        </el-button>
        <div class="conv-list">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="conv-item"
            :class="{ active: conv.id === activeId }"
            @click="openConversation(conv)"
          >
            <span class="conv-title">{{ conv.title || '新对话' }}</span>
            <el-popconfirm title="确定删除该对话？" width="200" @confirm="removeConversation(conv)">
              <template #reference>
                <button type="button" class="conv-del" aria-label="删除对话" @click.stop>
                  <el-icon><Delete /></el-icon>
                </button>
              </template>
            </el-popconfirm>
          </div>
          <p v-if="!conversations.length" class="conv-empty">暂无历史对话</p>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.ai-chat {
  display: flex;
  gap: var(--space-md);
  max-width: var(--container-width);
  margin: var(--space-md) auto;
  padding: 0 10px;
  height: calc(100vh - var(--header-height) - 220px);
  min-height: 480px;
}

/* ===== 左侧会话列表 ===== */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  flex-shrink: 0;
  padding: var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.new-btn {
  width: 100%;
}

.conv-list {
  flex: 1;
  margin-top: var(--space-md);
  overflow-y: auto;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.conv-item:hover {
  background: var(--bg-hover);
}

.conv-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.conv-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conv-del {
  display: none;
  border: none;
  background: none;
  padding: 2px;
  color: var(--text-secondary);
  cursor: pointer;
}

.conv-item:hover .conv-del,
.conv-item.active .conv-del {
  display: inline-flex;
}

.conv-del:hover {
  color: var(--el-color-danger);
}

.conv-empty {
  margin: var(--space-md) 0 0;
  font-size: 13px;
  color: var(--text-placeholder);
  text-align: center;
}

/* ===== 右侧聊天区 ===== */
.chat {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px var(--space-md);
  border-bottom: 1px solid var(--border-light);
}

.chat-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 人工接待提示条 */
.human-banner {
  padding: 8px var(--space-md);
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 12px;
  border-bottom: 1px solid var(--border-light);
}

/* 转人工卡片 */
.handoff-card {
  display: flex;
  gap: var(--space-sm);
  width: 300px;
  max-width: 100%;
  padding: var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  border-top-left-radius: var(--radius-sm);
}

.handoff-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 20px;
}

.handoff-body {
  flex: 1;
  min-width: 0;
}

.handoff-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.handoff-desc {
  margin: 4px 0 var(--space-sm);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.list-toggle {
  display: none;
}

.icon-btn {
  border: none;
  background: none;
  padding: 4px;
  font-size: 18px;
  color: var(--text-regular);
  cursor: pointer;
}

.header-new {
  font-size: 13px;
}

/* ===== 消息列表 ===== */
.msg-list {
  flex: 1;
  padding: var(--space-md);
  overflow-y: auto;
  background: var(--bg-page);
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xl) var(--space-md);
}

.welcome-avatar {
  display: block;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  overflow: hidden;
}

.welcome-text {
  margin: var(--space-md) 0;
  font-size: 15px;
  color: var(--text-regular);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
}

.chip {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-card);
  font-size: 13px;
  color: var(--text-regular);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.msg-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-avatar {
  display: block;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  overflow: hidden;
}

.bubble-wrap {
  max-width: 78%;
  min-width: 0;
}

.bubble {
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.msg-row.assistant .bubble {
  border: 1px solid var(--border-light);
  border-top-left-radius: var(--radius-sm);
  color: var(--text-primary);
}

.msg-row.user .bubble {
  background: var(--color-primary);
  border-top-right-radius: var(--radius-sm);
  color: #fff;
}

.msg-text {
  white-space: pre-wrap;
}

/* 流式打字光标 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--color-primary);
  animation: blink 0.8s step-start infinite;
}

/* ===== 思考中：文案 + 跳动的点 + 秒表 ===== */
.thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.thinking-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: think-bounce 1.2s ease-in-out infinite;
}

.thinking-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

.thinking-time {
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* 首个 token 到达后回显耗时，DeepSeek 式「已思考 N 秒」 */
.think-done {
  display: inline-block;
  margin-bottom: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-primary-bg);
  color: var(--text-secondary);
  font-size: 12px;
}

@keyframes think-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* ===== 商品卡片 ===== */
.product-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.product-card {
  display: flex;
  gap: var(--space-sm);
  width: 300px;
  max-width: 100%;
  padding: var(--space-sm);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.product-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.pc-img {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--bg-page);
}

.pc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pc-name {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pc-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pc-bottom {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: auto;
}

.pc-price {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
}

.pc-origin {
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: line-through;
}

.pc-sales {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-placeholder);
}

/* ===== 底部输入框 ===== */
.input-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}

.input-bar :deep(.el-textarea__inner) {
  box-shadow: none;
  border: 1px solid var(--border-color);
}

.send-btn {
  flex-shrink: 0;
}

/* 抽屉内的会话列表面板 */
.drawer-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ===== 窄屏（≤768px）：会话列表收成抽屉，聊天区全屏 ===== */
@media (max-width: 768px) {
  .ai-chat {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    height: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    background: var(--bg-page);
  }

  .sidebar {
    display: none;
  }

  .chat {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .chat-header {
    padding-top: calc(10px + var(--safe-top));
    background: var(--bg-card);
  }

  .list-toggle {
    display: inline-flex;
  }

  .header-new {
    display: none;
  }

  .bubble-wrap {
    max-width: 86%;
  }

  /* 底部输入框适配 iPhone 底部横条安全区（与详情页购买栏同一套变量） */
  .input-bar {
    padding: var(--space-sm) calc(var(--space-sm) + var(--safe-right))
      calc(var(--space-sm) + var(--safe-bottom)) calc(var(--space-sm) + var(--safe-left));
  }
}
</style>
