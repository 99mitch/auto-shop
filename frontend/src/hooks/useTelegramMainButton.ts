import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

export function useTelegramMainButton(label: string, onClick: () => void, enabled = true) {
  useEffect(() => {
    WebApp.MainButton.setText(label)
    WebApp.MainButton.onClick(onClick)

    if (enabled) {
      WebApp.MainButton.show()
      WebApp.MainButton.enable()
    } else {
      WebApp.MainButton.show()
      WebApp.MainButton.disable()
    }

    return () => {
      WebApp.MainButton.hide()
      WebApp.MainButton.offClick(onClick)
    }
  }, [label, onClick, enabled])
}
