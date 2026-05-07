import { computeBucketAllocations } from '../src/lib/rules-engine'
import type { Holding, WealthPortfolio, BucketTarget } from '../src/lib/types'

const makeHolding = (
  ticker: string,
  bucket: string,
  shares: number,
  price: number,
  asset_class: string = 'US_STOCK'
): Holding => ({
  id: ticker,
  ticker,
  name: ticker,
  asset_class: asset_class as any,
  bucket: bucket as any,
  shares,
  avg_cost_per_share: price,
  current_price: price,
  sector: null,
  thesis: null,
  invalidation: null,
  notes: null,
  is_active: true,
  currency: 'USD',
  price_updated_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const makeWealth = (name: string, total_value: number): WealthPortfolio => ({
  id: name,
  name,
  total_value,
  total_cost: total_value,
  cash_balance: 0,
  is_shariah: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const BUCKET_TARGETS: BucketTarget[] = [
  { id: '1', bucket: 'CORE_ETF', target_min: 50, target_max: 65, display_name: 'Core ETFs', display_color: '#3b82f6', sort_order: 1 },
  { id: '2', bucket: 'QUALITY_STOCK', target_min: 15, target_max: 25, display_name: 'Quality Stocks', display_color: '#22c55e', sort_order: 2 },
  { id: '3', bucket: 'SPECULATIVE', target_min: 2, target_max: 5, display_name: 'Speculative', display_color: '#f59e0b', sort_order: 3 },
  { id: '4', bucket: 'CRYPTO', target_min: 5, target_max: 10, display_name: 'Crypto', display_color: '#8b5cf6', sort_order: 4 },
  { id: '5', bucket: 'COMMODITY', target_min: 5, target_max: 15, display_name: 'Commodities', display_color: '#6b7280', sort_order: 5 },
  { id: '6', bucket: 'CASH', target_min: 5, target_max: 10, display_name: 'Cash Buffer', display_color: '#94a3b8', sort_order: 6 },
]

describe('computeBucketAllocations', () => {
  test('WEALTH_PORTFOLIO value included in Core ETFs numerator', () => {
    // 3 stocks = $10K, 1 ETF = $5K, 1 wealth portfolio = $24K
    // Total = $39K
    // Core ETFs = ETF($5K) + Wealth($24K) = $29K → 74.36%
    const holdings = [
      makeHolding('AAPL', 'QUALITY_STOCK', 100, 100),      // $10,000
      makeHolding('SPUS', 'CORE_ETF', 100, 50, 'ETF'),     // $5,000
    ]
    const wealthPortfolios = [makeWealth('FATMAA', 24000)]  // $24,000

    const allocs = computeBucketAllocations(holdings, wealthPortfolios, BUCKET_TARGETS)
    const coreEtf = allocs.find(a => a.bucket === 'CORE_ETF')!

    // Total = 10000 + 5000 + 24000 = 39000
    // Core ETF = 5000 + 24000 = 29000 → 74.36%
    expect(coreEtf.actual_value).toBeCloseTo(29000, 0)
    expect(coreEtf.actual_percent).toBeCloseTo(74.36, 1)
  })

  test('without wealth portfolios, Core ETFs only counts direct ETF holdings', () => {
    const holdings = [
      makeHolding('AAPL', 'QUALITY_STOCK', 100, 100),
      makeHolding('SPUS', 'CORE_ETF', 100, 50, 'ETF'),
    ]
    const allocs = computeBucketAllocations(holdings, [], BUCKET_TARGETS)
    const coreEtf = allocs.find(a => a.bucket === 'CORE_ETF')!

    expect(coreEtf.actual_value).toBeCloseTo(5000, 0)
    expect(coreEtf.actual_percent).toBeCloseTo(33.33, 1)
  })

  test('multiple wealth portfolios all count toward Core ETFs', () => {
    const holdings = [makeHolding('AAPL', 'QUALITY_STOCK', 50, 100)]  // $5,000
    const wealthPortfolios = [
      makeWealth('Cybersecurity', 5470),
      makeWealth('FATMAA', 6518),
      makeWealth('Architects of AI', 6528),
      makeWealth('Dividend Stocks', 6115),
      makeWealth('Magnificent 7', 6000),
    ]
    const wealthTotal = 5470 + 6518 + 6528 + 6115 + 6000  // 30631
    const total = 5000 + wealthTotal

    const allocs = computeBucketAllocations(holdings, wealthPortfolios, BUCKET_TARGETS)
    const coreEtf = allocs.find(a => a.bucket === 'CORE_ETF')!

    expect(coreEtf.actual_value).toBeCloseTo(wealthTotal, 0)
    expect(coreEtf.actual_percent).toBeCloseTo((wealthTotal / total) * 100, 1)
  })

  test('returns empty array when totalValue is 0', () => {
    const allocs = computeBucketAllocations([], [], BUCKET_TARGETS)
    expect(allocs).toHaveLength(0)
  })

  test('non-Core-ETF buckets are not boosted by wealth portfolios', () => {
    const holdings = [
      makeHolding('BTC', 'CRYPTO', 0.01, 80000, 'CRYPTO'),   // $800
      makeHolding('SPUS', 'CORE_ETF', 100, 50, 'ETF'),        // $5000
    ]
    const wealthPortfolios = [makeWealth('FATMAA', 24000)]

    const allocs = computeBucketAllocations(holdings, wealthPortfolios, BUCKET_TARGETS)
    const crypto = allocs.find(a => a.bucket === 'CRYPTO')!

    expect(crypto.actual_value).toBeCloseTo(800, 0)
  })
})
