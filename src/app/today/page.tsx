'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computeHoldingMetrics, fmtCurrency, fmtPercent, cn } from '@/lib/utils'
import { evaluateRules } from '@/lib/rules-engine'
import type { Holding, WealthPortfolio, BucketTarget, Alert, HoldingWithMetrics } from '@/lib/types'
import { CheckCircle, AlertTriangle, TrendingDown, Minus, Shield } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

const EARNINGS_CALENDAR: Record<string, string> = {
  NVDA: '2026-05-20', NKE: '2026-06-26', UNH: '2026-07-10',
  MSFT: '2026-07-22', GOOGL: '2026-07-22', KO: '2026-07-22',
  META: '2026-07-23', TSLA: '2026-07-23', AMZN: '2026-07-24',
  PLTR: '2026-08-04', AMD: '2026-08-05', BRK_B: '2026-08-03',
}

function daysToEarnings(ticker: string): number | null {
  const dateStr = EARNINGS_CALENDAR[ticker.replace('.', '_')]
  if (!dateStr) return null
  return differenceInDays(parseISO(dateStr), new Date())
}

const ACTION_COLORS: Record<string, string> = {
  HOLD: 'bg-zinc-700/50 text-zinc-200 border-zinc-600/40',
  WATCH: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  TRIM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  SELL: 'bg-red-500/20 text-red-300 border-red-500/40',
  ADD: 'bg-green-500/20 text-green-300 border-green-500/40',
}

export default function TodayPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [wps, setWps] = useState<WealthPortfolio[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('holdings').select('*').eq('is_active', true),
      supabase.from('wealth_portfolios').select('*').eq('is_active', true),
      supabase.from('bucket_targets').select('*').order('sort_order'),
    ]).then(([{ data: h }, { data: wp }, { data: bt }]) => {
      setHoldings(h || [])
      setWps(wp || [])
      setBucketTargets(bt || [])
      setLoading(false)
    })
  }, [])

  const totalValue = holdings.reduce((s, h) => s + h.shares * h.current_price, 0) + wps.reduce((s, p) => s + p.total_value, 0)
  const withMetrics: HoldingWithMetrics[] = holdings.map(h => computeHoldingMetrics(h, totalValue))
  const alerts: Alert[] = bucketTargets.length > 0 ? evaluateRules(holdings, wps, bucketTargets) : []

  const earningsWarnings = withMetrics.filter(h => {
    const days = daysToEarnings(h.ticker)
    return days !== null && days >= 0 && days <= 7
  })

  const underPressure = withMetrics.filter(h => h.pl_percent <= -15)
  const bigWinners = withMetrics.filter(h => h.pl_percent >= 50)
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL')
  const warningAlerts = alerts.filter(a => a.severity === 'WARNING')
  const doNothingToday = criticalAlerts.length === 0 && earningsWarnings.length === 0 && underPressure.length === 0 && bigWinners.length === 0

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Today&apos;s Action</h1>
        <p className="text-zinc-400 text-sm">V5 rule check — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Verdict */}
      <div className={cn('rounded-xl border p-6', doNothingToday ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30')}>
        <div className="flex items-center gap-3">
          {doNothingToday
            ? <CheckCircle size={24} className="text-green-400 shrink-0" />
            : <AlertTriangle size={24} className="text-amber-400 shrink-0" />
          }
          <div>
            <p className={cn('text-lg font-bold', doNothingToday ? 'text-green-300' : 'text-amber-300')}>
              {doNothingToday ? 'Do nothing today' : 'Review required'}
            </p>
            <p className="text-sm text-zinc-400 mt-0.5">
              {doNothingToday
                ? 'All V5 rules clear. Portfolio on autopilot.'
                : `${criticalAlerts.length} critical + ${warningAlerts.length} warnings need attention`}
            </p>
          </div>
        </div>
      </div>

      {/* Earnings blackouts */}
      {earningsWarnings.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-amber-500/30 p-4">
          <h2 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <Shield size={14} /> Earnings Blackout (do not trade)
          </h2>
          <div className="space-y-2">
            {earningsWarnings.map(h => {
              const days = daysToEarnings(h.ticker)!
              return (
                <div key={h.ticker} className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                  <div>
                    <span className="text-sm font-bold text-white">{h.ticker}</span>
                    <span className="text-xs text-zinc-400 ml-2">{fmtCurrency(h.market_value)}</span>
                  </div>
                  <span className="text-xs text-amber-300">{days === 0 ? 'TODAY' : `${days}d away`}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Under pressure */}
      {underPressure.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <TrendingDown size={14} className="text-red-400" /> Under Pressure — research thesis, don&apos;t auto-trim
          </h2>
          <div className="space-y-2">
            {underPressure.map(h => (
              <div key={h.ticker} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                <div>
                  <span className="text-sm font-bold text-white">{h.ticker}</span>
                  <span className="text-xs text-zinc-400 ml-2">{fmtCurrency(h.market_value)}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-red-400">{fmtPercent(h.pl_percent)}</span>
                  <p className="text-xs text-zinc-500">{h.action_signal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Big winners */}
      {bigWinners.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Winners &gt;50% — Thesis check</h2>
          <div className="space-y-2">
            {bigWinners.map(h => (
              <div key={h.ticker} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                <div>
                  <span className="text-sm font-bold text-white">{h.ticker}</span>
                  <span className="text-xs text-zinc-400 ml-2">{fmtCurrency(h.market_value)}</span>
                </div>
                <span className="text-sm font-medium text-green-400">+{fmtPercent(h.pl_percent)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All positions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">All Positions</h2>
        <div className="space-y-0">
          {withMetrics.sort((a, b) => b.market_value - a.market_value).map(h => {
            const days = daysToEarnings(h.ticker)
            const inBlackout = days !== null && days >= 0 && days <= 7
            return (
              <div key={h.ticker} className="flex items-center gap-3 py-2 border-b border-zinc-800/50 last:border-0">
                <span className="text-sm font-bold text-white w-14 shrink-0">{h.ticker}</span>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border', ACTION_COLORS[h.action_signal] || ACTION_COLORS.HOLD)}>
                  <Minus size={10} /> {h.action_signal}
                </span>
                <span className={cn('text-xs font-medium w-16', h.pl_percent >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {h.pl_percent >= 0 ? '+' : ''}{fmtPercent(h.pl_percent)}
                </span>
                <span className="text-xs text-zinc-500 flex-1">{fmtCurrency(h.market_value)}</span>
                {inBlackout && <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">earnings {days}d</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* V5 rule alerts */}
      {alerts.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">V5 Rule Alerts</h2>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className={cn('p-3 rounded-lg border', a.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30' : a.severity === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800/50 border-zinc-700/50')}>
                <p className={cn('text-sm font-medium', a.severity === 'CRITICAL' ? 'text-red-300' : a.severity === 'WARNING' ? 'text-amber-300' : 'text-zinc-300')}>{a.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>
                <p className="text-xs text-blue-400 mt-1">{a.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
