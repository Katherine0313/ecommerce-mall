<template>
  <el-dialog v-model="visible" title="选择所在地区" width="620px">
    <div class="place-select">
      <el-select
        v-model="province"
        placeholder="省"
        :loading="loading"
        @change="onProvinceChange"
      >
        <el-option v-for="item in provinces" :key="item.code" :label="item.name" :value="item.name" />
      </el-select>
      <el-select v-model="city" placeholder="市" :loading="loading" @change="onCityChange">
        <el-option v-for="item in cityOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="district" placeholder="区">
        <el-option v-for="item in districtOptions" :key="item" :label="item" :value="item" />
      </el-select>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['confirm'])
const visible = ref(false)

// 父组件通过 ref 调用
function open() {
  visible.value = true
  loadProvinces()
}
defineExpose({ open })

// 省份列表：public/region/provinces.json，首次打开时加载
const provinces = ref([])
const loading = ref(false)

function loadProvinces() {
  if (provinces.value.length) return
  fetch('/region/provinces.json')
    .then((res) => res.json())
    .then((data) => {
      provinces.value = data
    })
    .catch(() => {
      // 数据缺失时保持空列表，不阻断页面
    })
}

const province = ref('')
const city = ref('')
const district = ref('')

const cityData = ref({}) // 当前省的完整数据 { 市名: [区名] }
const cityOptions = ref([])
const districtOptions = ref([])

// 选省 → 拉取该省数据
function onProvinceChange(val) {
  city.value = ''
  district.value = ''
  cityOptions.value = []
  districtOptions.value = []
  if (!val) return

  loading.value = true
  fetch(`/region/${encodeURIComponent(val)}.json`)
    .then((res) => res.json())
    .then((data) => {
      cityData.value = data
      cityOptions.value = Object.keys(data)
    })
    .finally(() => {
      loading.value = false
    })
}

// 选市 → 筛出区列表
function onCityChange(val) {
  district.value = ''
  districtOptions.value = val ? cityData.value[val] || [] : []
}

function onConfirm() {
  const result = [province.value, city.value, district.value].filter(Boolean).join(' ')
  emit('confirm', result)
  visible.value = false
}
</script>

<style scoped>
.place-select {
  display: flex;
  gap: 10px;
  padding: 6px 0 12px;
}

.place-select .el-select {
  flex: 1;
}

/* 手机：三个下拉纵向排列 */
@media (max-width: 767px) {
  .place-select {
    flex-direction: column;
  }
}
</style>
