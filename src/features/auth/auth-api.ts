import { request } from '@/api/http'
import type { User } from '@/api/types'
import { getFingerprint } from '@/lib/fingerprint'

// shortcut: fixed captcha token (the mock takes any non-empty one), wire a real widget before prod.
const CAPTCHA_TOKEN = 'dev-captcha-token'

export type Credentials = { email: string; password: string }

export function login(credentials: Credentials): Promise<{ device_session_token: string }> {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'X-Captcha-Token': CAPTCHA_TOKEN },
    body: { ...credentials, fingerprint: getFingerprint() },
  })
}

export function issueSession(deviceSessionToken: string): Promise<void> {
  return request('/auth/token/issue', {
    method: 'POST',
    body: { device_session_token: deviceSessionToken, fingerprint: getFingerprint() },
  })
}

export function revokeSession(): Promise<void> {
  return request('/auth/token/revoke', {
    method: 'POST',
    body: { fingerprint: getFingerprint() },
  })
}

export function fetchMe(signal?: AbortSignal): Promise<User> {
  return request('/v1/me', { signal })
}
