import { create } from 'zustand'
import WebApp from '@twa-dev/sdk'
import axios from 'axios'
import { api, setToken } from '../lib/api'
import type { User } from 'floramini-types'

interface AuthState {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,
  init: async () => {
    set({ isLoading: true })
    try {
      const baseURL = import.meta.env.VITE_API_URL || ''
      const res = await axios.post(`${baseURL}/api/auth/init`, null, {
        headers: { 'X-Telegram-Init-Data': WebApp.initData || 'dev-mode' },
      })
      setToken(res.data.token)
      set({ user: res.data.user, isAdmin: res.data.isAdmin, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },
}))
