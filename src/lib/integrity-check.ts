export interface IntegrityCheck {
  ok: boolean
  errors: string[]
}

export function checkPortfolioIntegrity(
  holdings: any[],
  totalValue: number,
  totalPL: number,
  cashUsd: number
): IntegrityCheck {
  const errors: string[] = []

  const plPct = totalValue > 0 ? (totalPL / totalValue) * 100 : 0
  if (Math.abs(plPct) > 50) {
    errors.push(`Total P/L ${plPct.toFixed(1)}% is impossible — data corruption likely`)
  }

  if (cashUsd > totalValue * 0.25) {
    errors.push(`Cash $${cashUsd.toFixed(0)} > 25% of portfolio — likely phantom row`)
  }

  for (const h of holdings) {
    if (h.ticker === 'CASH') continue
    if (!h.avg_cost_per_share || h.avg_cost_per_share === 0) {
      errors.push(`${h.ticker}: avg_cost_per_share is ${h.avg_cost_per_share}`)
    }
    if (h.shares < 0) {
      errors.push(`${h.ticker}: negative shares ${h.shares}`)
    }
    if (h.avg_cost_per_share && h.current_price) {
      const ratio = h.current_price / h.avg_cost_per_share
      if (ratio > 10 || ratio < 0.1) {
        errors.push(`${h.ticker}: price/cost ratio ${ratio.toFixed(2)} — verify avg_cost`)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
