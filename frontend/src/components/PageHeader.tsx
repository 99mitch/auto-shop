import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import { cn } from '../lib/utils'

interface PageHeaderProps {
  title: string
  onBack?: () => void
  right?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, onBack, right, className }: PageHeaderProps) {
  const navigate = useNavigate()
  const handleBack = useCallback(() => {
    if (onBack) onBack()
    else navigate(-1)
  }, [onBack, navigate])

  useTelegramBackButton(handleBack)

  return (
    <div
      className={cn(
        'sticky top-0 z-40 flex items-center gap-3 px-3 py-3 border-b',
        className
      )}
      style={{
        backgroundColor: 'var(--tg-theme-bg-color, #fff)',
        borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
      }}
    >
      <button
        onClick={handleBack}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors active:scale-95"
        style={{
          borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
          backgroundColor: 'var(--tg-theme-bg-color, #fff)',
          color: 'var(--tg-theme-text-color, #0f172a)',
        }}
        aria-label="Retour"
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
      </button>
      <h1
        className="flex-1 text-sm font-semibold truncate"
        style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
      >
        {title}
      </h1>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
