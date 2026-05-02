import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function CollabGuard() {
  const navigate = useNavigate()
  const { isCollab, isAdmin, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isCollab && !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isLoading, isCollab, isAdmin, navigate])

  if (isLoading) return null
  if (!isCollab && !isAdmin) return null

  return <Outlet />
}
