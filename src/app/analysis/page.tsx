'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtCurrency, fmtPercent, fmt, computeHoldingMetrics, cn } from '@/lib/utils'
import { computePortfolioHealthScore, computeBucketAllocations } from '@/lib/rules-engine'
import type { Holding, WealthPortfolio, WealthPortfolioHolding, BucketTarget, PortfolioSnapshot } from '@/lib/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { format, parseISO } from 'date-fns'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6', 'Consumer Discretionary': '#f59e0b', Healthcare: '#22c55e',
  Financials: '#8b5cf6', Energy: '#ef4444', Materials: '#6b7280',
  Industrials: '#06b6d4', 'Consumer Staples': '#ec4899', 'Precious Metals': '#d97706', Other: '#52525b',
}

export default function AnalysisPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [wps, setWps] = useState<(WealthPortfolio & { holdings: WealthPortfolioHolding[] })[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [snapRange, setSnapRange] = useState<'1W'|'1M'|'3M'|'ALL'>('1M')

  useEffect(() => {
    async function load() {
      const [{ data: h }, { data: wp }, { data: wph }, { data: bt }, { data: snaps }] = await Promise.all([
        supabase.from('holdings').select('*').eq('is_active', true),
        supabase.from('wealth_portfolios').select('*').eq('is_active', true),
        supabase.from('wealth_portfolio_holdings').select('*'),
        supabase.from('bucket_targets').select('*').order('sort_order'),
        supabase.from('portfolio_snapshots').select('*').order('snapshot_date'),
      ])
      const enrichedWps = (wp || []).map(w => ({ ...w, holdings: (wph || []).filter(x => x.portfolio_id === w.id) }))
      setHoldings(h || [])
      setWps(enrichedWps)
      setBucketTargets(bt || [])
      setSnapshots(snaps || [])
      setLoading(false)
    }
    load()
  }, [])

  const wealthTotal = wps.reduce((s, p) => s + p.total_value, 0)
  const directTotal = holdings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalValue = directTotal + wealthTotal
  const withMetrics = holdings.map(h => computeHoldingMetrics(h, totalValue))
  const score = computePortfolioHealthScore(holdings, wps, bucketTargets)
  const bucketAllocs = computeBucketAllocations(holdings, wps, bucketTargets)

  // Sector aggregation (direct)
  const sectorMap: Record<string, number> = {}
  withMetrics.forEach(h => {
    const s = h.sector || 'Other'
    sectorMap[s] = (sectorMap[s] || 0) + h.market_value
  })
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const topSectors = sectorData.slice(0, 6)
  const otherValue = sectorData.slice(6).reduce((s, x) => s + x.value, 0)
  if (otherValue > 0) topSectors.push({ name: 'Other', value: otherValue })

  // Overlap
  const directTickers = new Set(holdings.map(h => h.ticker))
  const overlapData: { ticker: string; directValue: number; wealthValue: number; combined: number; weight: number }[] = []
  const seenOverlap = new Set<string>()
  wps.forEach(wp => {
    wp.holdings.forEach(wph => {
      if (directTickers.has(wph.ticker) && !seenOverlap.has(wph.ticker)) {
        const dh = holdings.find(h => h.ticker === wph.ticker)
        const directValue = dh ? dh.shares * dh.current_price : 0
        const wealthValue = wps.flatMap(p => p.holdings).filter(h => h.ticker === wph.ticker).reduce((s, h) => s + h.value, 0)
        overlapData.push({ ticker: wph.ticker, directValue, wealthValue, combined: directValue + wealthValue, weight: totalValue > 0 ? ((directValue + wealthValue) / totalValue) * 100 : 0 })
        seenOverlap.add(wph.ticker)
      }
    })
  })

  // Position sizing
  const bigPositions = withMetrics.filter(h => h.weight_percent >= 5).sort((a, b) => b.weight_percent - a.weight_percent)

  // Snapshot chart data
  const now = new Date()
  const rangeFilter = snapshots.filter(s => {
    const d = parseISO(s.snapshot_date)
    if (snapRange === '1W') return (now.getTime() - d.getTime()) <= 7 * 864e5
    if (snapRange === '1M') return (now.getTime() - d.getTime()) <= 30 * 864e5
    if (snapRange === '3M') return (now.getTime() - d.getTime()) <= 90 * 864e5
    return true
  })

  const techPct = (sectorMap['Technology'] || 0) / totalValue * 100

  // Score factors
  const etfBt = bucketTargets.find(b => b.bucket === 'CORE_ETF')
  const etfVal = holdings.filter(h => h.bucket === 'CORE_ETF').reduce((s, h) => s + h.shares * h.current_price, 0)
  const etfPct = totalValue > 0 ? (etfVal / totalValue) * 100 : 0
  const cryptoVal = holdings.filter(h => h.asset_class === 'CRYPTO').reduce((s, h) => s + h.shares * h.current_price, 0)
  const cryptoPct = totalValue > 0 ? (cryptoVal / totalValue) * 100 : 0
  const cashVal = holdings.filter(h => h.bucket === 'CASH').reduce((s, h) => s + h.shares * h.current_price, 0)
  const cashPct = totalValue > 0 ? (cashVal / totalValue) * 100 : 0

  const scoreFactors = [
    { label: 'ETF Allocation (50-65%)', pass: etfPct >= 50 && etfPct <= 65, detail: `${fmt(etfPct, 1)}%` },
    { label: 'No single stock >7%', pass: !withMetrics.find(h => h.bucket !== 'CORE_ETF' && h.weight_percent > 7), detail: bigPositions.length > 0 ? `${bigPositions[0]?.ticker} at ${fmt(bigPositions[0]?.weight_percent, 1)}%` : 'All clear' },
    { label: 'Tech concentration <40%', pass: techPct <= 40, detail: `${fmt(techPct, 1)}%` },
    { label: 'Cash buffer 5-10%', pass: cashPct >= 5 && cashPct <= 10, detail: `${fmt(cashPct, 1)}%` },
    { label: 'No position down >50%', pass: !withMetrics.find(h => h.pl_percent <= -50), detail: withMetrics.filter(h => h.pl_percent <= -50).map(h => h.ticker).join(', ') || 'All clear' },
    { label: 'Crypto in range 5-10%', pass: cryptoPct >= 5 && cryptoPct <= 10, detail: `${fmt(cryptoPct, 1)}%` },
  ]

  const scoreColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  const scoreStroke = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 54
  const strokeDash = (score / 100) * circumference

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Portfolio Analysis</h1>
        <p className="text-zinc-400 text-sm">Deep dive into portfolio health and composition</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold mb-4">Portfolio Health Score</h2>
          <div className="flex items-center gap-8">
            <div className="relative shrink-0">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="54" fill="none" stroke="#27272a" strokeWidth="12" />
                <circle cx="70" cy="70" r="54" fill="none" stroke={scoreStroke} strokeWidth="12"
                  strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round"
                  transform="rotate(-90 70 70)" strokeDashoffset="0" style={{ transition: 'stroke-dasharray 1s ease' }} />
                <text x="70" y="65" textAnchor="middle" className="fill-white" style={{ fontSize: 28, fontWeight: 700, fill: 'white' }}>{score}</text>
                <text x="70" y="83" textAnchor="middle" style={{ fontSize: 12, fill: '#71717a' }}>/100</text>
              </svg>
            </div>
            <div className="space-y-2 flex-1">
              {scoreFactors.map(f => (
                <div key={f.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={f.pass ? 'text-green-400' : 'text-red-400'}>{f.pass ? '✓' : '✗'}</span>
                    <span className="text-zinc-400">{f.label}</span>
                  </div>
                  <span className={cn('text-xs', f.pass ? 'text-green-400' : 'text-red-400')}>{f.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sector breakdown */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold mb-4">Sector Breakdown</h2>
          {techPct > 40 && (
            <div className="mb-3 p-2 bg-amber-400/10 border border-amber-400/20 rounded-lg text-xs text-amber-400">
              ⚠ Tech at {fmt(techPct, 1)}% — above 40% concentration threshold
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={topSectors} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {topSectors.map((s, i) => <Cell key={s.name} fill={SECTOR_COLORS[s.name] || '#52525b'} />)}
                </Pie><Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 flex-1 text-xs">
              {topSectors.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SECTOR_COLORS[s.name] || '#52525b' }} />
                    <span className="text-zinc-400 truncate max-w-[110px]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-zinc-800 rounded-full h-1"><div className="h-full rounded-full" style={{ width: `${(s.value / directTotal) * 100}%`, background: SECTOR_COLORS[s.name] || '#52525b' }} /></div>
                    <span className="text-zinc-300 w-10 text-right">{fmt((s.value / directTotal) * 100, 1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Historical portfolio value */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Portfolio Value History</h2>
          <div className="flex gap-1">
            {(['1W','1M','3M','ALL'] as const).map(r => (
              <button key={r} onClick={() => setSnapRange(r)} className={cn('px-3 py-1 rounded text-xs font-medium transition-colors', snapRange === r ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>{r}</button>
            ))}
          </div>
        </div>
        {rangeFilter.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            <div className="text-center"><p>No historical data yet.</p><p className="text-xs mt-1">Run /api/snapshot daily to build history.</p></div>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rangeFilter.map(s => ({ date: format(parseISO(s.snapshot_date), 'MMM d'), value: s.total_value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Overlap detection */}
      {overlapData.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold mb-4">Overlap Detection</h2>
          <p className="text-zinc-400 text-sm mb-4">Tickers in both direct holdings and wealth portfolios</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">{['Ticker','Direct','Wealth Portfolios','Combined','Total Weight'].map(h => <th key={h} className="text-left px-4 py-2 text-zinc-400 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {overlapData.sort((a, b) => b.combined - a.combined).map(o => (
                  <tr key={o.ticker} className="border-b border-zinc-800/40">
                    <td className="px-4 py-2 font-bold text-white">{o.ticker}</td>
                    <td className="px-4 py-2 text-zinc-300">{fmtCurrency(o.directValue)}</td>
                    <td className="px-4 py-2 text-zinc-300">{fmtCurrency(o.wealthValue)}</td>
                    <td className="px-4 py-2 font-semibold text-white">{fmtCurrency(o.combined)}</td>
                    <td className="px-4 py-2"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', o.weight > 7 ? 'bg-red-400/20 text-red-400' : 'bg-zinc-700 text-zinc-300')}>{fmt(o.weight, 1)}%{o.weight > 7 ? ' ⚠' : ''}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Position sizing */}
      {bigPositions.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold mb-4">Position Sizing (≥5% weight)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">{['Ticker','Name','Value','Weight %','Max Allowed','Status'].map(h => <th key={h} className="text-left px-4 py-2 text-zinc-400 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {bigPositions.map(h => {
                  const max = h.bucket === 'CORE_ETF' ? 999 : 7
                  const over = h.weight_percent > max
                  return (
                    <tr key={h.id} className="border-b border-zinc-800/40">
                      <td className="px-4 py-2 font-bold text-white">{h.ticker}</td>
                      <td className="px-4 py-2 text-zinc-400 max-w-[140px] truncate">{h.name}</td>
                      <td className="px-4 py-2 text-zinc-300">{fmtCurrency(h.market_value)}</td>
                      <td className="px-4 py-2 font-semibold text-white">{fmt(h.weight_percent, 1)}%</td>
                      <td className="px-4 py-2 text-zinc-400">{max === 999 ? 'No cap' : `${max}%`}</td>
                      <td className="px-4 py-2"><span className={cn('px-2 py-0.5 rounded text-xs', over ? 'bg-red-400/20 text-red-400' : 'bg-green-400/20 text-green-400')}>{over ? 'OVER' : 'OK'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
