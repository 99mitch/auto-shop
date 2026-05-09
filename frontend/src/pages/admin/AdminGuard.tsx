import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import LoadingSkeleton from '../../components/LoadingSkeleton'

export default function AdminGuard() {
  const navigate = useNavigate()
  const { isLoading: authLoading } = useAuthStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/api/admin/me').then((r) => r.data),
    retry: 1,
    enabled: !authLoading, // wait for token to be set
  })

  useEffect(() => {
    if (!authLoading && !isLoading && (isError || data?.isAdmin === false)) {
      navigate('/', { replace: true })
    }
  }, [authLoading, isLoading, isError, data, navigate])

  if (authLoading || isLoading) {
    return (
      <div className="p-4">
        <LoadingSkeleton className="h-8 w-48 mb-4" />
        <LoadingSkeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (!data?.isAdmin) return null

  return <Outlet />
}
