import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '@/api/http'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getFrom } from '@/lib/location-state'
import { webhookQuery } from './queries'
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
  const { data, error, refetch } = useQuery(webhookQuery(id))

  // Data wins over a failed background refetch, so an open form is never thrown away.
  if (data) return <WebhookForm webhook={data} backTo={backTo} />

  if (error instanceof ApiError && error.status === 404) {
    return (
      <Card>
        <CardHeader>
          <h1 className="font-medium">Webhook not found</h1>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          It may have been removed. Use the link above to return to the list.
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the webhook</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
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
