import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { setSessionExpiredHandler } from '@/api/http'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { worker } from '@/mocks/browser'
import './index.css'

// There is no real backend, so the mock API is always on (dev, preview and build).
await worker.start({ onUnhandledFrame: 'bypass' })

// Idempotent: http.ts may call this once per still-401 retry.
setSessionExpiredHandler(async () => {
  const { pathname, search } = router.state.location
  if (pathname === '/login') return
  // flushSync unmounts the page's query observers first, so none refetches what clear() empties.
  await router.navigate('/login', {
    replace: true,
    state: { from: pathname + search },
    flushSync: true,
  })
  queryClient.clear()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
