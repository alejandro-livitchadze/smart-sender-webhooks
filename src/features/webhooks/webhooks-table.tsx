import { Link, useLocation } from 'react-router'
import type { Webhook, WebhookList } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const COLUMNS = 4
const SKELETON_ROWS = 5

type WebhooksTableProps = {
  /** `undefined` while the first page is loading. */
  list: WebhookList | undefined
  page: number
  search: string
  /** The rows on screen belong to the previous page or search. */
  busy: boolean
  setPage: (page: number) => void
  setSearch: (search: string) => void
}

export function WebhooksTable(props: WebhooksTableProps) {
  return (
    <Table aria-busy={props.busy} className={cn('transition-opacity', props.busy && 'opacity-50')}>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Rows {...props} />
      </TableBody>
    </Table>
  )
}

function Rows({ list, page, search, busy, setPage, setSearch }: WebhooksTableProps) {
  // Stale empty rows would flash a wrong empty message, so they count as loading too.
  if (!list || (busy && list.data.length === 0)) return <SkeletonRows />
  if (list.data.length > 0) {
    return list.data.map((webhook) => <WebhookRow key={webhook.id} webhook={webhook} />)
  }

  return (
    <TableRow>
      <TableCell colSpan={COLUMNS} className="py-10 text-center text-muted-foreground">
        <EmptyMessage
          page={page}
          last={list.paging.pages.last}
          search={search}
          setPage={setPage}
          setSearch={setSearch}
        />
      </TableCell>
    </TableRow>
  )
}

function WebhookRow({ webhook }: { webhook: Webhook }) {
  const location = useLocation()
  const from = location.pathname + location.search

  return (
    <TableRow>
      <TableCell className="font-medium">{webhook.name}</TableCell>
      <TableCell>
        <div className="max-w-64 truncate" title={webhook.url}>
          {webhook.url}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={webhook.active ? 'default' : 'secondary'}>
          {webhook.active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button asChild variant="outline" size="sm">
          <Link to={`/webhooks/${webhook.id}`} state={{ from }} aria-label={`Edit ${webhook.name}`}>
            Edit
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function SkeletonRows() {
  return Array.from({ length: SKELETON_ROWS }, (_, row) => (
    <TableRow key={row}>
      {Array.from({ length: COLUMNS }, (_, cell) => (
        <TableCell key={cell}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

type EmptyMessageProps = Pick<WebhooksTableProps, 'page' | 'search' | 'setPage' | 'setSearch'> & {
  last: number
}

function EmptyMessage({ page, last, search, setPage, setSearch }: EmptyMessageProps) {
  if (page > last) {
    return (
      <div className="grid justify-items-center gap-3">
        <p>Page {page} doesn&apos;t exist.</p>
        <Button variant="outline" size="sm" onClick={() => setPage(last)}>
          Go to page {last}
        </Button>
      </div>
    )
  }
  if (search) {
    return (
      <div className="grid justify-items-center gap-3">
        <p>No webhooks match &quot;{search}&quot;.</p>
        <Button variant="outline" size="sm" onClick={() => setSearch('')}>
          Clear search
        </Button>
      </div>
    )
  }
  return <p>No webhooks yet.</p>
}
