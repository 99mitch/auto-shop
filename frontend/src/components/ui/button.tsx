import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'icon'
}

export function Button({ variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variant === 'default' && 'bg-[var(--tg-theme-button-color,#0f172a)] text-[var(--tg-theme-button-text-color,#fff)] rounded-xl',
        variant === 'outline' && 'border border-[#e2e8f0] bg-transparent text-[#475569] rounded-xl',
        variant === 'ghost' && 'bg-transparent text-[#475569] rounded-xl',
        size === 'md' && 'h-10 px-4 text-sm gap-2',
        size === 'sm' && 'h-8 px-3 text-xs gap-1.5',
        size === 'icon' && 'h-9 w-9 p-0',
        className
      )}
      {...props}
    />
  )
}
