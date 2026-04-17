export type AssetClass = 'US_STOCK' | 'ETF' | 'CRYPTO' | 'COMMODITY'
export type BucketType = 'CORE_ETF' | 'QUALITY_STOCK' | 'SPECULATIVE' | 'COMMODITY' | 'CRYPTO' | 'CASH'
export type ActionSignal = 'HOLD' | 'TRIM' | 'SELL' | 'ADD' | 'WATCH'
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface Holding {
  id: string
  ticker: string
  name: string
  asset_class: AssetClass
  bucket: BucketType
  shares: number
  avg_cost_per_share: number
  current_price: number
  sector: string | null
  thesis: string | null
  invalidation: string | null
  notes: string | null
  is_active: boolean
  currency: string
  price_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface HoldingWithMetrics extends Holding {
  market_value: number
  cost_basis: number
  pl_dollars: number
  pl_percent: number
  weight_percent: number
  action_signal: ActionSignal
  days_held: number
}

export interface WealthPortfolio {
  id: string
  name: string
  total_value: number
  total_cost: number
  cash_balance: number
  is_shariah: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  holdings?: WealthPortfolioHolding[]
}

export interface WealthPortfolioHolding {
  id: string
  portfolio_id: string
  ticker: string
  name: string
  shares: number
  value: number
  weight_percent: number
  sector: string | null
  created_at: string
  updated_at: string
}

export interface TradeJournal {
  id: string
  trade_date: string
  ticker: string
  name: string | null
  action: 'BUY' | 'SELL' | 'ADD' | 'TRIM' | 'EXIT'
  shares: number
  price: number
  thesis: string | null
  invalidation: string | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | null
  notes: string | null
  lesson: string | null
  created_at: string
}

export interface PortfolioSnapshot {
  id: string
  snapshot_date: string
  total_value: number
  direct_holdings_value: number | null
  wealth_portfolios_value: number | null
  crypto_value: number | null
  commodities_value: number | null
  cash_value: number | null
  total_pl_dollars: number | null
  total_pl_percent: number | null
  created_at: string
}

export interface BucketTarget {
  id: string
  bucket: BucketType
  target_min: number
  target_max: number
  display_name: string
  display_color: string
  sort_order: number
}

export interface EarningsCalendar {
  id: string
  ticker: string
  earnings_date: string
  timing: string | null
}

export interface AppSettings {
  id: string
  key: string
  value: string
  description: string | null
  updated_at: string
}

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  action: string
  relatedTickers: string[]
}

export interface BucketAllocation {
  bucket: BucketType
  display_name: string
  actual_value: number
  actual_percent: number
  target_min: number
  target_max: number
  color: string
  drift: number
  status: 'ok' | 'warn' | 'critical'
}

export interface PortfolioSummary {
  total_value: number
  direct_value: number
  wealth_value: number
  total_cost: number
  total_pl_dollars: number
  total_pl_percent: number
  cash_value: number
  buckets: BucketAllocation[]
}
