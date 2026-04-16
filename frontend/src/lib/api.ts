import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import WebApp from '@twa-dev/sdk'

const BASE_URL = import.meta.env.VITE_API_URL || ''

let token: string | null = null
let isRefreshing = false

export function setToken(t: string | null) {
  token = t
}

export function getToken() {
  return token
}

export const api: AxiosInstance = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !isRefreshing) {
      original._retry = true
      isRefreshing = true
      try {
        const res = await axios.post(`${BASE_URL}/api/auth/init`, null, {
          headers: { 'X-Telegram-Init-Data': WebApp.initData },
        })
        token = res.data.token
        original.headers.Authorization = `Bearer ${token}`
      } catch {
        token = null
      } finally {
        isRefreshing = false
      }
      return api(original)
    }
    throw error
  }
)
