import { http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, setSessionExpiredHandler } from '@/api/http'
import { fetchMe, issueSession, login } from '@/features/auth/auth-api'
import { fetchWebhooks } from '@/features/webhooks/webhooks-api'
import { resetDb, SESSION_TTL_MS, TEST_USER } from '@/mocks/db'
import { handlers } from '@/mocks/handlers'

const ROTATE = 'POST /auth/token/rotate'

const server = setupServer(...handlers)
let sent: string[] = []
const timesSent = (endpoint: string) => sent.filter((entry) => entry === endpoint).length
const parallelRequests = () => [fetchMe(), fetchWebhooks({ page: 1, search: '' })] as const

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  sent = []
  server.events.on('request:start', ({ request }) => {
    sent.push(`${request.method} ${new URL(request.url).pathname}`)
  })
})
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  resetDb()
  vi.useRealTimers()
})
afterAll(() => server.close())

// http.ts keeps module state (cached CSRF token, rotation generation) across both cases on
// purpose: the mock CSRF token never changes, and requests sent at the current generation
// always trigger a fresh rotate, so neither case depends on what ran before it.
describe('session rotation', () => {
  it('two parallel requests that hit 401 share one rotate and are both retried', async () => {
    const sessionExpired = vi.fn()
    setSessionExpiredHandler(sessionExpired)
    const { device_session_token } = await login({
      email: TEST_USER.email,
      password: TEST_USER.password,
    })
    await issueSession(device_session_token)

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + SESSION_TTL_MS + 1_000)

    // The rotate waits here until the server has answered both requests with 401, so the second
    // 401 can only be handled by joining the rotation already in flight. Returning nothing makes
    // MSW fall through to the real rotate handler.
    const bothGot401 = new Promise<void>((resolve) => {
      let unauthorized = 0
      server.events.on('response:mocked', ({ response }) => {
        if (response.status === 401 && ++unauthorized === 2) resolve()
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
  })

  it('a failed rotate ends the session once and the requests fail with 401', async () => {
    const sessionExpired = vi.fn()
    setSessionExpiredHandler(sessionExpired)

    const results = await Promise.allSettled(parallelRequests())

    const errors = results.map((result) => (result.status === 'rejected' ? result.reason : null))
    expect(errors).toHaveLength(2)
    for (const error of errors) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toHaveProperty('status', 401)
    }
    expect(timesSent(ROTATE)).toBe(1)
    expect(sessionExpired).toHaveBeenCalledTimes(1)
  })
})
