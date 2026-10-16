import { useQuery } from '@tanstack/react-query'
import type { WebhookList } from '@/api/types'
import { QueryError } from '@/components/query-error'
import { Button } from '@/components/ui/button'
import { webhookListQuery } from './queries'
import { useWebhookListParams } from './use-webhook-list-params'
import { WebhookSearch } from './webhook-search'
import { WebhooksTable } from './webhooks-table'

export function WebhooksPage() {
  const { page, search, setPage, setSearch } = useWebhookListParams()
  const { data, error, isPlaceholderData, refetch } = useQuery(webhookListQuery({ page, search }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Webhooks</h1>
      <WebhookSearch value={search} onSearch={setSearch} />

      {/* Data wins over a failed background refetch, as on the edit page. */}
      {error && !data ? (
        <QueryError title="Could not load webhooks" error={error} onRetry={() => refetch()} />
      ) : (
        <WebhooksTable list={data} busy={isPlaceholderData} />
      )}

      {/* The empty states have their own buttons; a footer there would read "Page 2 of 1". */}
      {data && data.data.length > 0 && <Pagination list={data} setPage={setPage} />}
    </div>
  )
}

// Numbers come from the loaded payload, so the footer always matches the rows beside it, even
// while the next page is loading.
function Pagination({ list, setPage }: { list: WebhookList; setPage: (page: number) => void }) {
  const { current, last } = list.paging.pages
  const { total } = list.paging.results

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Page {current} of {last} · {total} {total === 1 ? 'webhook' : 'webhooks'}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={current <= 1}
          // From a page past the end, step back to the last real page.
          onClick={() => setPage(Math.min(current - 1, last))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={current >= last}
          onClick={() => setPage(current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
