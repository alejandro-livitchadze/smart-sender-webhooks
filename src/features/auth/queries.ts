import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { fetchMe, issueSession, login, revokeSession } from './auth-api'

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: ({ signal }) => fetchMe(signal),
  staleTime: Infinity, // the session, not a timer, decides when the user is gone
})

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (credentials: Parameters<typeof login>[0]) => {
      // The one-time token only ever lives in this local variable.
      const { device_session_token } = await login(credentials)
      await issueSession(device_session_token)
      return queryClient.fetchQuery(meQuery)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: revokeSession,
    // onSettled, so a failed revoke still logs out locally. Navigate first, synchronously
    // (flushSync): a still-mounted observer would re-create and refetch what clear() empties.
    onSettled: async () => {
      await navigate('/login', { replace: true, flushSync: true })
      queryClient.clear()
    },
  })
}
