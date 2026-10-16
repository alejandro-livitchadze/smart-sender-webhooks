import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { meQuery, useLogout } from './queries'

export function AppLayout() {
  const { data: user } = useQuery(meQuery)
  const logout = useLogout()

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4 sm:px-6">
          <span className="font-semibold">Smart Sender</span>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {user?.name}{' '}
              <span className="hidden text-muted-foreground sm:inline">{user?.email}</span>
            </span>
            {logout.isError && (
              <span role="alert" className="text-sm text-destructive">
                Couldn&apos;t log out. Try again.
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Outlet />
      </main>
    </>
  )
}
