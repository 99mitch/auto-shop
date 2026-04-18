import { cn } from '../../lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary'
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-[#f1f5f9] text-[#475569]',
        variant === 'success' && 'bg-[#f0fdf4] text-[#15803d]',
        variant === 'warning' && 'bg-[#fff7ed] text-[#c2410c]',
        variant === 'danger' && 'bg-[#fef2f2] text-[#b91c1c]',
        variant === 'secondary' && 'bg-[#f1f5f9] text-[#64748b]',
        className
      )}
      {...props}
    />
  )
}
