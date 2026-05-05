export type ApiKeyStatus = 'active' | 'revoked' | 'suspended'

export type ApiKey = {
  id: string
  marketplace_name: string
  key: string
  status: ApiKeyStatus
  monthly_limit: number
  calls_this_month: number
  created_at: string
}

export type UsageLog = {
  id: string
  api_key_id: string
  endpoint: string
  status_code: number
  timestamp: string
}

export type MarketplaceContext = {
  api_key_id: string
  marketplace_name: string
  monthly_limit: number
  calls_this_month: number
}
