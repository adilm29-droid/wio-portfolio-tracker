'use client'

import { useEffect, useState } from 'react'
import { fetchSBDashboard, getSBStatus, type SBRecommendation, type SBDashboard } from '@/lib/stocksbrain-fetch'
import { cn, fmt } from '@/lib/utils'
import { Zap, Shield, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from 'lucide-react'

const ACTION_STYLES: Record<string, string> = {
  BUY:  'bg-green-500/20 text-green-400 border-green-500/30',
  HOLD: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/30',
  TRIM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  SELL: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH:     'text-green-400',
  MEDIUM:   'text-amber-400',
  LOW:      'text-zinc-400',
  NEGATIVE: 'text-red-400',
}

function ConfidenceBar({ confidence }: { confidence: string }) {
  const pct = confidence === 'HIGH' ? 80 : confidence === 'MEDIUM' ? 55 : confidence === 'LOW' ? 30 : 15
  const color = confidence === 'HIGH' ? 'bg-green-500' : confidence === 'MEDIUM' ? 'bg-amber-400' : confidence === 'LOW' ? 'bg-zinc-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-medium w-16 text-right', CONFIDENCE_COLORS[confidence])}>{confidence}</span>
    </div>
  )
}

export default function RecommendationsPage() {
  const [data, setData] = useState<SBDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  async function load() {
    setLoading(true)
    const d = await fetchSBDashboard()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const status = getSBStatus(data?.generated_at)
  const recs: SBRecommendation[] = data?.recommendations || []

  const filtered = filter === 'ALL' ? recs : recs.filter(r => r.action === filter)
  const summary = data?.summary

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold">Recommendations</h1><p className="text-zinc-400 text-sm">Loading StocksBrain signals...</p></div>
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data || recs.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recommendations</h1>
            <p className="text-zinc-400 text-sm">Today's BUY/HOLD/TRIM signals from StocksBrain</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <AlertTriangle size={40} className="mb-3 text-amber-400" />
          <p className="text-lg font-medium">No recommendations available</p>
          <p className="text-sm mt-1">StocksBrain may not have run yet today.</p>
          <p className={cn('text-xs mt-3 font-medium', status.level === 'green' ? 'text-green-400' : status.level === 'amber' ? 'text-amber-400' : 'text-red-400')}>
            System status: {status.label}
            {status.ageHours !== null ? ` — last run ${status.ageHours.toFixed(0)}h ago` : ''}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap size={22} className="text-blue-400" /> Recommendations
          </h1>
          <p className="text-zinc-400 text-sm">
            {data.generated_at ? new Date(data.generated_at).toLocaleString() : 'Unknown'} ·
            <span className={cn('ml-1 font-medium', status.level === 'green' ? 'text-green-400' : status.level === 'amber' ? 'text-amber-400' : 'text-red-400')}>
              {status.label}
            </span>
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'BUY signals', value: summary?.buy_count ?? 0, color: 'text-green-400' },
          { label: 'HOLD', value: summary?.hold_count ?? 0, color: 'text-zinc-300' },
          { label: 'TRIM', value: summary?.trim_count ?? 0, color: 'text-amber-400' },
          { label: 'SELL', value: summary?.sell_count ?? 0, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Insider clusters */}
      {(data.insider_clusters?.length ?? 0) > 0 && (
        <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm">
          <span className="font-semibold">Insider clusters:</span>{' '}
          {data.insider_clusters!.map(cl => `${cl.ticker} (${cl.insider_count} insiders, $${(cl.total_value / 1e3).toFixed(0)}K)`).join(' · ')}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'BUY', 'HOLD', 'TRIM', 'SELL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              filter === f
                ? 'bg-blue-600/20 text-blue-400 border-blue-600/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            )}
          >
            {f} {f !== 'ALL' && <span className="opacity-60">({recs.filter(r => r.action === f).length})</span>}
          </button>
        ))}
      </div>

      {/* Recommendation cards */}
      <div className="space-y-3">
        {filtered.map(rec => (
          <div key={rec.ticker} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-bold text-white">{rec.ticker}</span>
                <span className={cn('px-2.5 py-1 rounded-lg text-sm font-bold border', ACTION_STYLES[rec.action] || ACTION_STYLES.HOLD)}>
                  {rec.action}
                </span>
                {rec.halal_ok ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 px-2 py-0.5 rounded bg-green-400/10 border border-green-400/20">
                    <Shield size={11} /> Halal
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                    <Shield size={11} /> Non-halal
                  </span>
                )}
                {rec.government_tailwind && (
                  <span className="text-xs text-blue-400 px-2 py-0.5 rounded bg-blue-400/10 border border-blue-400/20">Gov contract</span>
                )}
              </div>
              <div className="text-right">
                {rec.position_size_pct > 0 && (
                  <p className="text-xs text-zinc-500">Kelly position: <span className="text-white font-medium">{fmt(rec.position_size_pct, 1)}%</span></p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <ConfidenceBar confidence={rec.confidence} />
            </div>

            <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{rec.reasoning}</p>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
              {rec.sharpe !== null && rec.sharpe !== undefined && (
                <span>Sharpe 1Y: <span className={cn('font-medium', rec.sharpe > 0 ? 'text-green-400' : 'text-red-400')}>{rec.sharpe.toFixed(2)}</span></span>
              )}
              {rec.vol_percentile !== null && rec.vol_percentile !== undefined && (
                <span>Vol pct: <span className={cn('font-medium', rec.vol_percentile > 80 ? 'text-red-400' : rec.vol_percentile < 40 ? 'text-green-400' : 'text-zinc-300')}>{rec.vol_percentile}th</span></span>
              )}
              {rec.kelly_capped !== null && rec.kelly_capped !== undefined && (
                <span>Kelly cap: <span className="font-medium text-zinc-300">{fmt(rec.kelly_capped * 100, 1)}%</span></span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>No {filter} signals today.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-700 text-center">
        Signals are decision aids — not financial advice. Every trade requires human judgment.
      </p>
    </div>
  )
}
