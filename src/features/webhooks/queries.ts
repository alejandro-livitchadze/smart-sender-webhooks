import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WebhookInput, WebhookList } from '@/api/types'
import { fetchWebhook, fetchWebhooks, updateWebhook, type WebhookListParams } from './webhooks-api'

const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: WebhookListParams) => [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
}

// keepPreviousData: paging or searching keeps the old rows on screen until the new ones arrive.
export const webhookListQuery = (params: WebhookListParams) =>
  queryOptions({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => fetchWebhooks(params, signal),
    placeholderData: keepPreviousData,
  })

export const webhookDetailQuery = (id: number) =>
  queryOptions({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => fetchWebhook(id, signal),
  })

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WebhookInput) => updateWebhook(id, input),
    onSuccess: (webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook)
      // The lists aren't mounted on the edit page, so invalidating alone would show the old row
      // until the refetch lands. Patch the cached rows now; the refetch still settles order/search.
      queryClient.setQueriesData<WebhookList>(
        { queryKey: webhookKeys.lists() },
        (list) =>
          list && { ...list, data: list.data.map((row) => (row.id === id ? webhook : row)) },
      )
      return queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
