import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { z } from 'zod'

// Garbage in the URL (?page=abc, ?page=0) falls back to the defaults instead of failing.
const paramsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().catch(''),
})

// The URL is the only place page and search live. Defaults (page 1, empty search) are not written.
export function useWebhookListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, search } = paramsSchema.parse(Object.fromEntries(searchParams))

  const setPage = useCallback(
    (next: number) =>
      setSearchParams((params) => {
        if (next > 1) params.set('page', String(next))
        else params.delete('page')
        return params
      }),
    [setSearchParams],
  )

  // A new search always starts from the first page.
  const setSearch = useCallback(
    (next: string) =>
      setSearchParams((params) => {
        params.delete('page')
        if (next) params.set('search', next)
        else params.delete('search')
        return params
      }),
    [setSearchParams],
  )

  return { page, search, setPage, setSearch }
}
