import type { Webhook } from '@/api/types'

export const TEST_USER = {
  id: 1,
  email: 'demo@example.com',
  password: 'secret123',
  first_name: 'Demo',
  last_name: 'User',
}

export const CSRF_TOKEN = 'csrf-token-demo'
export const SESSION_TTL_MS = 30_000

const BASE_DATE = Date.UTC(2025, 0, 6)
const DAY_MS = 86_400_000

const EVENT_NAMES = [
  'Order created',
  'Order updated',
  'Order cancelled',
  'Order refunded',
  'Payment succeeded',
  'Payment failed',
  'Contact subscribed',
  'Contact unsubscribed',
  'Contact updated',
  'Cart abandoned',
  'Checkout completed',
  'Invoice issued',
  'Invoice paid',
  'Subscription started',
  'Subscription renewed',
  'Subscription cancelled',
  'Customer created',
  'Customer deleted',
  'Message received',
  'Message delivered',
  'Message failed',
  'Chat assigned',
  'Chat closed',
  'Tag added',
  'Tag removed',
  'Broadcast sent',
  'Flow completed',
]

type Db = {
  webhooks: Webhook[]
  deviceTokens: Map<string, string>
  session: { fingerprint: string; expiresAt: number } | null
}

const initialDb = (): Db => ({
  webhooks: EVENT_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    url: `https://hooks.example.com/${name.toLowerCase().replaceAll(' ', '-')}`,
    active: (index + 1) % 4 !== 0,
    created_at: new Date(BASE_DATE + index * DAY_MS).toISOString(),
  })),
  deviceTokens: new Map(),
  session: null,
})

export const db = initialDb()

export function resetDb() {
  Object.assign(db, initialDb())
}
