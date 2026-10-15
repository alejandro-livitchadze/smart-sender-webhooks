import { delay, http, HttpResponse } from 'msw'
import type { ApiErrorBody, User, Webhook, WebhookList } from '@/api/types'
import { CSRF_TOKEN, db, SESSION_TTL_MS, TEST_USER } from './db'

type FieldErrors = Record<string, string[]>

const ERRORS = {
  400: { type: 'BadRequestException', message: 'Bad request.' },
  401: { type: 'AuthenticationException', message: 'Unauthenticated.' },
  404: { type: 'NotFoundException', message: 'Not found.' },
  419: { type: 'TokenMismatchException', message: 'CSRF token mismatch.' },
  422: { type: 'ValidationException', message: 'The given data was invalid.' },
} satisfies Record<number, Omit<ApiErrorBody['error'], 'payload'>>

function apiError(status: keyof typeof ERRORS, payload?: FieldErrors) {
  return HttpResponse.json<ApiErrorBody>({ error: { ...ERRORS[status], payload } }, { status })
}

const csrfGuard = (request: Request) =>
  request.headers.get('X-CSRF-TOKEN') === CSRF_TOKEN ? undefined : apiError(419)

// An expired session is not cleared: rotate must still be able to extend it.
const sessionGuard = () =>
  db.session && Date.now() <= db.session.expiresAt ? undefined : apiError(401)

// Request bodies are untrusted input: read as unknown values and validate each field.
async function readBody(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const positiveInt = (value: string | null, fallback: number) => {
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 ? number : fallback
}

function isHttpUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const findWebhook = (id: string) => db.webhooks.find((webhook) => webhook.id === Number(id))

export const handlers = [
  http.get('/csrf', async () => {
    await delay()
    return new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': CSRF_TOKEN } })
  }),

  http.post<never, never, { device_session_token: string } | ApiErrorBody>(
    '/auth/login',
    async ({ request }) => {
      await delay()
      const denied = csrfGuard(request)
      if (denied) return denied
      const body = await readBody(request)
      const email = text(body.email).trim().toLowerCase()
      const password = text(body.password)
      const fingerprint = text(body.fingerprint)
      const errors: FieldErrors = {}
      if (!request.headers.get('X-Captcha-Token')?.trim()) {
        errors.captcha = ['The captcha token is required.']
      }
      if (!email) errors.email = ['The email field is required.']
      if (!password) errors.password = ['The password field is required.']
      if (!/^[0-9a-f]{32}$/.test(fingerprint)) {
        errors.fingerprint = ['The fingerprint must be 32 lowercase hex characters.']
      }
      if (Object.keys(errors).length > 0) return apiError(422, errors)
      if (email !== TEST_USER.email || password !== TEST_USER.password) {
        return apiError(422, { password: ['These credentials do not match our records.'] })
      }
      const deviceSessionToken = crypto.randomUUID()
      db.deviceTokens.set(deviceSessionToken, fingerprint)
      return HttpResponse.json({ device_session_token: deviceSessionToken })
    },
  ),

  http.post<never, never, ApiErrorBody | null>('/auth/token/issue', async ({ request }) => {
    await delay()
    const denied = csrfGuard(request)
    if (denied) return denied
    const body = await readBody(request)
    const token = text(body.device_session_token)
    const fingerprint = text(body.fingerprint)
    if (db.deviceTokens.get(token) !== fingerprint) {
      return apiError(422, { device_session_token: ['The device session token is invalid.'] })
    }
    db.deviceTokens.delete(token)
    db.session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS }
    return new HttpResponse(null)
  }),

  http.post<never, never, ApiErrorBody | null>('/auth/token/rotate', async ({ request }) => {
    await delay()
    const denied = csrfGuard(request)
    if (denied) return denied
    const body = await readBody(request)
    const { session } = db
    if (!session || session.fingerprint !== text(body.fingerprint)) return apiError(400)
    session.expiresAt = Date.now() + SESSION_TTL_MS
    return new HttpResponse(null)
  }),

  http.post<never, never, ApiErrorBody | null>('/auth/token/revoke', async ({ request }) => {
    await delay()
    const denied = csrfGuard(request)
    if (denied) return denied
    db.session = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get<never, never, User | ApiErrorBody>('/v1/me', async () => {
    await delay()
    const denied = sessionGuard()
    if (denied) return denied
    const { id, email, first_name, last_name } = TEST_USER
    return HttpResponse.json({
      id,
      email,
      first_name,
      last_name,
      name: `${first_name} ${last_name}`,
    })
  }),

  http.get<never, never, WebhookList | ApiErrorBody>('/v1/webhooks', async ({ request }) => {
    await delay()
    const denied = sessionGuard()
    if (denied) return denied
    const query = new URL(request.url).searchParams
    const page = positiveInt(query.get('page'), 1)
    const limit = positiveInt(query.get('limit'), 10)
    const search = (query.get('search') ?? '').trim().toLowerCase()
    const matches = db.webhooks.filter((webhook) => webhook.name.toLowerCase().includes(search))
    const start = (page - 1) * limit
    return HttpResponse.json({
      data: matches.slice(start, start + limit),
      paging: {
        pages: { current: page, last: Math.max(1, Math.ceil(matches.length / limit)) },
        results: { total: matches.length, limitation: limit },
      },
    })
  }),

  http.get<{ id: string }, never, Webhook | ApiErrorBody>(
    '/v1/webhooks/:id',
    async ({ params }) => {
      await delay()
      const denied = sessionGuard()
      if (denied) return denied
      const webhook = findWebhook(params.id)
      return webhook ? HttpResponse.json(webhook) : apiError(404)
    },
  ),

  http.put<{ id: string }, never, Webhook | ApiErrorBody>(
    '/v1/webhooks/:id',
    async ({ request, params }) => {
      await delay()
      const denied = csrfGuard(request) ?? sessionGuard()
      if (denied) return denied
      const webhook = findWebhook(params.id)
      if (!webhook) return apiError(404)
      const body = await readBody(request)
      const name = text(body.name).trim()
      const url = text(body.url).trim()
      const errors: FieldErrors = {}
      if (!name) errors.name = ['The name field is required.']
      if (!url) errors.url = ['The url field is required.']
      else if (!isHttpUrl(url)) errors.url = ['The url must be a valid URL.']
      if (Object.keys(errors).length > 0) return apiError(422, errors)
      Object.assign(webhook, { name, url })
      return HttpResponse.json(webhook)
    },
  ),
]
