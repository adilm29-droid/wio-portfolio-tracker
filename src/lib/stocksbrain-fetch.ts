const DASHBOARD_URL =
  'https://raw.githubusercontent.com/adilm29-droid/stocksbrain/main/output/dashboard.json'
const NEWS_URL =
  'https://raw.githubusercontent.com/adilm29-droid/stocksbrain/main/output/news_latest.json'

export interface SBHolding {
  ticker: string
  score: number
  decision: string
  output_line: string
  overlays_applied: string[]
  score_breakdown: string[]
  signals: Record<string, boolean>
  position_pct: number
  gain_pct: number
  holding_value: number
  current_price: number | null
}

export interface SBRecommendation {
  ticker: string
  action: string
  score: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE'
  position_size_pct: number
  reasoning: string
  halal_ok: boolean
  halal_status: string
  kelly_capped: number | null
  vol_percentile: number | null
  sharpe: number | null
  government_tailwind: boolean
}

export interface SBBacktestSummary {
  hit_rate: number | null
  hit_rate_pct: number | null
  vs_spus: number | null
  max_drawdown: number | null
  generated_at: string | null
}

export interface SBDashboard {
  generated_at: string
  portfolio_metrics: {
    total_value: number
    cash_pct: number
    tech_pct: number
    crypto_pct: number
  }
  macro: {
    vix: number
    sp500_trend: string
    sector_rotation_signal: Record<string, string>
  }
  macro_pulse?: {
    overall_geopolitical_tone: number
    yield_curve_10_2: number | null
    fred: Record<string, number>
    risk_flags: string[]
  }
  holdings: SBHolding[]
  recommendations?: SBRecommendation[]
  risk_flags: { flag: string; severity: string; detail: string }[]
  summary: { buy_count: number; hold_count: number; trim_count: number; sell_count: number }
  backtest_summary?: SBBacktestSummary
  insider_clusters?: { ticker: string; insider_count: number; total_value: number; description: string }[]
}

export type SBStatusLevel = 'green' | 'amber' | 'red' | 'unknown'

export function getSBStatus(generatedAt: string | undefined | null): {
  level: SBStatusLevel
  label: string
  ageHours: number | null
} {
  if (!generatedAt) return { level: 'unknown', label: 'Unknown', ageHours: null }
  try {
    const ts = new Date(generatedAt)
    const ageMs = Date.now() - ts.getTime()
    const ageHours = ageMs / 3_600_000
    if (ageHours < 36) return { level: 'green', label: 'Live', ageHours }
    if (ageHours < 72) return { level: 'amber', label: 'Stale', ageHours }
    return { level: 'red', label: 'Down', ageHours }
  } catch {
    return { level: 'unknown', label: 'Unknown', ageHours: null }
  }
}

export interface SBNewsItem {
  ticker: string
  headline: string
  source: string
  sentiment: 'positive' | 'negative' | 'neutral'
  timestamp: string
  url?: string
}

// Module-level cache — survives within a single page session
let _dashboardCache: { data: SBDashboard; fetchedAt: number } | null = null
let _newsCache: { data: SBNewsItem[]; fetchedAt: number } | null = null
const CACHE_TTL = 3600_000 // 1 hour

export async function fetchSBDashboard(): Promise<SBDashboard | null> {
  const now = Date.now()
  if (_dashboardCache && now - _dashboardCache.fetchedAt < CACHE_TTL) {
    return _dashboardCache.data
  }
  try {
    const bust = Math.floor(now / CACHE_TTL)
    const res = await fetch(`${DASHBOARD_URL}?_=${bust}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data: SBDashboard = await res.json()
    _dashboardCache = { data, fetchedAt: now }
    return data
  } catch {
    return null
  }
}

export async function fetchSBNews(heldTickers: string[]): Promise<SBNewsItem[]> {
  const now = Date.now()
  if (_newsCache && now - _newsCache.fetchedAt < CACHE_TTL) {
    return filterNews(_newsCache.data, heldTickers)
  }
  try {
    const bust = Math.floor(now / CACHE_TTL)
    const res = await fetch(`${NEWS_URL}?_=${bust}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data: SBNewsItem[] = await res.json()
    _newsCache = { data, fetchedAt: now }
    return filterNews(data, heldTickers)
  } catch {
    return []
  }
}

function filterNews(items: SBNewsItem[], heldTickers: string[]): SBNewsItem[] {
  const tickerSet = new Set(heldTickers.map(t => t.toUpperCase()))
  return items
    .filter(item => tickerSet.has(item.ticker.toUpperCase()))
    .slice(0, 5)
}
