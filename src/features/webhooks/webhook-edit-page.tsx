import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '@/api/http'
import { QueryError } from '@/components/query-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getFrom } from '@/lib/location-state'
import { webhookDetailQuery } from './queries'
import { WebhookForm } from './webhook-form'

export function WebhookEditPage() {
  const id = Number(useParams().id) // a non-numeric id is just a 404 from the API
  const backTo = getFrom(useLocation().state) ?? '/webhooks'

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button asChild variant="link" className="px-0">
        <Link to={backTo}>← Back to webhooks</Link>
      </Button>
      <EditBody id={id} backTo={backTo} />
    </div>
  )
}

function EditBody({ id, backTo }: { id: number; backTo: string }) {
  const { data, error, refetch } = useQuery(webhookDetailQuery(id))

  // Data wins over a failed background refetch, so an open form is never thrown away.
  if (data) return <WebhookForm webhook={data} backTo={backTo} />

  if (error instanceof ApiError && error.status === 404) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Webhook not found</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          It may have been removed. Use the link above to return to the list.
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <QueryError title="Could not load the webhook" error={error} onRetry={() => refetch()} />
  }

  return (
    <Card aria-busy="true">
      <CardContent className="grid gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  )
}
