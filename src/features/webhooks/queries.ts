import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WebhookInput } from '@/api/types'
import { fetchWebhook, fetchWebhooks, updateWebhook } from './webhooks-api'

type ListParams = Parameters<typeof fetchWebhooks>[0]

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: ListParams) => [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
}

// keepPreviousData: paging or searching keeps the old rows on screen until the new ones arrive.
export const webhooksQuery = (params: ListParams) =>
  queryOptions({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => fetchWebhooks(params, signal),
    placeholderData: keepPreviousData,
  })

export const webhookQuery = (id: number) =>
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
      return queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
