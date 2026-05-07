import { create } from 'zustand'
import axios from 'axios'

interface AdminUser {
  id: number
  telegramId: string
  firstName: string
  username?: string
  role: string
  isSuperAdmin: boolean
}

interface AuthState {
  token: string | null
  user: AdminUser | null
  isSuperAdmin: boolean
  login: (telegramData: Record<string, string>) => Promise<void>
  loginWithInitData: (initData: string) => Promise<void>
  logout: () => void
  restore: () => void
}

const BASE = import.meta.env.VITE_API_URL || ''

export const useAdminAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  isSuperAdmin: false,
  restore: () => {
    const token = localStorage.getItem('admin_token')
    const raw = localStorage.getItem('admin_user')
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AdminUser
        set({ token, user, isSuperAdmin: user.isSuperAdmin })
      } catch { /* ignore */ }
    }
  },
  login: async (telegramData) => {
    const res = await axios.post(`${BASE}/api/web-admin/auth/telegram`, telegramData)
    const { token, user } = res.data
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ token, user, isSuperAdmin: user.isSuperAdmin })
  },
  loginWithInitData: async (initData) => {
    const res = await axios.post(`${BASE}/api/web-admin/auth/miniapp`, { initData })
    const { token, user } = res.data
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ token, user, isSuperAdmin: user.isSuperAdmin })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ token: null, user: null, isSuperAdmin: false })
  },
}))
