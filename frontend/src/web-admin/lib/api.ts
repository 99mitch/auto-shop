import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

export const adminApi = axios.create({ baseURL: BASE })

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
