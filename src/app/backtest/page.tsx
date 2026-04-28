'use client'

import { useEffect, useState } from 'react'
import { fetchSBDashboard, getSBStatus, type SBDashboard } from '@/lib/stocksbrain-fetch'
import { cn, fmt, fmtPercent } from '@/lib/utils'
import { BarChart2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

const BACKTEST_URL = 'https://raw.githubusercontent.com/adilm29-droid/stocksbrain/main/backtest/results.json'

interface BacktestResults {
  hit_rate: number | null
  hit_rate_pct: number | null
  avg_buy_signal_return_30d: number | null
  annualized_buy_signal_return: number | null
  max_drawdown: number | null
  spus_total_return: number | null
  spus_total_return_pct: number | null
  total_signals_evaluated: number | null
  buy_signals: number | null
  months_backtested: number | null
  generated_at: string | null
  beat_spus: boolean | null
  warning: string | null
  error?: string
}

export default function BacktestPage() {
  const [results, setResults] = useState<BacktestResults | null>(null)
  const [sbData, setSbData] = useState<SBDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [btRes, dash] = await Promise.all([
        fetch(`${BACKTEST_URL}?_=${Math.floor(Date.now() / 3_600_000)}`, { signal: AbortSignal.timeout(8000) }),
        fetchSBDashboard(),
      ])
      if (btRes.ok) {
        setResults(await btRes.json())
      } else {
        setError('Could not fetch backtest results from GitHub.')
      }
      setSbData(dash)
    } catch (e) {
      setError('Network error loading backtest data.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const status = getSBStatus(sbData?.generated_at)
  const bt = results
  const btSummary = sbData?.backtest_summary

  const hitRate = bt?.hit_rate_pct ?? btSummary?.hit_rate_pct ?? null
  const spusReturn = bt?.spus_total_return_pct ?? btSummary?.vs_spus ?? null
  const maxDd = bt?.max_drawdown ?? btSummary?.max_drawdown ?? null
  const warning = bt?.warning ?? null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 size={22} className="text-blue-400" /> Backtest
          </h1>
          <p className="text-zinc-400 text-sm">
            Historical signal replay — 24 months, point-in-time data only
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Backtest Warning</p>
            <p className="text-xs mt-0.5 opacity-90">{warning}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <AlertTriangle size={36} className="mb-2 text-amber-400" />
          <p>{error}</p>
          <p className="text-xs mt-1">Run `python backtest/replay.py` locally to generate results.</p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={cn('bg-zinc-900 rounded-xl border p-5', hitRate !== null && hitRate < 52 ? 'border-red-800/50' : 'border-zinc-800')}>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Hit Rate</p>
              <p className={cn('text-3xl font-bold mt-1', hitRate !== null && hitRate < 52 ? 'text-red-400' : hitRate !== null && hitRate >= 55 ? 'text-green-400' : 'text-white')}>
                {hitRate !== null ? `${fmt(hitRate, 1)}%` : '—'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Target: ≥52%</p>
            </div>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Avg 30d BUY Return</p>
              <p className={cn('text-3xl font-bold mt-1', (bt?.avg_buy_signal_return_30d ?? 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                {bt?.avg_buy_signal_return_30d !== null && bt?.avg_buy_signal_return_30d !== undefined
                  ? `${(bt.avg_buy_signal_return_30d * 100).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Per signal, 30d forward</p>
            </div>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">SPUS (same period)</p>
              <p className="text-3xl font-bold mt-1 text-zinc-300">
                {spusReturn !== null ? `${fmt(spusReturn, 1)}%` : '—'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Buy-and-hold benchmark</p>
            </div>

            <div className={cn('bg-zinc-900 rounded-xl border p-5', (maxDd ?? 0) < -0.25 ? 'border-red-800/50' : 'border-zinc-800')}>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Max Drawdown</p>
              <p className={cn('text-3xl font-bold mt-1', (maxDd ?? 0) < -0.25 ? 'text-red-400' : 'text-white')}>
                {maxDd !== null ? `${(maxDd * 100).toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Worst strategy peak-to-trough</p>
            </div>
          </div>

          {/* Details panel */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="text-lg font-bold mb-4">Full Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Months backtested', value: bt?.months_backtested ?? '—' },
                { label: 'Total signals evaluated', value: bt?.total_signals_evaluated?.toLocaleString() ?? '—' },
                { label: 'BUY signals count', value: bt?.buy_signals?.toLocaleString() ?? '—' },
                { label: 'Beat SPUS', value: bt?.beat_spus != null ? (bt.beat_spus ? 'Yes' : 'No') : '—' },
                { label: 'Annualized strategy return', value: bt?.annualized_buy_signal_return != null ? `${(bt.annualized_buy_signal_return * 100).toFixed(1)}%` : '—' },
                { label: 'Results generated', value: bt?.generated_at ? new Date(bt.generated_at).toLocaleDateString() : '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500">{row.label}</span>
                  <span className="font-medium text-white">{String(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* vs SPUS comparison */}
          {hitRate !== null && spusReturn !== null && (
            <div className={cn('px-4 py-4 rounded-xl border', bt?.beat_spus ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30')}>
              <div className="flex items-center gap-3">
                {bt?.beat_spus
                  ? <CheckCircle size={20} className="text-green-400 shrink-0" />
                  : <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                }
                <div>
                  <p className={cn('font-semibold text-sm', bt?.beat_spus ? 'text-green-300' : 'text-amber-300')}>
                    {bt?.beat_spus
                      ? 'Strategy beats SPUS buy-and-hold'
                      : 'Strategy underperforms SPUS buy-and-hold'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Strategy avg 30d: {bt?.avg_buy_signal_return_30d != null ? `${(bt.avg_buy_signal_return_30d * 100).toFixed(1)}%` : '—'} |
                    SPUS total: {fmt(spusReturn, 1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-zinc-700 text-center">
            Backtest uses simplified RSI signals — same family as scorer.py. Past performance does not predict future results.
            No look-ahead bias: each signal computed using only data available at that date.
          </div>
        </>
      )}
    </div>
  )
}
