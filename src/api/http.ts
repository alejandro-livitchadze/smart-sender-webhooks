import type { ApiErrorBody, ApiErrorType } from '@/api/types'
import { getFingerprint } from '@/lib/fingerprint'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

type Sent = { res: Response; gen: number }

export class ApiError extends Error {
  readonly status: number
  readonly type: ApiErrorType | undefined
  readonly fieldErrors: Record<string, string[]>

  constructor(
    status: number,
    message: string,
    type?: ApiErrorType,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.fieldErrors = fieldErrors
  }
}

let csrfToken: Promise<string> | null = null
let rotation: Promise<boolean> | null = null
// Bumped after EVERY rotation attempt. A 401 for a request sent before the bump was already
// answered by that rotation, so it reuses the result instead of rotating a second time.
let generation = 0
let lastRotationOk = true
let endSession: () => void = () => {}

export function setSessionExpiredHandler(fn: () => void): void {
  endSession = fn
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await sendWithRetries(path, opts)
  const text = await res.text()
  if (!res.ok) throw toApiError(res.status, text)
  return (text === '' ? undefined : JSON.parse(text)) as T
}

function toApiError(status: number, text: string): ApiError {
  let error: Partial<ApiErrorBody['error']> | undefined
  try {
    error = (JSON.parse(text) as Partial<ApiErrorBody> | null)?.error
  } catch {
    // Not JSON (a proxy error page, for example): use the generic message below.
  }
  const message = error?.message ?? `Request failed (${status})`
  return new ApiError(status, message, error?.type, error?.payload)
}

async function sendWithRetries(path: string, opts: RequestOptions): Promise<Response> {
  const first = await sendWithCsrf(path, opts)
  if (first.res.status !== 401) return first.res

  const rotated = first.gen === generation ? await rotateSession() : lastRotationOk
  if (!rotated) return first.res // the failed rotation already ended the session

  const retry = await sendWithCsrf(path, opts)
  if (retry.res.status === 401) endSession()
  return retry.res
}

// Single-flight: concurrent 401s await the same promise, so only one rotate request goes out.
// It goes through the CSRF path but never the 401 path (no rotate-on-rotate), and it ignores the
// caller's AbortSignal so one cancelled request cannot fail the others.
function rotateSession(): Promise<boolean> {
  rotation ??= sendWithCsrf('/auth/token/rotate', {
    method: 'POST',
    body: { fingerprint: getFingerprint() },
  })
    .then(
      ({ res }) => res.ok,
      () => false,
    )
    .then((ok) => {
      generation++
      lastRotationOk = ok
      if (!ok) endSession()
      return ok
    })
    .finally(() => {
      rotation = null
    })
  return rotation
}

async function sendWithCsrf(path: string, opts: RequestOptions): Promise<Sent> {
  const token = getCsrfToken()
  const sent = await send(path, opts, await token)
  if (sent.res.status !== 419) return sent

  // Parallel 419s share one refetch: only drop the token if nobody has replaced it already.
  if (csrfToken === token) csrfToken = null
  return send(path, opts, await getCsrfToken())
}

function getCsrfToken(): Promise<string> {
  csrfToken ??= fetchCsrfToken().catch((error: unknown) => {
    csrfToken = null // a network blip must not poison every later request
    throw error
  })
  return csrfToken
}

async function fetchCsrfToken(): Promise<string> {
  const { res } = await send('/csrf', {})
  const token = res.headers.get('X-CSRF-TOKEN')
  if (!token) throw new Error('Could not get a CSRF token')
  return token
}

async function send(path: string, opts: RequestOptions, csrf?: string): Promise<Sent> {
  const { method = 'GET', body, headers, signal } = opts
  const requestHeaders = new Headers(headers)
  requestHeaders.set('X-Requested-With', 'XMLHttpRequest')
  requestHeaders.set('Accept', 'application/json')
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json')
  if (csrf && (method === 'POST' || method === 'PUT')) requestHeaders.set('X-CSRF-TOKEN', csrf)

  const gen = generation
  // Absolute URL: also valid for fetch under Node (tests), where a relative path throws.
  const res = await fetch(new URL(path, window.location.origin), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  return { res, gen }
}
