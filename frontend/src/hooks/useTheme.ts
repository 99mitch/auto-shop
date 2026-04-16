import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

export function useTheme() {
  useEffect(() => {
    const params = WebApp.themeParams
    const root = document.documentElement
    Object.entries(params).forEach(([key, value]) => {
      root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value as string)
    })
  }, [])
}
