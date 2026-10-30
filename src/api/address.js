import request from '@/utils/request'

// 收货地址（需登录）
export const getAddressList = () => request.get('/address')

export const addAddress = (data) => request.post('/address', data)

export const updateAddress = (id, data) => request.put(`/address/${id}`, data)

export const deleteAddress = (id) => request.delete(`/address/${id}`)
