import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { meQuery } from './queries'

export function RequireAuth() {
  const { data: user, isPending } = useQuery(meQuery)
  const { pathname, search } = useLocation()

  if (isPending) {
    return (
      <div role="status" className="grid min-h-svh place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: pathname + search }} />
  return <Outlet />
}
