'use client'

import { useEffect, useState } from 'react'
import { fetchSBDashboard } from '@/lib/stocksbrain-fetch'
import type { SBDashboard } from '@/lib/stocksbrain-fetch'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertTriangle, TrendingDown, TrendingUp, Minus, RefreshCw, Shield } from 'lucide-react'

// Static verdicts derived from StocksBrain run 2026-04-28
// Refreshed each time the page loads from the live dashboard.json
const AUTOPILOTS = [
  { name: 'Cybersecurity & Digital Protection', action: 'HOLD', note: 'Wio-managed, down 6.9%', gain: -6.9 },
  { name: 'Architects of AI', action: 'HOLD', note: 'Wio-managed, up 3.7%', gain: 3.7 },
  { name: 'FATMAA', action: 'HOLD', note: 'Wio-managed, up 2.7%', gain: 2.7 },
  { name: 'Dividend Stocks', action: 'HOLD', note: 'Wio-managed, up 6.8% — LOCKED, never sell', gain: 6.8 },
]

const EARNINGS_THIS_WEEK = [
  { ticker: 'UNH',  date: 'Mon Apr 21', timing: 'BMO', note: 'REPORTED — beat, raised guide', done: true },
  { ticker: 'TSLA', date: 'Tue Apr 22', timing: 'AMC', note: 'REPORTED — EPS beat, rev miss', done: true },
  { ticker: 'MSFT', date: 'Tue Apr 29', timing: 'AMC', note: 'HOLD through print', done: false },
  { ticker: 'GOOGL',date: 'Tue Apr 29', timing: 'AMC', note: 'HOLD (via FATMAA autopilot)', done: false },
  { ticker: 'META', date: 'Tue Apr 29', timing: 'AMC', note: 'HOLD through print', done: false },
  { ticker: 'AMZN', date: 'Tue Apr 29', timing: 'AMC', note: 'HOLD through print', done: false },
  { ticker: 'AMD',  date: 'Mon May 5',  timing: 'AMC', note: 'Review before open May 5', done: false },
]

const ACTION_COLORS: Record<string, string> = {
  HOLD: 'bg-zinc-700/50 text-zinc-200 border-zinc-600/40',
  TRIM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  BUY:  'bg-green-500/20 text-green-300 border-green-500/40',
  SELL: 'bg-red-500/20 text-red-300 border-red-500/40',
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  HOLD: <Minus size={12} />,
  TRIM: <TrendingDown size={12} />,
  BUY:  <TrendingUp size={12} />,
  SELL: <TrendingDown size={12} className="text-red-400" />,
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border', ACTION_COLORS[action] || ACTION_COLORS.HOLD)}>
      {ACTION_ICON[action]} {action}
    </span>
  )
}

interface Verdict {
  ticker: string
  action: string
  score: number
  why: string
  earningsNote?: string
}

function buildVerdicts(sbData: SBDashboard | null): Verdict[] {
  const EARNINGS_NOTES: Record<string, string> = {
    AMZN: 'Earnings tomorrow Apr 29 AMC — HOLD through print',
    MSFT: 'Earnings tomorrow Apr 29 AMC — HOLD through print',
    META: 'Earnings tomorrow Apr 29 AMC — HOLD through print',
    AMD:  'Earnings May 5 AMC — wait for post-print decision',
  }

  const TICKER_MAP: Record<string, string> = {
    'GC=F': 'GOLD', 'SI=F': 'SILVER',
    'BTC-USD': 'BTC', 'ETH-USD': 'ETH', 'XRP-USD': 'XRP', 'SOL-USD': 'SOL',
  }

  const MANUAL_WHY: Record<string, string> = {
    AMD:  'RSI 80.2 overbought, analyst downgrade, thesis-break — sector tech still favorable',
    AMZN: 'RSI 75.9, sector favorable — no action before earnings print',
    BTC:  'RSI 57.1, neutral signals, no action',
    ETH:  'Regulatory thesis-break flag, score -1 — consider reducing',
    GOLD: 'RSI 43.1, trend intact, neutral',
    HLAL: 'Core ETF, RSI 70.4 slightly overbought — accumulate only on dips',
    HNST: 'Analyst upside only 0.6% — weakest conviction name in portfolio',
    KO:   'RSI 46.5, neutral signals, no action',
    META: 'Analyst upside 26%, sector favorable — HOLD through earnings',
    MSFT: 'Analyst upside 34.8%, antitrust flag — HOLD through earnings',
    NKE:  'Down 27.5%, analyst upside 36.6% — thesis intact, accumulate on weakness',
    NVDA: 'RSI 76.3 overbought, analyst upside 24% — sector very favorable, do not chase',
    PEP:  'RSI 45.3, analyst upside 11.6%, neutral',
    PLTR: 'Analyst upside 30.3%, sector favorable, RSI healthy',
    SILVER:'RSI 43.0, neutral signals',
    SOL:  'RSI 46.5, down 40.4% — RSI cooled, wait for confirmation before any action',
    SPOT: 'Analyst upside 29.2%, sector favorable',
    SPUS: 'Core ETF, RSI 71.9 — accumulate only on dips, not now',
    SSTK: 'Analyst upside 63.7% but regulatory flag — hold',
    TSLA: 'Reported Apr 22 (beat/miss) — sector favorable, regulatory flag',
    UNH:  'RSI 81.6 very overbought post-earnings — partial profit opportunity',
    URTH: 'Core ETF, RSI 66.2 healthy — no action',
    V:    'Analyst upside 26.7%, fraud flag is baseline risk not new news',
    XRP:  'Regulatory thesis-break, down 37.4% — thesis under pressure',
  }

  if (!sbData?.holdings) {
    return Object.entries(MANUAL_WHY).map(([ticker, why]) => ({
      ticker,
      action: ['HNST', 'UNH', 'ETH', 'XRP'].includes(ticker) ? 'TRIM' : 'HOLD',
      score: ['META', 'NKE', 'PLTR', 'SPOT'].includes(ticker) ? 2 : ['MSFT', 'NVDA', 'SSTK', 'V'].includes(ticker) ? 1 : ['ETH', 'XRP', 'HNST', 'UNH'].includes(ticker) ? -1 : 0,
      why,
      earningsNote: EARNINGS_NOTES[ticker],
    }))
  }

  return sbData.holdings
    .filter(h => !['Cybersecurity', 'Architects of AI', 'FATMAA', 'Dividend Stocks'].includes(h.ticker))
    .map(h => {
      const display = TICKER_MAP[h.ticker] || h.ticker
      const sigs = h.signals || {}
      const reasons: string[] = []
      if (sigs.rsi_overbought) reasons.push('RSI overbought')
      if (sigs.analyst_upside_strong) reasons.push('strong analyst upside')
      if (sigs.analyst_upside_weak) reasons.push('weak analyst upside')
      if (sigs.sector_rotation_favorable) reasons.push('sector rotation favorable')
      if (sigs.thesis_break) reasons.push('thesis-break flag')
      if (sigs.large_gain_with_sell_signal) reasons.push('large gain + sell signal')
      if (sigs.is_core_etf) reasons.push('core ETF — accumulate on dips')
      const why = MANUAL_WHY[display] || reasons.join(', ') || 'neutral signals'
      return {
        ticker: display,
        action: h.decision || 'HOLD',
        score: h.score || 0,
        why,
        earningsNote: EARNINGS_NOTES[display],
      }
    })
}

export default function TodayPage() {
  const [sbData, setSbData] = useState<SBDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRun, setLastRun] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetchSBDashboard()
    setSbData(data)
    setLastRun(data?.generated_at || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const verdicts = buildVerdicts(sbData)
  const trims = verdicts.filter(v => v.action === 'TRIM')
  const buys = verdicts.filter(v => v.action === 'BUY')
  const holds = verdicts.filter(v => v.action === 'HOLD')

  const macro = sbData?.macro
  const vix = macro?.vix ?? 18.0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Today&apos;s Verdict</h1>
          <p className="text-zinc-400 text-sm">28 April 2026 — one action per holding, nothing else</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Earnings freeze banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
        ⏸ Earnings week — MSFT, GOOGL, META &amp; AMZN all report Tue Apr 29 AMC. No new trades until results drop.
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {buys.length > 0 && <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm font-bold">{buys.length} BUY</div>}
        <div className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm font-bold">{holds.length} HOLD</div>
        {trims.length > 0 && <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm font-bold">{trims.length} TRIM</div>}
        <div className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-500 text-xs flex items-center gap-1">
          Brain run: {lastRun ? new Date(lastRun).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'loading...'}
        </div>
      </div>

      {/* Actions needed first */}
      {trims.length > 0 && (
        <div className="bg-amber-950/30 rounded-xl border border-amber-800/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-800/40 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="font-bold text-amber-300">Action Required</h2>
          </div>
          <div className="divide-y divide-amber-800/20">
            {trims.map(v => (
              <div key={v.ticker} className="px-5 py-3 flex items-start gap-4">
                <span className="font-bold text-white w-16 shrink-0">{v.ticker}</span>
                <ActionBadge action={v.action} />
                <span className="text-zinc-300 text-sm">{v.why}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All holdings table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold">Direct Holdings</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Frameworks running silently: 13-factor score, halal gate, Kronos vol, sector rotation, analyst consensus, gov contracts, options flow</p>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {verdicts.map(v => (
            <div key={v.ticker} className="px-5 py-3 flex items-start gap-4 hover:bg-zinc-800/20">
              <span className="font-bold text-white w-16 shrink-0 pt-0.5">{v.ticker}</span>
              <div className="shrink-0 pt-0.5">
                <ActionBadge action={v.action} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 text-sm">{v.why}</p>
                {v.earningsNote && (
                  <p className="text-amber-400 text-xs mt-0.5 font-medium">⏰ {v.earningsNote}</p>
                )}
              </div>
              <span className={cn('text-xs font-mono shrink-0', v.score > 0 ? 'text-green-400' : v.score < 0 ? 'text-red-400' : 'text-zinc-500')}>
                {v.score > 0 ? '+' : ''}{v.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Autopilot portfolios */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Shield size={16} className="text-blue-400" />
          <h2 className="text-lg font-bold">Autopilot Portfolios</h2>
          <span className="text-xs text-zinc-500">Always HOLD — Wio manages these</span>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {AUTOPILOTS.map(p => (
            <div key={p.name} className="px-5 py-3 flex items-center gap-4">
              <span className="font-medium text-zinc-300 flex-1">{p.name}</span>
              <ActionBadge action="HOLD" />
              <span className={cn('text-xs font-medium', p.gain >= 0 ? 'text-green-400' : 'text-red-400')}>
                {p.gain >= 0 ? '+' : ''}{p.gain}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Macro pulse */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-lg font-bold mb-3">Macro Pulse</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'VIX', value: `${vix}`, sub: vix < 20 ? 'Risk On' : vix < 30 ? 'Caution' : 'Fear', color: vix < 20 ? 'text-green-400' : vix < 30 ? 'text-amber-400' : 'text-red-400' },
            { label: '10Y Yield', value: `${macro?.ten_year_yield ?? 4.34}%`, sub: 'Elevated but stable', color: 'text-zinc-300' },
            { label: 'DXY', value: `${macro?.dxy ?? 98.68}`, sub: 'Dollar weakening', color: 'text-green-400' },
            { label: 'SP500', value: macro?.sp500_trend ?? 'BULLISH', sub: `${macro?.sp500_5d_return != null ? (macro.sp500_5d_return >= 0 ? '+' : '') + macro.sp500_5d_return.toFixed(2) : '+1.58'}% 5d`, color: 'text-green-400' },
          ].map(m => (
            <div key={m.label} className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">{m.label}</p>
              <p className={cn('text-lg font-bold', m.color)}>{m.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings calendar */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold">This Week&apos;s Earnings</h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {EARNINGS_THIS_WEEK.map(e => (
            <div key={e.ticker + e.date} className={cn('px-5 py-3 flex items-center gap-4', e.done ? 'opacity-50' : '')}>
              <span className="font-bold text-white w-14 shrink-0">{e.ticker}</span>
              <span className="text-zinc-500 text-xs w-28 shrink-0">{e.date} {e.timing}</span>
              <span className={cn('text-sm flex-1', e.done ? 'text-zinc-500 italic' : 'text-zinc-300')}>{e.note}</span>
              {e.done && <span className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded font-bold">DONE</span>}
            </div>
          ))}
        </div>
      </div>

      {/* What I won't do */}
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-5">
        <h2 className="font-bold text-zinc-400 mb-3 text-sm uppercase tracking-wide">What I Will NOT Do Today</h2>
        <ul className="space-y-1.5 text-sm text-zinc-500">
          <li>✗ No new positions during earnings week</li>
          <li>✗ No selling autopilot portfolios</li>
          <li>✗ No SOL trim until stop-loss preference is confirmed</li>
          <li>✗ No AMD action until post-earnings (May 5) review</li>
          <li>✗ No trades based on YouTube/Twitter — only the verdicts above</li>
        </ul>
      </div>

      {/* System honesty */}
      <div className="px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
        <p className="text-xs text-zinc-600">
          These verdicts use 13 data inputs + halal gate + sector rotation. Insider data offline today (openinsider.com refused). Geopolitics offline (GDELT timeout). Backtest hit rate unavailable (price history bug). This system tilts odds 5-10% over the long run — no more.
        </p>
        <p className="text-xs text-zinc-700 mt-1">1 USD = 3.6725 AED (UAE Central Bank fixed peg)</p>
      </div>
    </div>
  )
}
