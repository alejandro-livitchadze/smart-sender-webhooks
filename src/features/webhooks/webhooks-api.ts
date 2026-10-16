import { request } from '@/api/http'
import type { Webhook, WebhookInput, WebhookList } from '@/api/types'

const PAGE_SIZE = 10

export type WebhookListParams = { page: number; search: string }

export function fetchWebhooks(
  { page, search }: WebhookListParams,
  signal?: AbortSignal,
): Promise<WebhookList> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    search: search.trim(),
  })
  return request(`/v1/webhooks?${params}`, { signal })
}

export function fetchWebhook(id: number, signal?: AbortSignal): Promise<Webhook> {
  return request(`/v1/webhooks/${id}`, { signal })
}

export function updateWebhook(id: number, input: WebhookInput): Promise<Webhook> {
  return request(`/v1/webhooks/${id}`, { method: 'PUT', body: input })
}
