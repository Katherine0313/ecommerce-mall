import request from '@/utils/request'

// ===== AI 客服接口（需登录；流式对话 POST /mall/ai/chat/stream 是 SSE，
// 走不了 axios，在 AiChat.vue 里用 fetch + ReadableStream 单独实现）=====

// 会话列表（[{id,title,roleId,pinned,humanMode,updatedAt}]）
export const getAiConversations = () => request.get('/mall/ai/conversations')

// 单个会话（转人工状态轮询用，{id,title,humanMode,humanAt}）
export const getAiConversation = (id) => request.get(`/mall/ai/conversations/${id}`)

// 会话历史消息（[{id,type:user|assistant,content,createdAt}]）
export const getAiMessages = (id) => request.get(`/mall/ai/conversations/${id}/messages`)

// 删除会话
export const deleteAiConversation = (id) => request.delete(`/mall/ai/conversations/${id}`)

// 转人工：复用/新建会话并切到人工模式；message 为本次要落库的用户消息
export const aiHandoff = (conversationId, message) =>
  request.post('/mall/ai/handoff', { conversationId, message })
