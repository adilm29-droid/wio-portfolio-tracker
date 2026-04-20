import type { Alert, Holding, WealthPortfolio, BucketTarget, HoldingWithMetrics, BucketAllocation } from './types'
import { computeHoldingMetrics } from './utils'

export function evaluateRules(
  holdings: Holding[],
  wealthPortfolios: WealthPortfolio[],
  bucketTargets: BucketTarget[],
  singleStockCap = 7
): Alert[] {
  const alerts: Alert[] = []
  const activeHoldings = holdings.filter(h => h.is_active)

  const wealthTotal = wealthPortfolios.reduce((s, p) => s + p.total_value, 0)
  const directTotal = activeHoldings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalValue = directTotal + wealthTotal

  if (totalValue === 0) return alerts

  const withMetrics = activeHoldings.map(h => computeHoldingMetrics(h, totalValue))

  // Bucket allocations
  const bucketMap: Record<string, number> = {}
  withMetrics.forEach(h => {
    bucketMap[h.bucket] = (bucketMap[h.bucket] || 0) + h.market_value
  })
  // Wealth portfolios count as their own buckets (track separately)
  const wealthPercent = (wealthTotal / totalValue) * 100

  bucketTargets.forEach(bt => {
    const actual = ((bucketMap[bt.bucket] || 0) / totalValue) * 100
    const midTarget = (bt.target_min + bt.target_max) / 2
    const drift = actual - midTarget

    if (actual < bt.target_min - 5) {
      alerts.push({
        id: `bucket-low-${bt.bucket}`,
        severity: bt.bucket === 'CORE_ETF' ? 'CRITICAL' : 'WARNING',
        title: `${bt.display_name} underweight`,
        description: `Currently ${actual.toFixed(1)}% — target ${bt.target_min}-${bt.target_max}%. Need to add $${((bt.target_min - actual) / 100 * totalValue).toFixed(0)}.`,
        action: `Increase ${bt.display_name} allocation`,
        relatedTickers: withMetrics.filter(h => h.bucket === bt.bucket).map(h => h.ticker),
      })
    } else if (actual > bt.target_max + 5) {
      alerts.push({
        id: `bucket-high-${bt.bucket}`,
        severity: 'WARNING',
        title: `${bt.display_name} overweight`,
        description: `Currently ${actual.toFixed(1)}% — target ${bt.target_min}-${bt.target_max}%. Over by ${(actual - bt.target_max).toFixed(1)}pp.`,
        action: `Trim ${bt.display_name} holdings`,
        relatedTickers: withMetrics.filter(h => h.bucket === bt.bucket).map(h => h.ticker),
      })
    }
  })

  // Single stock cap
  withMetrics.forEach(h => {
    if (h.bucket !== 'CORE_ETF' && h.weight_percent > singleStockCap) {
      alerts.push({
        id: `overweight-${h.ticker}`,
        severity: 'WARNING',
        title: `${h.ticker} exceeds ${singleStockCap}% cap`,
        description: `${h.ticker} is ${h.weight_percent.toFixed(1)}% of portfolio — max allowed ${singleStockCap}%.`,
        action: `Consider trimming ${h.ticker}`,
        relatedTickers: [h.ticker],
      })
    }
  })

  // Tech concentration
  const techValue = withMetrics
    .filter(h => h.sector === 'Technology')
    .reduce((s, h) => s + h.market_value, 0)
  const techPercent = (techValue / totalValue) * 100
  if (techPercent > 40) {
    alerts.push({
      id: 'tech-concentration',
      severity: 'WARNING',
      title: `Tech concentration at ${techPercent.toFixed(1)}%`,
      description: `Technology exposure exceeds 40% threshold. Consider diversifying.`,
      action: 'Diversify into non-tech sectors',
      relatedTickers: withMetrics.filter(h => h.sector === 'Technology').map(h => h.ticker),
    })
  }

  // Positions down >50%
  withMetrics.forEach(h => {
    if (h.pl_percent <= -50) {
      alerts.push({
        id: `down50-${h.ticker}`,
        severity: 'WARNING',
        title: `${h.ticker} down ${h.pl_percent.toFixed(0)}%`,
        description: `Position is down ${Math.abs(h.pl_percent).toFixed(1)}%. Review thesis validity.`,
        action: `Review and possibly exit ${h.ticker}`,
        relatedTickers: [h.ticker],
      })
    } else if (h.pl_percent <= -30) {
      alerts.push({
        id: `down30-${h.ticker}`,
        severity: 'INFO',
        title: `${h.ticker} down ${h.pl_percent.toFixed(0)}%`,
        description: `Position is down ${Math.abs(h.pl_percent).toFixed(1)}%. Thesis review recommended.`,
        action: `Review thesis for ${h.ticker}`,
        relatedTickers: [h.ticker],
      })
    }
  })

  // Overlap detection
  const directTickers = new Set(withMetrics.map(h => h.ticker))
  const overlapTickers: string[] = []
  wealthPortfolios.forEach(wp => {
    wp.holdings?.forEach(wph => {
      if (directTickers.has(wph.ticker)) {
        if (!overlapTickers.includes(wph.ticker)) overlapTickers.push(wph.ticker)
      }
    })
  })
  if (overlapTickers.length > 0) {
    alerts.push({
      id: 'overlap',
      severity: 'INFO',
      title: `${overlapTickers.length} overlapping position(s)`,
      description: `${overlapTickers.join(', ')} appear in both direct holdings and wealth portfolios.`,
      action: 'Review total exposure per ticker',
      relatedTickers: overlapTickers,
    })
  }

  return alerts.sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 }
    return order[a.severity] - order[b.severity]
  })
}

export function computeBucketAllocations(
  holdings: Holding[],
  wealthPortfolios: WealthPortfolio[],
  bucketTargets: BucketTarget[]
): BucketAllocation[] {
  const activeHoldings = holdings.filter(h => h.is_active)
  const wealthTotal = wealthPortfolios.reduce((s, p) => s + p.total_value, 0)
  const directTotal = activeHoldings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalValue = directTotal + wealthTotal

  if (totalValue === 0) return []

  const bucketMap: Record<string, number> = {}
  activeHoldings.forEach(h => {
    bucketMap[h.bucket] = (bucketMap[h.bucket] || 0) + h.shares * h.current_price
  })

  // Autopilot wealth portfolios are Core ETF-style diversified funds —
  // include their value in CORE_ETF numerator so the bucket isn't understated.
  const coreEtfBoost = wealthTotal

  return bucketTargets.map(bt => {
    const rawValue = bucketMap[bt.bucket] || 0
    const actual_value = bt.bucket === 'CORE_ETF' ? rawValue + coreEtfBoost : rawValue
    const actual_percent = (actual_value / totalValue) * 100
    const midTarget = (bt.target_min + bt.target_max) / 2
    const drift = actual_percent - midTarget
    const absDrift = Math.abs(drift)
    const status: 'ok' | 'warn' | 'critical' =
      actual_percent >= bt.target_min && actual_percent <= bt.target_max
        ? 'ok'
        : absDrift <= 5 ? 'warn' : 'critical'

    return {
      bucket: bt.bucket as any,
      display_name: bt.display_name,
      actual_value,
      actual_percent,
      target_min: bt.target_min,
      target_max: bt.target_max,
      color: bt.display_color,
      drift,
      status,
    }
  })
}

export function computePortfolioHealthScore(
  holdings: Holding[],
  wealthPortfolios: WealthPortfolio[],
  bucketTargets: BucketTarget[]
): number {
  const activeHoldings = holdings.filter(h => h.is_active)
  const wealthTotal = wealthPortfolios.reduce((s, p) => s + p.total_value, 0)
  const directTotal = activeHoldings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalValue = directTotal + wealthTotal
  if (totalValue === 0) return 0

  const withMetrics = activeHoldings.map(h => computeHoldingMetrics(h, totalValue))
  const bucketMap: Record<string, number> = {}
  withMetrics.forEach(h => {
    bucketMap[h.bucket] = (bucketMap[h.bucket] || 0) + h.market_value
  })

  let score = 0

  // ETF allocation (25%)
  const etfPct = ((bucketMap['CORE_ETF'] || 0) / totalValue) * 100
  const etfBt = bucketTargets.find(b => b.bucket === 'CORE_ETF')
  if (etfBt && etfPct >= etfBt.target_min && etfPct <= etfBt.target_max) score += 25
  else if (etfBt && etfPct >= etfBt.target_min * 0.7) score += 12

  // No single stock >7% (20%)
  const overweight = withMetrics.filter(h => h.bucket !== 'CORE_ETF' && h.weight_percent > 7)
  if (overweight.length === 0) score += 20
  else if (overweight.length === 1) score += 10

  // Tech <40% (15%)
  const techPct = (withMetrics.filter(h => h.sector === 'Technology').reduce((s, h) => s + h.market_value, 0) / totalValue) * 100
  if (techPct <= 40) score += 15
  else if (techPct <= 50) score += 8

  // Cash buffer 5-10% (15%)
  const cashPct = ((bucketMap['CASH'] || 0) / totalValue) * 100
  if (cashPct >= 5 && cashPct <= 10) score += 15
  else if (cashPct >= 2) score += 8

  // No position down >50% (10%)
  const down50 = withMetrics.filter(h => h.pl_percent <= -50)
  if (down50.length === 0) score += 10
  else if (down50.length === 1) score += 5

  // Crypto within target (10%)
  const cryptoPct = ((bucketMap['CRYPTO'] || 0) / totalValue) * 100
  const cryptoBt = bucketTargets.find(b => b.bucket === 'CRYPTO')
  if (cryptoBt && cryptoPct >= cryptoBt.target_min && cryptoPct <= cryptoBt.target_max) score += 10
  else if (cryptoPct <= 15) score += 5

  // Journal entry (5%) — give benefit of doubt
  score += 5

  return Math.min(100, score)
}
