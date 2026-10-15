export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  name: string
}

export type Webhook = {
  id: number
  name: string
  url: string
  active: boolean
  created_at: string
}

export type WebhookList = {
  data: Webhook[]
  paging: {
    pages: { current: number; last: number }
    results: { total: number; limitation: number }
  }
}

export type WebhookInput = Pick<Webhook, 'name' | 'url'>

export type ApiErrorType =
  | 'BadRequestException'
  | 'AuthenticationException'
  | 'NotFoundException'
  | 'TokenMismatchException'
  | 'ValidationException'

export type ApiErrorBody = {
  error: {
    type: ApiErrorType
    message: string
    payload?: Record<string, string[]>
  }
}
