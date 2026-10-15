import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/features/auth/app-layout'
import { LoginPage } from '@/features/auth/login-page'
import { RequireAuth } from '@/features/auth/require-auth'
import { WebhookEditPage } from '@/features/webhooks/webhook-edit-page'
import { WebhooksPage } from '@/features/webhooks/webhooks-page'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/webhooks', element: <WebhooksPage /> },
          { path: '/webhooks/:id', element: <WebhookEditPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/webhooks" replace /> },
])
