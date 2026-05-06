import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

export default function Guard({ children }: { children: React.ReactNode }) {
  const token = useAdminAuth((s) => s.token)
  const navigate = useNavigate()
  useEffect(() => { if (!token) navigate('/login', { replace: true }) }, [token])
  if (!token) return null
  return <>{children}</>
}
