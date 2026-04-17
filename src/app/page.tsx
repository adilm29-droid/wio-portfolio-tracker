'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computeHoldingMetrics, fmtCurrency, fmtPercent, fmt, getPlColor, getPlBgColor, getActionSignalColor, getBucketColor, cn, getVixRisk } from '@/lib/utils'
import { evaluateRules, computeBucketAllocations } from '@/lib/rules-engine'
import type { Holding, WealthPortfolio, WealthPortfolioHolding, BucketTarget, EarningsCalendar, Alert, BucketAllocation, HoldingWithMetrics } from '@/lib/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Calendar, Newspaper, DollarSign, Activity, Shield } from 'lucide-react'
import { differenceInDays, format, parseISO } from 'date-fns'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6', 'Consumer Discretionary': '#f59e0b', Healthcare: '#22c55e',
  Financials: '#8b5cf6', Energy: '#ef4444', Materials: '#6b7280',
  Industrials: '#06b6d4', 'Consumer Staples': '#ec4899', 'Precious Metals': '#d97706', Other: '#52525b',
}

function SkeletonCard() {
  return <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-pulse"><div className="h-3 bg-zinc-800 rounded w-24 mb-3" /><div className="h-7 bg-zinc-800 rounded w-32" /></div>
}

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [wps, setWps] = useState<(WealthPortfolio & { holdings: WealthPortfolioHolding[] })[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [earnings, setEarnings] = useState<EarningsCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const [{ data: h }, { data: wp }, { data: wph }, { data: bt }, { data: ec }] = await Promise.all([
      supabase.from('holdings').select('*').eq('is_active', true),
      supabase.from('wealth_portfolios').select('*').eq('is_active', true),
      supabase.from('wealth_portfolio_holdings').select('*'),
      supabase.from('bucket_targets').select('*').order('sort_order'),
      supabase.from('earnings_calendar').select('*').order('earnings_date'),
    ])
    setHoldings(h || [])
    setWps((wp || []).map(w => ({ ...w, holdings: (wph || []).filter(x => x.portfolio_id === w.id) })))
    setBucketTargets(bt || [])
    setEarnings(ec || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0
  const cashVal = holdings.filter(h => h.bucket === 'CASH').reduce((s, h) => s + h.shares * h.current_price, 0)
  const cashPct = totalValue > 0 ? (cashVal / totalValue) * 100 : 0

  const withMetrics = holdings.map(h => computeHoldingMetrics(h, totalValue))
  const bucketAllocs = computeBucketAllocations(holdings, wps, bucketTargets)
  const alerts = evaluateRules(holdings, wps, bucketTargets)

  // Sector data for donut
  const sectorMap: Record<string, number> = {}
  withMetrics.forEach(h => { const s = h.sector || 'Other'; sectorMap[s] = (sectorMap[s] || 0) + h.market_value })
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7)

  // Top 10 holdings
  const top10 = [...withMetrics].sort((a, b) => b.market_value - a.market_value).slice(0, 10)

  // Upcoming earnings (next 14 days)
  const today = new Date()
  const upcoming14 = earnings.filter(e => {
    const d = parseISO(e.earnings_date)
    const diff = differenceInDays(d, today)
    return diff >= 0 && diff <= 14
  }).sort((a, b) => new Date(a.earnings_date).getTime() - new Date(b.earnings_date).getTime())

  const vixValue = 17 // Hardcoded for now
  const vixRisk = getVixRisk(vixValue)

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold">Command Center</h1><p className="text-zinc-400 text-sm">Loading portfolio data...</p></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
        <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-zinc-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50 transition-colors">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh Prices
        </button>
      </div>

      {/* Row 1: 5 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Value */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 md:col-span-2">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Total Portfolio</p>
          <p className="text-3xl font-bold text-white mt-1">{fmtCurrency(totalValue)}</p>
          <p className="text-xs text-zinc-500 mt-1">Direct: {fmtCurrency(directTotal)} + Wealth: {fmtCurrency(wealthTotal)}</p>
        </div>

        {/* P/L */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Total P/L</p>
          <p className={cn('text-2xl font-bold mt-1', getPlColor(totalPL))}>{totalPL >= 0 ? '+' : ''}{fmtCurrency(totalPL)}</p>
          <span className={cn('text-xs px-2 py-0.5 rounded mt-1 inline-block', getPlBgColor(totalPLPct))}>{fmtPercent(totalPLPct)}</span>
        </div>

        {/* Cash */}
        <div className={cn('bg-zinc-900 rounded-xl border p-4', cashPct < 5 ? 'border-red-800/50' : 'border-zinc-800')}>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Cash Buffer</p>
          <p className={cn('text-2xl font-bold mt-1', cashPct < 5 ? 'text-red-400' : 'text-white')}>{fmtCurrency(cashVal)}</p>
          <p className={cn('text-xs mt-1', cashPct < 5 ? 'text-red-400' : 'text-zinc-500')}>{fmt(cashPct, 1)}% {cashPct < 5 ? '⚠ Below 5%' : '✓'}</p>
        </div>

        {/* VIX / Fear & Greed */}
        <div className={cn('bg-zinc-900 rounded-xl border p-4', vixRisk.bg.replace('bg-', 'border-').replace('/10', '/30'))}>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Market Sentiment</p>
          <p className={cn('text-xl font-bold mt-1', vixRisk.color)}>{vixRisk.label}</p>
          <p className="text-xs text-zinc-500 mt-1">VIX ~{vixValue} • {vixValue < 20 ? 'Low fear' : vixValue < 30 ? 'Elevated' : 'High fear'}</p>
        </div>
      </div>

      {/* Row 2: Bucket Allocation */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Bucket Allocation</h2>
          <p className="text-xs text-zinc-500">Green = in range, Amber = 1-5pp off, Red = &gt;5pp off</p>
        </div>
        <div className="space-y-3">
          {bucketAllocs.map(b => {
            const barPct = Math.min(100, b.actual_percent)
            const targetMid = (b.target_min + b.target_max) / 2
            const statusColor = b.status === 'ok' ? 'bg-green-500' : b.status === 'warn' ? 'bg-amber-500' : 'bg-red-500'
            const textColor = b.status === 'ok' ? 'text-green-400' : b.status === 'warn' ? 'text-amber-400' : 'text-red-400'
            return (
              <div key={b.bucket}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-sm font-medium text-white">{b.display_name}</span>
                    <span className={cn('text-xs', textColor)}>{b.status === 'ok' ? '✓' : b.status === 'warn' ? '⚠' : '✗'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-500">Target: {b.target_min}-{b.target_max}%</span>
                    <span className={cn('font-bold', textColor)}>{fmt(b.actual_percent, 1)}%</span>
                  </div>
                </div>
                <div className="relative w-full bg-zinc-800 rounded-full h-2.5">
                  {/* Target range indicator */}
                  <div className="absolute top-0 h-full rounded-full opacity-20" style={{
                    left: `${b.target_min}%`, width: `${b.target_max - b.target_min}%`, backgroundColor: b.color
                  }} />
                  {/* Actual bar */}
                  <div className={cn('h-full rounded-full transition-all duration-700', statusColor)} style={{ width: `${barPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row 3: Holdings + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Holdings */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold">Top Holdings</h2>
            <a href="/holdings" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-zinc-800">
                {['Ticker','Value','Weight','P/L%','Signal'].map(h => <th key={h} className="text-left px-4 py-2.5 text-zinc-500 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {top10.map(h => (
                  <tr key={h.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5 font-bold text-white">{h.ticker}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{fmtCurrency(h.market_value)}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{fmt(h.weight_percent, 1)}%</td>
                    <td className="px-4 py-2.5"><span className={cn('px-1.5 py-0.5 rounded', getPlBgColor(h.pl_percent))}>{fmtPercent(h.pl_percent)}</span></td>
                    <td className="px-4 py-2.5"><span className={cn('px-1.5 py-0.5 rounded font-medium', getActionSignalColor(h.action_signal))}>{h.action_signal}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield size={18} className="text-blue-400" /> Alerts
              {alerts.length > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{alerts.length}</span>}
            </h2>
            <a href="/rules" className="text-xs text-blue-400 hover:text-blue-300">Rules →</a>
          </div>
          <div className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">All rules passing</p>
              </div>
            ) : alerts.map(a => (
              <div key={a.id} className="px-5 py-3 hover:bg-zinc-800/30">
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 shrink-0 w-2 h-2 rounded-full', a.severity === 'CRITICAL' ? 'bg-red-400' : a.severity === 'WARNING' ? 'bg-amber-400' : 'bg-blue-400')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{a.title}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0', a.severity === 'CRITICAL' ? 'bg-red-400/20 text-red-400' : a.severity === 'WARNING' ? 'bg-amber-400/20 text-amber-400' : 'bg-blue-400/20 text-blue-400')}>
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{a.description}</p>
                    <p className="text-xs text-blue-400 mt-1 font-medium">→ {a.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Sector chart + Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector donut */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-lg font-bold mb-4">Sector Concentration</h2>
          <div className="flex items-center gap-6">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {sectorData.map((s, i) => <Cell key={s.name} fill={SECTOR_COLORS[s.name] || '#52525b'} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1 text-xs">
              {sectorData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SECTOR_COLORS[s.name] || '#52525b' }} />
                    <span className="text-zinc-400 truncate max-w-[100px]">{s.name}</span>
                  </div>
                  <span className={cn('font-medium', s.name === 'Technology' && s.value / directTotal * 100 > 40 ? 'text-amber-400' : 'text-zinc-300')}>
                    {fmt(directTotal > 0 ? (s.value / directTotal) * 100 : 0, 1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming earnings */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar size={18} className="text-blue-400" /> Upcoming Earnings</h2>
            <a href="/earnings" className="text-xs text-blue-400 hover:text-blue-300">Full calendar →</a>
          </div>
          <div className="divide-y divide-zinc-800">
            {upcoming14.length === 0 ? (
              <div className="px-5 py-8 text-center text-zinc-500 text-sm">No earnings in next 14 days</div>
            ) : upcoming14.map(e => {
              const days = differenceInDays(parseISO(e.earnings_date), today)
              const isHeld = holdings.some(h => h.ticker === e.ticker)
              const position = holdings.find(h => h.ticker === e.ticker)
              return (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', days <= 3 ? 'bg-red-400/20 text-red-400 border-red-400/30' : days <= 7 ? 'bg-amber-400/20 text-amber-400 border-amber-400/30' : 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30')}>
                      {e.ticker}
                    </span>
                    {e.timing && <span className="text-xs text-zinc-500">{e.timing}</span>}
                    {isHeld && position && <span className="text-xs text-blue-400">{fmtCurrency(position.shares * position.current_price)}</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">{format(parseISO(e.earnings_date), 'MMM d')}</p>
                    <p className={cn('text-xs font-bold', days === 0 ? 'text-red-400' : days <= 3 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-zinc-400')}>
                      {days === 0 ? 'TODAY' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Direct Holdings', value: holdings.length.toString(), sub: `${withMetrics.filter(h => h.pl_percent >= 0).length} up / ${withMetrics.filter(h => h.pl_percent < 0).length} down` },
          { label: 'Wealth Portfolios', value: wps.length.toString(), sub: fmtCurrency(wealthTotal) },
          { label: 'Total Cost Basis', value: fmtCurrency(totalCost), sub: `P/L: ${fmtPercent(totalPLPct)}` },
          { label: 'Alerts', value: alerts.length.toString(), sub: `${alerts.filter(a => a.severity === 'CRITICAL').length} critical`, alert: alerts.some(a => a.severity === 'CRITICAL') },
        ].map(s => (
          <div key={s.label} className={cn('bg-zinc-900 rounded-xl border p-4', s.alert ? 'border-red-800/50' : 'border-zinc-800')}>
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn('text-xl font-bold', s.alert ? 'text-red-400' : 'text-white')}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
