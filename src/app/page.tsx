'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computeHoldingMetrics, fmtCurrency, fmtPercent, fmt, getPlColor, cn } from '@/lib/utils'
import { computeBucketAllocations, evaluateRules } from '@/lib/rules-engine'
import type { Holding, WealthPortfolio, BucketTarget, EarningsCalendar, Alert, BucketAllocation, HoldingWithMetrics } from '@/lib/types'
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, RefreshCw } from 'lucide-react'
import { differenceInDays, format, parseISO } from 'date-fns'

function SkeletonCard() {
  return <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-pulse"><div className="h-3 bg-zinc-800 rounded w-24 mb-3" /><div className="h-7 bg-zinc-800 rounded w-32" /></div>
}

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [wps, setWps] = useState<WealthPortfolio[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [earnings, setEarnings] = useState<EarningsCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const [{ data: h }, { data: wp }, { data: bt }, { data: ec }] = await Promise.all([
      supabase.from('holdings').select('*').eq('is_active', true),
      supabase.from('wealth_portfolios').select('*').eq('is_active', true),
      supabase.from('bucket_targets').select('*').order('sort_order'),
      supabase.from('earnings_calendar').select('*').order('earnings_date'),
    ])
    setHoldings(h || [])
    setWps(wp || [])
    setBucketTargets(bt || [])
    setEarnings(ec || [])
    setLoading(false)
  }

  useEffect(() => {
    load().then(() => {
      fetch('/api/refresh-prices', { method: 'POST' }).then(() => load())
    })
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await fetch('/api/refresh-prices', { method: 'POST' })
    await load()
    setRefreshing(false)
  }

  const wealthTotal = wps.reduce((s, p) => s + p.total_value, 0)
  const directTotal = holdings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalValue = directTotal + wealthTotal
  const totalCost = holdings.reduce((s, h) => s + h.shares * h.avg_cost_per_share, 0) + wps.reduce((s, p) => s + p.total_cost, 0)
  const totalPL = totalValue - totalCost

  const withMetrics: HoldingWithMetrics[] = holdings.map(h => computeHoldingMetrics(h, totalValue))
  const buckets: BucketAllocation[] = bucketTargets.length > 0 ? computeBucketAllocations(holdings, wps, bucketTargets) : []
  const alerts: Alert[] = bucketTargets.length > 0 ? evaluateRules(holdings, wps, bucketTargets) : []

  const upcomingEarnings = earnings.filter(e => {
    const d = differenceInDays(parseISO(e.earnings_date), new Date())
    return d >= 0 && d <= 14
  })

  const topGainers = [...withMetrics].sort((a, b) => b.pl_percent - a.pl_percent).slice(0, 3)
  const topLosers = [...withMetrics].sort((a, b) => a.pl_percent - b.pl_percent).slice(0, 3)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-zinc-400 text-sm">May 2026 — truth view</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Top-line numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 md:col-span-2">
              <p className="text-xs text-zinc-500 mb-1">Total Portfolio Value</p>
              <p className="text-3xl font-bold text-white">{fmtCurrency(totalValue)}</p>
              <p className={cn('text-sm font-medium mt-1', totalPL >= 0 ? 'text-green-400' : 'text-red-400')}>
                {totalPL >= 0 ? '+' : ''}{fmtCurrency(totalPL)} ({fmtPercent(totalCost > 0 ? (totalPL / totalCost) * 100 : 0)})
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 mb-1">Direct Stocks & ETFs</p>
              <p className="text-xl font-bold text-white">{fmtCurrency(directTotal)}</p>
              <p className="text-xs text-zinc-500 mt-1">{holdings.length} positions</p>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 mb-1">Wealth Portfolios</p>
              <p className="text-xl font-bold text-white">{fmtCurrency(wealthTotal)}</p>
              <p className="text-xs text-zinc-500 mt-1">{wps.length} portfolios</p>
            </div>
          </>
        )}
      </div>

      {/* Bucket allocations */}
      {!loading && buckets.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Bucket Allocations</h2>
          <div className="space-y-2">
            {buckets.map(b => (
              <div key={b.bucket} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-32 shrink-0">{b.display_name}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full', b.status === 'ok' ? 'bg-green-500' : b.status === 'warn' ? 'bg-amber-400' : 'bg-red-500')}
                    style={{ width: `${Math.min(100, b.actual_percent)}%` }}
                  />
                </div>
                <span className={cn('text-xs font-medium w-12 text-right', b.status === 'ok' ? 'text-green-400' : b.status === 'warn' ? 'text-amber-400' : 'text-red-400')}>
                  {fmt(b.actual_percent, 1)}%
                </span>
                <span className="text-xs text-zinc-600 w-20 shrink-0">target {b.target_min}-{b.target_max}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Alerts */}
        {!loading && alerts.length > 0 && (
          <div className="md:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" /> Alerts ({alerts.length})
            </h2>
            <div className="space-y-2">
              {alerts.slice(0, 5).map(a => (
                <div key={a.id} className={cn('flex items-start gap-3 p-3 rounded-lg', a.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/30' : a.severity === 'WARNING' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-800/50 border border-zinc-700/50')}>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', a.severity === 'CRITICAL' ? 'text-red-300' : a.severity === 'WARNING' ? 'text-amber-300' : 'text-zinc-300')}>{a.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming earnings */}
        {!loading && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Calendar size={14} /> Upcoming Earnings
            </h2>
            {upcomingEarnings.length === 0 ? (
              <p className="text-xs text-zinc-500">No earnings in next 14 days</p>
            ) : (
              <div className="space-y-2">
                {upcomingEarnings.map(e => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{e.ticker}</span>
                    <span className="text-xs text-zinc-400">{format(parseISO(e.earnings_date), 'MMM d')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Winners / Losers */}
      {!loading && withMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" /> Top Gainers
            </h2>
            {topGainers.map(h => (
              <div key={h.ticker} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-sm font-bold text-white">{h.ticker}</span>
                  <span className="text-xs text-zinc-500 ml-2">{fmtCurrency(h.market_value)}</span>
                </div>
                <span className="text-sm font-medium text-green-400">+{fmtPercent(h.pl_percent)}</span>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <TrendingDown size={14} className="text-red-400" /> Under Pressure
            </h2>
            {topLosers.map(h => (
              <div key={h.ticker} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-sm font-bold text-white">{h.ticker}</span>
                  <span className="text-xs text-zinc-500 ml-2">{fmtCurrency(h.market_value)}</span>
                </div>
                <span className={cn('text-sm font-medium', getPlColor(h.pl_percent))}>{fmtPercent(h.pl_percent)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wealth portfolios summary */}
      {!loading && wps.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Wealth Portfolios</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {wps.map(wp => {
              const pl = wp.total_cost > 0 ? ((wp.total_value - wp.total_cost) / wp.total_cost) * 100 : 0
              return (
                <div key={wp.id} className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 mb-1 line-clamp-2">{wp.name}</p>
                  <p className="text-base font-bold text-white">{fmtCurrency(wp.total_value)}</p>
                  <p className={cn('text-xs font-medium mt-0.5', pl >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {pl >= 0 ? '+' : ''}{fmtPercent(pl)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
