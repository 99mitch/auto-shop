import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import LoadingSkeleton from '../../components/LoadingSkeleton'

export default function AdminGuard() {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => api.get('/api/admin/me').then((r) => r.data),
    retry: false,
  })

  useEffect(() => {
    if (!isLoading && (isError || !data?.isAdmin)) {
      navigate('/', { replace: true })
    }
  }, [isLoading, isError, data, navigate])

  if (isLoading) {
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
