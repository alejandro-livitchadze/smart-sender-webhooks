import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { fetchMe, issueSession, login, revokeSession, type Credentials } from './auth-api'

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: ({ signal }) => fetchMe(signal),
  staleTime: Infinity, // the session, not a timer, decides when the user is gone
})

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    gcTime: 0, // don't keep the { email, password } variables in the MutationCache after login
    mutationFn: async (credentials: Credentials) => {
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
    // Only on success: the session cookie is HttpOnly, so after a failed revoke the user is still
    // logged in server-side. Navigate first, synchronously (flushSync): a still-mounted observer
    // would re-create and refetch what clear() empties.
    onSuccess: async () => {
      await navigate('/login', { replace: true, flushSync: true })
      queryClient.clear()
    },
  })
}
