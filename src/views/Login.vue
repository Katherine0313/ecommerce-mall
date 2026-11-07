<script setup>
import { reactive, ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Iphone, Lock, Message, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user.js'
import { loginByPassword, loginByCode, registerAccount, sendLoginCode } from '@/api/auth.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
// 站点 Logo：后端 /image 静态目录托管
const logoUrl = '/image/zongjie.webp'

// 登录页是独立路由页：不在 DefaultLayout 里（没有头尾），单独铺满
// view=login 登录视图 / register 注册视图；登录内部再分两个 tab
const view = ref('login')
// 登录 tab：password=账号密码，code=手机号验证码
const loginMode = ref('password')

const passwordFormRef = ref(null)
const codeFormRef = ref(null)
const registerFormRef = ref(null)

const passwordForm = reactive({ username: '', password: '' })
const codeForm = reactive({ phone: '', code: '' })
const registerForm = reactive({ username: '', phone: '', password: '', confirmPassword: '' })

const loggingIn = ref(false)
const registering = ref(false)
const sending = ref(false)
const countdown = ref(0)
// 后端模拟返回的验证码，仅用于演示展示
const mockCode = ref('')
let countdownTimer = null

// ==================== 表单校验规则 ====================
// 注册：两次密码必须一致
const validateConfirm = (rule, value, callback) => {
  if (!value) callback(new Error('请再次输入密码'))
  else if (value !== registerForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

// 账号密码登录：只填用户名（手机号登录是另一个 tab，两种凭据不混用）
const passwordRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{6,16}$/, message: '用户名为 6-16 位字母、数字或下划线', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
  ],
}

// 手机号验证码登录
const codeRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '请输入 6 位验证码', trigger: 'blur' },
  ],
}

// 注册
const registerRules = {
  username: [
    { required: true, message: '请设置用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,30}$/, message: '用户名为 3-30 位字母、数字或下划线', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
  ],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }],
}

// ==================== 登录成功后跳转 ====================
// 跳回来源页（?redirect=），没有就回首页
function redirectAfterLogin() {
  const redirect = route.query.redirect
  router.replace(typeof redirect === 'string' && redirect ? redirect : '/')
}

function onLoginSuccess(data) {
  if (!data?.token) {
    ElMessage.error('登录失败：未返回令牌')
    return
  }
  userStore.setToken(data.token)
  ElMessage.success('登录成功')
  redirectAfterLogin()
}

// ==================== 提交 ====================

function sendCode() {
  if (!/^1\d{10}$/.test(codeForm.phone.trim())) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  sending.value = true
  sendLoginCode({ phone: codeForm.phone.trim() })
    .then((res) => {
      mockCode.value = res?.code || ''
      // 演示阶段后端直接返回验证码，自动填入省去手输
      if (mockCode.value) codeForm.code = mockCode.value
      ElMessage.success('验证码已发送')
      startCountdown()
    })
    .catch((e) => {
      ElMessage.error(e?.message || '验证码发送失败')
    })
    .finally(() => {
      sending.value = false
    })
}

function submitPassword() {
  // 校验不通过就不发请求（valid 为 false）
  passwordFormRef.value?.validate((valid) => {
    if (!valid) return
    loggingIn.value = true
    loginByPassword({
      username: passwordForm.username.trim(),
      password: passwordForm.password,
    })
      .then((data) => {
        onLoginSuccess(data)
      })
      .catch((e) => {
        ElMessage.error(e?.message || '登录失败')
      })
      .finally(() => {
        loggingIn.value = false
      })
  })
}

function submitCode() {
  codeFormRef.value?.validate((valid) => {
    if (!valid) return
    loggingIn.value = true
    loginByCode({
      phone: codeForm.phone.trim(),
      code: codeForm.code.trim(),
    })
      .then((data) => {
        onLoginSuccess(data)
      })
      .catch((e) => {
        ElMessage.error(e?.message || '登录失败')
      })
      .finally(() => {
        loggingIn.value = false
      })
  })
}

function submitRegister() {
  registerFormRef.value?.validate((valid) => {
    if (!valid) return
    registering.value = true
    registerAccount({
      username: registerForm.username.trim(),
      phone: registerForm.phone.trim(),
      password: registerForm.password,
    })
      .then(() => {
        // 只注册不自动登录：回到登录面板，用户名带过去省得重输
        ElMessage.success('注册成功，请登录')
        passwordForm.username = registerForm.username.trim()
        registerForm.password = ''
        registerForm.confirmPassword = ''
        view.value = 'login'
        loginMode.value = 'password'
      })
      .catch((e) => {
        ElMessage.error(e?.message || '注册失败')
      })
      .finally(() => {
        registering.value = false
      })
  })
}

function startCountdown() {
  countdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(countdownTimer))
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <router-link to="/" class="brand-title">
          <span class="brand-avatar">
            <!-- 兔耳朵挂件：金色描边 + 粉色内耳，参考首页导航 logo -->
            <span class="bunny-ear ear-left" aria-hidden="true"></span>
            <span class="bunny-ear ear-right" aria-hidden="true"></span>
            <img :src="logoUrl" class="brand-logo" alt="杰米商城" />
          </span>
          <span>杰米商城</span>
        </router-link>
        <p class="brand-sub">
          {{ view === 'login' ? '欢迎回来，登录后继续购物' : '创建账号，开启购物之旅' }}
        </p>
      </div>

      <!-- ===== 登录：两个 tab ===== -->
      <template v-if="view === 'login'">
        <el-tabs v-model="loginMode" stretch class="login-tabs">
          <el-tab-pane label="账号密码登录" name="password">
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              :validate-on-rule-change="false"
              @submit.prevent="submitPassword"
            >
              <el-form-item prop="username" name="username">
                <el-input v-model="passwordForm.username" placeholder="请输入用户名" maxlength="30" autocomplete="off">
                  <template #prefix><el-icon><User /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-form-item prop="password" name="password">
                <el-input
                  v-model="passwordForm.password"
                  type="password"
                  show-password
                  placeholder="请输入密码"
                  maxlength="20"
                  autocomplete="new-password"
                  @keyup.enter="submitPassword"
                >
                  <template #prefix><el-icon><Lock /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-button class="submit-btn" type="primary" :loading="loggingIn" @click="submitPassword">
                登 录
              </el-button>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="手机号登录" name="code">
            <el-form
              ref="codeFormRef"
              :model="codeForm"
              :rules="codeRules"
              :validate-on-rule-change="false"
              @submit.prevent="submitCode"
            >
              <el-form-item prop="phone" name="phone">
                <el-input v-model="codeForm.phone" placeholder="请输入手机号" maxlength="11" autocomplete="off">
                  <template #prefix><el-icon><Iphone /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-form-item prop="code" name="code">
                <div class="code-row">
                  <el-input
                    v-model="codeForm.code"
                    placeholder="请输入验证码"
                    maxlength="6"
                    @keyup.enter="submitCode"
                  >
                    <template #prefix><el-icon><Message /></el-icon></template>
                  </el-input>
                  <el-button class="code-btn" :disabled="sending || countdown > 0" @click="sendCode">
                    {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
                  </el-button>
                </div>
              </el-form-item>
              <p v-if="mockCode" class="mock-tip">
                演示验证码：<strong>{{ mockCode }}</strong>（已自动填入）
              </p>
              <el-button class="submit-btn" type="primary" :loading="loggingIn" @click="submitCode">
                登 录
              </el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <div class="auth-footer">
          还没有账号？
          <button type="button" class="text-link" @click="view = 'register'">免费注册</button>
        </div>
      </template>

      <!-- ===== 注册 ===== -->
      <template v-else>
        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          :validate-on-rule-change="false"
          class="register-form"
          @submit.prevent="submitRegister"
        >
          <el-form-item prop="username" name="username">
            <el-input v-model="registerForm.username" placeholder="设置用户名（3-30 位字母数字下划线）" maxlength="30" autocomplete="off">
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="phone" name="phone">
            <el-input v-model="registerForm.phone" placeholder="请输入手机号" maxlength="11" autocomplete="off">
              <template #prefix><el-icon><Iphone /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password" name="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              show-password
              placeholder="设置密码（6-20 位）"
              maxlength="20"
              autocomplete="new-password"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="confirmPassword" name="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              show-password
              placeholder="再次输入密码"
              maxlength="20"
              autocomplete="new-password"
              @keyup.enter="submitRegister"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-button
            class="submit-btn"
            type="primary"
            :loading="registering"
            @click="submitRegister"
          >
            注册
          </el-button>
        </el-form>

        <div class="auth-footer">
          已有账号？
          <button type="button" class="text-link" @click="view = 'login'">返回登录</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ===== 页面容器：整页铺满，卡片居中 ===== */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: var(--bg-page);
  /* 卡片底色提成变量：Chrome 自动填充的兜底要用它盖黄底 */
  --login-card-bg: #fff;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 32px;
  background: var(--login-card-bg);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

/* ===== 头部品牌 ===== */
.login-brand {
  text-align: center;
  padding: 6px 0 4px;
}

.brand-title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--color-primary);
  text-decoration: none;
  cursor: pointer;
}

/* 品牌头像容器：让兔耳朵相对定位 */
.brand-avatar {
  position: relative;
  flex-shrink: 0;
}

.brand-logo {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  border-radius: 50px;
  object-fit: cover;
  flex-shrink: 0;
}

/* 兔耳朵挂件：金色描边 + 粉色内耳，参考首页导航 logo */
.bunny-ear {
  position: absolute;
  top: -8px;
  z-index: 0;
  width: 13px;
  height: 24px;
  background: #fff;
  border: 1.5px solid #f0b429;
  border-radius: 50%;
  pointer-events: none;
}

.bunny-ear::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #ffb7c5;
}

.ear-left {
  left: 6px;
  transform: rotate(-18deg);
}

.ear-right {
  right: 6px;
  transform: rotate(18deg);
}

.brand-sub {
  margin-top: 7px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 登录 tab ===== */
.login-tabs {
  margin-top: 16px;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.login-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--border-light);
}

.login-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
}

.login-tabs :deep(.el-tabs__item.is-active) {
  font-weight: 600;
  color: var(--color-primary);
}

.login-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 3px;
  background: var(--color-primary);
}

/* ===== 表单 ===== */
.register-form {
  margin-top: 22px;
}

.login-card :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-card :deep(.el-input__wrapper) {
  padding: 4px 12px;
  border-radius: 10px;
  background: transparent !important;
  --el-fill-color-blank: transparent;
  box-shadow: 0 0 0 1px var(--border-color) inset;
  transition: box-shadow 0.2s;
}

/* 悬停时线条不变：一直保持常态那一条，别跟着鼠标加深 */
.login-card :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--border-color) inset;
  background: transparent !important;
}

.login-card :deep(.el-input__wrapper.is-focus) {
  background: transparent !important;
  box-shadow: 0 0 0 1px var(--color-primary) inset;
}

.login-card :deep(.el-input__inner) {
  height: 38px;
}

/* 窄屏：触控目标不小于 44px（全局规则只管 wrapper，这里 inner 也要跟着长） */
@media (max-width: 768px) {
  .login-card :deep(.el-input__inner) {
    height: auto;
    min-height: 44px;
    line-height: 1.4;
    padding-top: 10px;
    padding-bottom: 10px;
  }
}

.login-card :deep(.el-input__prefix) {
  color: var(--text-placeholder);
}

/* Chrome 自动填充：会给输入框加淡黄底、把字变成灰黄。
   autocomplete="off" 挡不住全部场景，这里用伪元素把底色和字色压回正常。
   注意：Chrome 的自动填充样式加在真正的 <input> 上（.el-input__inner），
   不是外层 .el-input__wrapper，所以必须单独针对 inner 写。 */
.login-card :deep(input.el-input__inner:-webkit-autofill),
.login-card :deep(input.el-input__inner:-webkit-autofill:hover),
.login-card :deep(input.el-input__inner:-webkit-autofill:focus) {
  -webkit-text-fill-color: var(--text-primary);
  caret-color: var(--text-primary);
  /* 用卡片底色盖住 Chrome 的黄底 */
  -webkit-box-shadow: 0 0 0 1000px var(--login-card-bg) inset;
}

/* 验证码一行：输入框 + 获取按钮 */
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row .el-input {
  flex: 1;
}

/* 获取验证码按钮：跟无框输入框统一风格，只留橙色文字 */
.code-btn {
  width: 112px;
  height: 48px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
}

.code-btn:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.code-btn.is-disabled {
  background: transparent;
  color: var(--text-placeholder);
}

.mock-tip {
  margin: -8px 0 14px;
  font-size: 12px;
  color: var(--text-secondary);
}

.mock-tip strong {
  color: var(--color-primary);
  letter-spacing: 1px;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  border: none;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #ff4e2a, #ff7a00);
  box-shadow: 0 6px 16px rgba(255, 78, 42, 0.24);
}

.submit-btn:hover {
  opacity: 0.92;
}

/* 底部注册/返回链接 */
.auth-footer {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.text-link {
  border: none;
  background: none;
  padding: 0;
  margin-left: 2px;
  font-size: 12px;
  color: var(--color-primary);
  cursor: pointer;
}

.text-link:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px 20px;
  }
}
</style>
