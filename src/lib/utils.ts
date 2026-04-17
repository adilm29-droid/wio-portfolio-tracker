import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays } from 'date-fns'
import type { Holding, HoldingWithMetrics, ActionSignal } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function fmtCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function fmtPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${fmt(value, decimals)}%`
}

export function fmtCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return fmtCurrency(value)
}

export function getPlColor(value: number): string {
  if (value > 0) return 'text-green-400'
  if (value < 0) return 'text-red-400'
  return 'text-zinc-400'
}

export function getPlBgColor(value: number): string {
  if (value > 0) return 'bg-green-400/10 text-green-400'
  if (value < 0) return 'bg-red-400/10 text-red-400'
  return 'bg-zinc-400/10 text-zinc-400'
}

export function computeHoldingMetrics(
  holding: Holding,
  totalPortfolioValue: number,
): HoldingWithMetrics {
  const market_value = holding.shares * holding.current_price
  const cost_basis = holding.shares * holding.avg_cost_per_share
  const pl_dollars = market_value - cost_basis
  const pl_percent = cost_basis > 0 ? (pl_dollars / cost_basis) * 100 : 0
  const weight_percent = totalPortfolioValue > 0 ? (market_value / totalPortfolioValue) * 100 : 0
  const days_held = differenceInDays(new Date(), new Date(holding.created_at))

  let action_signal: ActionSignal = 'HOLD'
  if (pl_percent <= -50) action_signal = 'SELL'
  else if (pl_percent <= -30) action_signal = 'WATCH'
  else if (weight_percent > 7 && holding.bucket !== 'CORE_ETF') action_signal = 'TRIM'
  else if (pl_percent >= 50 && weight_percent > 7) action_signal = 'TRIM'

  return { ...holding, market_value, cost_basis, pl_dollars, pl_percent, weight_percent, action_signal, days_held }
}

export function getActionSignalColor(signal: ActionSignal): string {
  const map: Record<ActionSignal, string> = {
    HOLD: 'bg-zinc-700 text-zinc-300',
    TRIM: 'bg-amber-400/20 text-amber-400',
    SELL: 'bg-red-400/20 text-red-400',
    ADD: 'bg-green-400/20 text-green-400',
    WATCH: 'bg-blue-400/20 text-blue-400',
  }
  return map[signal]
}

export function getBucketColor(bucket: string): string {
  const map: Record<string, string> = {
    CORE_ETF: '#3b82f6',
    QUALITY_STOCK: '#22c55e',
    SPECULATIVE: '#f59e0b',
    CRYPTO: '#8b5cf6',
    COMMODITY: '#6b7280',
    CASH: '#94a3b8',
  }
  return map[bucket] || '#71717a'
}

export function getVixRisk(vix: number): { label: string; color: string; bg: string } {
  if (vix < 20) return { label: 'Risk On', color: 'text-green-400', bg: 'bg-green-400/10' }
  if (vix < 30) return { label: 'Caution', color: 'text-amber-400', bg: 'bg-amber-400/10' }
  return { label: 'Fear', color: 'text-red-400', bg: 'bg-red-400/10' }
}

export const AED_USD_RATE = 3.6725
