import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

export function useTelegramBackButton(onBack: () => void) {
  useEffect(() => {
    WebApp.BackButton.show()
    WebApp.BackButton.onClick(onBack)
    return () => {
      WebApp.BackButton.hide()
      WebApp.BackButton.offClick(onBack)
    }
  }, [onBack])
}
