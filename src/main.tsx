import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { worker } from '@/mocks/browser'
import './index.css'

// There is no real backend, so the mock API is always on (dev, preview and build).
await worker.start({ onUnhandledFrame: 'bypass' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
