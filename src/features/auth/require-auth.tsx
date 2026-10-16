import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { ApiError } from '@/api/http'
import { QueryError } from '@/components/query-error'
import { meQuery } from './queries'

export function RequireAuth() {
  const { data: user, error, isPending, refetch } = useQuery(meQuery)
  const { pathname, search } = useLocation()

  if (isPending) {
    return (
      <div role="status" className="grid min-h-svh place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  // Only a 401 means "signed out"; a 5xx or network blip shouldn't bounce the user to login.
  if (error && !(error instanceof ApiError && error.status === 401)) {
    return (
      <div className="mx-auto max-w-md p-6">
        <QueryError title="Could not load your account" error={error} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: pathname + search }} />
  return <Outlet />
}
