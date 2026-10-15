import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/http'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // HTTP errors are final: the transport already handles 401, and 404/422 do not heal on retry.
      retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2,
    },
  },
})
