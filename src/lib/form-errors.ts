import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/api/http'

// 422 messages for known fields show next to the field; everything else goes to `root.server`.
export function setServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (!(error instanceof ApiError)) {
    setError('root.server', { message: 'Something went wrong. Please try again.' })
    return
  }

  const rootMessages: string[] = []
  let fieldShown = false
  if (error.status === 422) {
    for (const [key, messages] of Object.entries(error.fieldErrors)) {
      const message = messages[0]
      if (!message) continue
      const field = fields.find((name) => name === key) // whitelist doubles as the type narrowing
      if (field) {
        setError(field, { type: 'server', message })
        fieldShown = true
      } else {
        rootMessages.push(message)
      }
    }
  }
  if (rootMessages.length > 0 || !fieldShown) {
    setError('root.server', { message: rootMessages.join(' ') || error.message })
  }
}
