<template>
  <el-dialog
    :model-value="authStore.visible"
    width="420px"
    class="login-dialog"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
    @closed="resetAll"
  >
    <div class="login-brand">
      <div class="brand-title">杰米商城</div>
      <div class="brand-sub">登录后即可加入购物车、提交订单</div>
    </div>

    <el-tabs v-model="authStore.mode" stretch class="login-tabs">
      <!-- ===== 登录 ===== -->
      <el-tab-pane label="登录" name="login">
        <div class="method-switch">
          <button
            type="button"
            :class="{ active: loginMode === 'password' }"
            @click="switchLoginMode('password')"
          >
            密码登录
          </button>
          <button
            type="button"
            :class="{ active: loginMode === 'code' }"
            @click="switchLoginMode('code')"
          >
            验证码登录
          </button>
        </div>

        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-position="top"
          @submit.prevent="submitLogin"
        >
          <el-form-item prop="phone">
            <el-input v-model="loginForm.phone" placeholder="手机号" maxlength="11" />
          </el-form-item>

          <el-form-item v-if="loginMode === 'password'" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              show-password
              placeholder="密码"
              maxlength="20"
              @keyup.enter="submitLogin"
            />
          </el-form-item>

          <template v-else>
            <el-form-item prop="code">
              <el-input
                v-model="loginForm.code"
                placeholder="6 位验证码"
                maxlength="6"
                @keyup.enter="submitLogin"
              >
                <template #append>
                  <el-button :disabled="sending || countdown > 0" @click="sendCode">
                    {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-alert
              v-if="mockCode"
              :title="`演示验证码：${mockCode}（已自动填入）`"
              type="info"
              :closable="false"
              show-icon
              class="mock-code-tip"
            />
          </template>

          <el-button class="submit-btn" type="primary" :loading="loggingIn" @click="submitLogin">
            登 录
          </el-button>
        </el-form>
      </el-tab-pane>

      <!-- ===== 注册 ===== -->
      <el-tab-pane label="注册" name="register">
        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="top"
          @submit.prevent="submitRegister"
        >
          <el-form-item prop="phone">
            <el-input v-model="registerForm.phone" placeholder="手机号" maxlength="11" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              show-password
              placeholder="设置密码（6-20 位）"
              maxlength="20"
            />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              show-password
              placeholder="再次输入密码"
              maxlength="20"
              @keyup.enter="submitRegister"
            />
          </el-form-item>

          <el-button
            class="submit-btn"
            type="primary"
            :loading="registering"
            @click="submitRegister"
          >
            注册并登录
          </el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <p class="login-tip">未注册的手机号使用验证码登录时将自动创建账号</p>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.js'
import { useUserStore } from '@/stores/user.js'
import { loginByPassword, loginByCode, registerAccount, sendLoginCode } from '@/api/auth.js'

const authStore = useAuthStore()
const userStore = useUserStore()

// 登录方式：password=账号密码，code=手机号验证码
const loginMode = ref('password')
const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = reactive({ phone: '', password: '', code: '' })
const registerForm = reactive({ phone: '', password: '', confirmPassword: '' })

const loggingIn = ref(false)
const registering = ref(false)
const sending = ref(false)
const countdown = ref(0)
// 后端模拟返回的验证码，仅用于演示展示
const mockCode = ref('')
let countdownTimer = null

const phoneRules = [
  { required: true, message: '请输入手机号', trigger: 'blur' },
  { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' },
]

// 隐藏的登录方式不校验对应字段
const loginRules = computed(() => ({
  phone: phoneRules,
  password:
    loginMode.value === 'password'
      ? [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
        ]
      : [],
  code:
    loginMode.value === 'code'
      ? [
          { required: true, message: '请输入验证码', trigger: 'blur' },
          { pattern: /^\d{6}$/, message: '请输入 6 位验证码', trigger: 'blur' },
        ]
      : [],
}))

const validateConfirm = (rule, value, callback) => {
  if (!value) callback(new Error('请再次输入密码'))
  else if (value !== registerForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

const registerRules = {
  phone: phoneRules,
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
  ],
  confirmPassword: [{ validator: validateConfirm, trigger: 'blur' }],
}

// 用户点遮罩/关闭按钮时，通知等待方「未登录」
function onVisibleChange(value) {
  if (!value) authStore.finish(false)
}

function switchLoginMode(mode) {
  loginMode.value = mode
  loginFormRef.value?.clearValidate()
}

function startCountdown() {
  countdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

async function sendCode() {
  if (!/^1\d{10}$/.test(loginForm.phone.trim())) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  sending.value = true
  try {
    const res = await sendLoginCode({ phone: loginForm.phone.trim() })
    mockCode.value = res?.code || ''
    // 演示阶段后端直接返回验证码，自动填入省去手输
    if (mockCode.value) loginForm.code = mockCode.value
    ElMessage.success('验证码已发送')
    startCountdown()
  } catch (e) {
    ElMessage.error(e?.message || '验证码发送失败')
  } finally {
    sending.value = false
  }
}

async function submitLogin() {
  try {
    await loginFormRef.value?.validate()
  } catch {
    return
  }
  loggingIn.value = true
  try {
    const data =
      loginMode.value === 'password'
        ? await loginByPassword({
            phone: loginForm.phone.trim(),
            password: loginForm.password,
          })
        : await loginByCode({
            phone: loginForm.phone.trim(),
            code: loginForm.code.trim(),
          })
    onLoginSuccess(data)
  } catch (e) {
    ElMessage.error(e?.message || '登录失败')
  } finally {
    loggingIn.value = false
  }
}

async function submitRegister() {
  try {
    await registerFormRef.value?.validate()
  } catch {
    return
  }
  registering.value = true
  try {
    const data = await registerAccount({
      phone: registerForm.phone.trim(),
      password: registerForm.password,
    })
    onLoginSuccess(data)
  } catch (e) {
    ElMessage.error(e?.message || '注册失败')
  } finally {
    registering.value = false
  }
}

function onLoginSuccess(data) {
  if (!data?.token) {
    ElMessage.error('登录失败：未返回令牌')
    return
  }
  userStore.setToken(data.token)
  ElMessage.success('登录成功')
  // 通知调用方继续原来的操作（加购/结算等）
  authStore.finish(true)
}

// 弹窗完全关闭后重置，避免下次打开残留密码和错误提示
function resetAll() {
  loginForm.phone = ''
  loginForm.password = ''
  loginForm.code = ''
  registerForm.phone = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
  loginMode.value = 'password'
  mockCode.value = ''
  countdown.value = 0
  clearInterval(countdownTimer)
  loginFormRef.value?.clearValidate()
  registerFormRef.value?.clearValidate()
}

onUnmounted(() => clearInterval(countdownTimer))
</script>

<style scoped>
.login-brand {
  text-align: center;
  padding: 4px 0 12px;
}

.brand-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--mall-primary);
}

.brand-sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.method-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.method-switch button {
  flex: 1;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-switch button.active {
  border-color: var(--mall-primary);
  color: var(--mall-primary);
  background: var(--color-primary-bg);
  font-weight: 600;
}

.mock-code-tip {
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  height: 42px;
  margin-top: 4px;
  font-size: 16px;
  border-radius: 8px;
  background: var(--mall-primary);
  border-color: var(--mall-primary);
}

.login-tip {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder);
}

.login-dialog :deep(.el-form-item) {
  margin-bottom: 16px;
}
</style>
