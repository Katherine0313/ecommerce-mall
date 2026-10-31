<template>
  <el-drawer v-model="visible" title="收货地址" size="480px" direction="rtl">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      class="address-form"
    >
      <el-form-item label="收件人" prop="consignee">
        <el-input v-model="form.consignee" placeholder="请输入收件人姓名" />
      </el-form-item>

      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
      </el-form-item>

      <el-form-item label="所在地区" prop="region">
        <el-input
          v-model="form.region"
          class="place-input"
          placeholder="省、市、区、乡镇/街道"
          readonly
          @click="handlePlace"
        >
          <template #append>
            <el-icon><Location /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="详细地址" prop="detailAddress">
        <el-input
          v-model="form.detailAddress"
          type="textarea"
          :rows="2"
          placeholder="请输入详细地址信息，如道路、门牌号、小区、楼栋号、单元等"
        />
      </el-form-item>
    </el-form>

    <!-- 设为默认地址 -->
    <div class="default-row">
      <span>设为默认地址</span>
      <el-switch v-model="isDefault" />
    </div>

    <div class="footer-actions">
      <el-button v-if="editingId" text type="danger" @click="handleDelete">删除地址</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存地址' }}
      </el-button>
    </div>

    <!-- 省市区选择 -->
    <Place ref="placeRef" @confirm="onRegionConfirm" />
  </el-drawer>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location } from '@element-plus/icons-vue'
import Place from './Place.vue'
import { addAddress, updateAddress, deleteAddress } from '@/api/address.js'

const visible = ref(false)
const editingId = ref(null)
const saving = ref(false)
const isDefault = ref(false)

const form = reactive({
  consignee: '',
  phone: '',
  region: '',
  detailAddress: '',
})

const formRef = ref(null)
const placeRef = ref(null)
const emit = defineEmits(['saved'])

// 父组件通过 ref 调用，传地址对象表示编辑，不传为新增
function open(data = null) {
  editingId.value = data?.id || null
  form.consignee = data?.consignee || ''
  form.phone = data?.phone || ''
  form.region = data?.region || ''
  form.detailAddress = data?.detailAddress || ''
  isDefault.value = Number(data?.isDefault) === 1
  visible.value = true
  // 清掉上一次的校验提示
  formRef.value?.clearValidate()
}
defineExpose({ open })

function handlePlace() {
  placeRef.value?.open()
}

function onRegionConfirm(region) {
  form.region = region
}

// 校验规则
const rules = {
  consignee: [{ required: true, message: '收件人姓名不能为空', trigger: 'blur' }],
  phone: [
    { required: true, message: '联系电话不能为空', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  region: [{ required: true, message: '所在地区不能为空', trigger: 'change' }],
  detailAddress: [{ required: true, message: '详细地址不能为空', trigger: 'blur' }],
}

async function handleSave() {
  if (saving.value) return
  try {
    await formRef.value.validate()
  } catch {
    return // 校验失败，表单已提示
  }

  saving.value = true
  const data = {
    consignee: form.consignee,
    phone: form.phone,
    region: form.region,
    detailAddress: form.detailAddress,
    isDefault: isDefault.value ? 1 : 0,
  }
  try {
    if (editingId.value) await updateAddress(editingId.value, data)
    else await addAddress(data)
    ElMessage.success('地址保存成功')
    emit('saved')
    visible.value = false
  } catch (e) {
    ElMessage.error(e?.message || '地址保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定要删除该地址吗？', '确认删除', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }

  try {
    await deleteAddress(editingId.value)
    ElMessage.success('地址已删除')
    editingId.value = null
    visible.value = false
    emit('saved')
  } catch {
    ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.address-form {
  margin-top: 8px;
}

.place-input {
  cursor: pointer;
}

.default-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 90px;
  font-size: 14px;
  color: var(--text-regular);
}

.footer-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.footer-actions .el-button {
  min-width: 120px;
}
</style>
