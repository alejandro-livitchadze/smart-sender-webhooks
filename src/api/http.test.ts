import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionExpiredHandler } from '@/api/http'
import type { ApiErrorBody } from '@/api/types'
import { fetchMe, issueSession, login } from '@/features/auth/auth-api'
import { fetchWebhooks, updateWebhook } from '@/features/webhooks/webhooks-api'
import { resetDb, SESSION_TTL_MS, TEST_USER } from '@/mocks/db'
import { handlers } from '@/mocks/handlers'

const ROTATE = 'POST /auth/token/rotate'
const apiError401 = { name: 'ApiError', status: 401 }

const server = setupServer(...handlers)
let requests: Request[] = []
let sessionExpired = vi.fn()
const endpoint = (request: Request) => `${request.method} ${new URL(request.url).pathname}`
const timesSent = (name: string) => requests.filter((request) => endpoint(request) === name).length
const parallelRequests = () => [fetchMe(), fetchWebhooks({ page: 1, search: '' })] as const

const errorResponse = (status: number, type: ApiErrorBody['error']['type']) =>
  HttpResponse.json<ApiErrorBody>({ error: { type, message: type } }, { status })

async function loginAndIssue() {
  const credentials = { email: TEST_USER.email, password: TEST_USER.password }
  await issueSession((await login(credentials)).device_session_token)
}

// Only Date is faked: MSW's delay() needs real timers. The mock never clears an expired session,
// so rotate can still extend it.
function expireSession() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.now() + SESSION_TTL_MS + 1_000)
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  requests = []
  sessionExpired = vi.fn()
  setSessionExpiredHandler(sessionExpired)
  server.events.on('request:start', ({ request }) => {
    requests.push(request)
  })
})
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  resetDb()
  vi.useRealTimers()
})
afterAll(() => server.close())

// http.ts keeps module state (cached CSRF token, rotation generation) across the cases on purpose:
// the mock CSRF token never changes, each case sends its requests at the current generation, and
// the 419 case counts refetches relative to before its call, so no case depends on the others.
describe('session rotation', () => {
  it('two parallel requests that hit 401 share one rotate and are both retried', async () => {
    await loginAndIssue()
    expireSession()

    // The rotate waits here until the server has answered both requests with 401, so the second
    // 401 can only be handled by joining the rotation already in flight. Returning nothing makes
    // MSW fall through to the real rotate handler.
    const bothGot401 = new Promise<void>((resolve) => {
      let unauthorizedCount = 0
      server.events.on('response:mocked', ({ response }) => {
        if (response.status === 401 && ++unauthorizedCount === 2) resolve()
      })
    })
    server.use(http.post('/auth/token/rotate', () => bothGot401))

    const [me, webhooks] = await Promise.all(parallelRequests())

    expect(me.email).toBe(TEST_USER.email)
    expect(webhooks.data).toHaveLength(10)
    expect(timesSent(ROTATE)).toBe(1)
    expect(timesSent('GET /v1/me')).toBe(2)
    expect(timesSent('GET /v1/webhooks')).toBe(2)
    expect(sessionExpired).not.toHaveBeenCalled()
    // Every request, the CSRF fetch and the rotate included.
    const requestedWith = requests.map((request) => request.headers.get('X-Requested-With'))
    expect(new Set(requestedWith)).toEqual(new Set(['XMLHttpRequest']))
  })

  it('a 401 that arrives after the rotation finished reuses it instead of rotating again', async () => {
    await loginAndIssue()
    expireSession()

    // /v1/me gets the real 401 and starts the rotation. The webhooks 401 is held back until that
    // rotate has been answered, plus one mock delay for the client to finish processing it.
    const rotated = new Promise<void>((resolve) => {
      server.events.on('response:mocked', ({ request }) => {
        if (endpoint(request) === ROTATE) resolve()
      })
    })
    server.use(
      http.get(
        '/v1/webhooks',
        async () => {
          await rotated
          await delay()
          return errorResponse(401, 'AuthenticationException')
        },
        { once: true },
      ),
    )

    const [me, webhooks] = await Promise.all(parallelRequests())

    expect(me.email).toBe(TEST_USER.email)
    expect(webhooks.data).toHaveLength(10)
    expect(timesSent(ROTATE)).toBe(1)
    expect(timesSent('GET /v1/webhooks')).toBe(2)
    expect(sessionExpired).not.toHaveBeenCalled()
  })

  it('a failed rotate ends the session once and the requests fail with 401', async () => {
    const results = await Promise.allSettled(parallelRequests())

    const rejected = { status: 'rejected', reason: apiError401 }
    expect(results).toMatchObject([rejected, rejected])
    expect(timesSent(ROTATE)).toBe(1)
    expect(sessionExpired).toHaveBeenCalledTimes(1)
  })

  it('a retry that still gets 401 ends the session once', async () => {
    await loginAndIssue()
    server.use(http.get('/v1/me', () => errorResponse(401, 'AuthenticationException')))

    await expect(fetchMe()).rejects.toMatchObject(apiError401)

    expect(timesSent(ROTATE)).toBe(1)
    expect(timesSent('GET /v1/me')).toBe(2)
    expect(sessionExpired).toHaveBeenCalledTimes(1)
  })
})

describe('CSRF', () => {
  it('a 419 refetches the CSRF token once and retries', async () => {
    await loginAndIssue()
    server.use(
      http.put('/v1/webhooks/:id', () => errorResponse(419, 'TokenMismatchException'), {
        once: true,
      }),
    )
    const csrfFetchesBefore = timesSent('GET /csrf')

    const webhook = await updateWebhook(1, { name: 'Renamed', url: 'https://example.com/hook' })

    expect(webhook.name).toBe('Renamed')
    expect(timesSent('PUT /v1/webhooks/1')).toBe(2)
    expect(timesSent('GET /csrf')).toBe(csrfFetchesBefore + 1)
  })
})
