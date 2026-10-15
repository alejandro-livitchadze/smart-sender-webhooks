import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import type { Webhook } from '@/api/types'
import { TextField } from '@/components/text-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { setServerErrors } from '@/lib/form-errors'
import { useUpdateWebhook } from './queries'

// Required fields only: the server owns the URL format and its 422 lands under the field.
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: z.string().trim().min(1, 'URL is required'),
})

export function WebhookForm({ webhook, backTo }: { webhook: Webhook; backTo: string }) {
  const navigate = useNavigate()
  const { mutateAsync } = useUpdateWebhook(webhook.id)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: webhook.name, url: webhook.url },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values)
      navigate(backTo)
    } catch (error) {
      setServerErrors(error, setError, ['name', 'url'])
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit webhook</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}
          <TextField label="Name" error={errors.name?.message} {...register('name')} />
          <TextField label="URL" type="url" error={errors.url?.message} {...register('url')} />
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline">
              <Link to={backTo}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
