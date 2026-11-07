<script setup>
// 个人资料页（路由 /user/personal-info）
// 可修改：头像、昵称、手机号；只读：用户名、注册时间；账号安全组提供注销账号。
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProfile, uploadAvatar, setName, bindPhone, deactivate } from '@/api/user.js'
import { sendLoginCode } from '@/api/auth.js'
import { useUserStore } from '@/stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true) // 整页加载中（v-loading）
const saving = ref(false) // 保存 / 上传中，防止重复提交
const profile = ref(null) // 后端返回的用户资料

// 昵称：是否处于编辑态 + 编辑中的输入值
const nameEditing = ref(false)
const nameForm = ref('')

// 手机号：是否处于编辑态 + 输入中的手机号 / 验证码
const phoneEditing = ref(false)
const phoneForm = ref('')
const phoneCode = ref('')
const sending = ref(false) // 验证码请求中
const countdown = ref(0) // 验证码倒计时秒数
let countdownTimer = null // 倒计时定时器，重新发送时先清掉

// 拉取用户资料，同时回填两个编辑表单的初始值
function load() {
  loading.value = true
  getProfile()
    .then((data) => {
      profile.value = data
      nameForm.value = data?.name || ''
      phoneForm.value = data?.phone || ''
    })
    .catch((e) => {
      ElMessage.error(e?.message || '资料加载失败')
    })
    .finally(() => {
      loading.value = false
    })
}

// ===== 头像 =====
// el-upload 设了 before-upload 返回 false，不会自动上传；
// 这里在「选中文件」时拿原始 File 手动调上传接口，成功后重新拉资料刷新头像
function onAvatarChange(file) {
  // el-upload 传给回调的是 UploadFile 包装对象，raw 才是浏览器原生 File
  const raw = file.raw || file
  saving.value = true
  uploadAvatar(raw)
    .then(() => {
      ElMessage.success('头像已更新')
      load()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '头像上传失败')
    })
    .finally(() => {
      saving.value = false
    })
}

// ===== 昵称 =====
// 进入编辑态：把当前昵称填进输入框
function startEditName() {
  nameForm.value = profile.value?.name || ''
  nameEditing.value = true
}

// 保存昵称：前端只校验非空，其余交给后端；成功后退出编辑并刷新
function saveName() {
  const name = nameForm.value.trim()
  if (!name) {
    ElMessage.warning('昵称不能为空')
    return
  }
  saving.value = true
  setName(name)
    .then(() => {
      ElMessage.success('昵称已更新')
      nameEditing.value = false
      load()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '保存失败')
    })
    .finally(() => {
      saving.value = false
    })
}

// ===== 手机号 =====
// 进入编辑态：清空上一轮输入，避免旧验证码残留
function startEditPhone() {
  phoneForm.value = ''
  phoneCode.value = ''
  phoneEditing.value = true
}

// 发送验证码：先校验 11 位手机号，再请求后端并开始 60 秒倒计时
function sendCode() {
  if (!/^1\d{10}$/.test(phoneForm.value.trim())) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  sending.value = true
  sendLoginCode({ phone: phoneForm.value.trim() })
    .then((res) => {
      // 演示阶段后端直接把验证码返回给前端，这里自动填入方便测试
      if (res?.code) {
        phoneCode.value = res.code
        ElMessage.success('验证码已发送（已自动填入）')
      } else {
        ElMessage.success('验证码已发送')
      }
      startCountdown()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '验证码发送失败')
    })
    .finally(() => {
      sending.value = false
    })
}

// 60 秒倒计时：每秒减 1，归零后按钮恢复可点；重复发送先清掉旧定时器
function startCountdown() {
  countdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

// 绑定 / 更换手机号：校验手机号和 6 位验证码后提交
function savePhone() {
  if (!/^1\d{10}$/.test(phoneForm.value.trim())) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  if (!/^\d{6}$/.test(phoneCode.value.trim())) {
    ElMessage.warning('请输入 6 位验证码')
    return
  }
  saving.value = true
  bindPhone(phoneForm.value.trim(), phoneCode.value.trim())
    .then(() => {
      ElMessage.success('手机号已绑定')
      phoneEditing.value = false
      load()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '绑定失败')
    })
    .finally(() => {
      saving.value = false
    })
}

// ===== 注销账号 =====
// 不可逆操作：二次确认后调后端把账号标记为注销，清掉本地登录态回登录页
function handleDeactivate() {
  ElMessageBox.confirm(
    '注销后账号将被标记为已注销，订单数据仍会保留但无法再登录，确定注销吗？',
    '注销账号',
    { confirmButtonText: '确定注销', cancelButtonText: '再想想', type: 'warning' }
  )
    .then(() => {
      deactivate()
        .then(() => {
          ElMessage.success('账号已注销')
          userStore.logout()
          router.replace('/login')
        })
        .catch((e) => {
          ElMessage.error(e?.message || '注销失败')
        })
    })
    .catch(() => {})
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="card page">
    <h2 class="section-title">个人资料</h2>

    <!-- ===== 头像 ===== -->
    <section class="group">
      <div class="group-head">
        <h3 class="group-title">头像</h3>
        <p class="group-desc">建议使用正方形图片，支持 jpg / png / webp。</p>
      </div>
      <div class="avatar-row">
        <el-avatar class="profile-avatar" :size="72" :src="profile?.avatar" />
        <div class="avatar-actions">
          <!-- 只用来选文件：before-upload 返回 false 阻止自动上传，选完交给 onAvatarChange 手动传 -->
          <el-upload
            :show-file-list="false"
            :http-request="() => {}"
            :before-upload="() => false"
            accept="image/*"
            :on-change="onAvatarChange"
          >
            <el-button type="primary" plain size="small" :loading="saving">更换头像</el-button>
          </el-upload>
          <p class="tip">上传后立即生效</p>
        </div>
      </div>
    </section>

    <!-- ===== 昵称：未编辑时只读展示，点「修改」切换到输入框 ===== -->
    <section class="group">
      <div class="group-head">
        <h3 class="group-title">昵称</h3>
        <p class="group-desc">昵称会展示在订单、评价等场景。</p>
      </div>
      <div class="group-body">
        <div v-if="!nameEditing" class="field-row">
          <span class="field-value">{{ profile?.name || '未设置' }}</span>
          <el-button link type="primary" @click="startEditName">修改</el-button>
        </div>
        <div v-else class="field-edit">
          <el-input v-model="nameForm" placeholder="请输入昵称" maxlength="32" />
          <div class="group-foot">
            <el-button type="primary" :loading="saving" @click="saveName">保存</el-button>
            <el-button @click="nameEditing = false">取消</el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 手机号：未编辑时展示号码；编辑态分手机号 + 验证码两行，验证码按钮带倒计时 ===== -->
    <section class="group">
      <div class="group-head">
        <h3 class="group-title">手机号</h3>
        <p class="group-desc">用于登录账号、接收订单与售后通知。</p>
      </div>
      <div class="group-body">
        <div v-if="!phoneEditing" class="field-row">
          <span class="field-value">{{ profile?.phone || '未绑定' }}</span>
          <el-button link type="primary" @click="startEditPhone">
            {{ profile?.phone ? '更换' : '绑定' }}
          </el-button>
        </div>
        <div v-else class="field-edit column">
          <el-input v-model="phoneForm" placeholder="请输入手机号" maxlength="11" />
          <div class="code-row">
            <el-input v-model="phoneCode" placeholder="6 位验证码" maxlength="6" />
            <el-button :disabled="sending || countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </el-button>
          </div>
          <div class="group-foot">
            <el-button type="primary" :loading="saving" @click="savePhone">保存</el-button>
            <el-button @click="phoneEditing = false">取消</el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 账号安全：只读信息 + 危险操作 ===== -->
    <section class="group">
      <div class="group-head">
        <h3 class="group-title">账号安全</h3>
        <p class="group-desc">用户名注册后不可修改；注销账号后数据无法恢复，请谨慎操作。</p>
      </div>
      <div class="group-body">
        <div class="field-row">
          <span class="field-label">用户名</span>
          <span class="field-value">{{ profile?.username || '—' }}</span>
          <span class="field-tip">用于登录，注册后不可修改</span>
        </div>
        <div class="field-row">
          <span class="field-label">注册时间</span>
          <span class="field-value">{{ profile?.createTime || '—' }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">注销账号</span>
          <span class="field-tip">注销后无法登录，订单数据仍会保留</span>
          <el-button class="danger-btn" type="danger" plain size="small" @click="handleDeactivate">
            注销账号
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: var(--space-lg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
}

.page .section-title {
  margin: 0 0 var(--space-md);
}

/* ===== 分组：标题 + 说明 + 内容，组间细线分隔 ===== */
.group {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-light);
}

/* 第一组紧贴页面标题，不加分隔线 */
.group:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.group-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.group-body {
  margin-top: var(--space-md);
}

/* 保存按钮固定在分组底部 */
.group-foot {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

/* ===== 头像 ===== */
.avatar-row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  margin-top: var(--space-md);
}

/* 头像占位：品牌浅橙底 + 浅橙描边 */
.profile-avatar {
  --el-avatar-bg-color: var(--color-primary-bg);
  --el-avatar-text-color: var(--color-primary);
  border: 1px solid #ffd8b3;
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.tip {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 字段行 ===== */
.field-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-md);
  min-height: 32px;
}

.field-row + .field-row {
  margin-top: var(--space-sm);
}

.field-label {
  width: 96px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.field-value {
  font-size: 14px;
  color: var(--text-primary);
}

.field-tip {
  font-size: 12px;
  color: var(--text-secondary);
}

.field-edit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.field-edit .el-input {
  width: 100%;
  max-width: 280px;
}

.field-edit.column {
  width: 100%;
  gap: var(--space-sm);
}

.code-row {
  display: flex;
  gap: var(--space-sm);
  width: 100%;
  max-width: 420px;
}

.code-row .el-input {
  max-width: 200px;
}

.danger-btn {
  margin-left: auto;
}

/* ===== 窄屏（≤768px）适配 ===== */
@media (max-width: 768px) {
  .page {
    padding: var(--space-md) var(--space-sm);
  }

  .group {
    margin-top: var(--space-md);
    padding-top: var(--space-md);
  }

  .avatar-row {
    gap: var(--space-md);
  }

  /* 字段行：标签在上、值在下 */
  .field-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .field-label {
    width: auto;
  }

  .field-edit .el-input {
    max-width: 100%;
  }

  .code-row {
    flex-wrap: wrap;
    max-width: 100%;
  }

  .code-row .el-input {
    max-width: 100%;
    flex: 1;
    min-width: 0;
  }

  .danger-btn {
    margin-left: 0;
  }
}
</style>
