import { useQuery } from '@tanstack/react-query'
import type { WebhookList } from '@/api/types'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { webhooksQuery } from './queries'
import { useWebhookListParams } from './use-list-params'
import { WebhookSearch } from './webhook-search'
import { WebhooksTable } from './webhooks-table'

export function WebhooksPage() {
  const { page, search, setPage, setSearch } = useWebhookListParams()
  const { data, error, isPlaceholderData, refetch } = useQuery(webhooksQuery({ page, search }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Webhooks</h1>
      <WebhookSearch value={search} onSearch={setSearch} />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load webhooks</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <WebhooksTable
          list={data}
          page={page}
          search={search}
          busy={isPlaceholderData}
          setPage={setPage}
          setSearch={setSearch}
        />
      )}

      {data && !error && <Pagination list={data} setPage={setPage} />}
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
