'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SBDashboard } from '@/lib/stocksbrain-fetch'
import type { EarningsCalendar } from '@/lib/types'
import { differenceInDays, parseISO } from 'date-fns'

interface Props {
  sbData: SBDashboard | null
  earnings: EarningsCalendar[]
  generatedAt?: string
}

function getDecisionStyle(decision: string) {
  switch (decision) {
    case 'BUY':  return 'bg-green-500/20 text-green-400 border border-green-500/40'
    case 'TRIM': return 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
    case 'SELL': return 'bg-red-500/20 text-red-400 border border-red-500/40'
    default:     return 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
  }
}

function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(-5, Math.min(5, score))
  const pct = ((clamped + 5) / 10) * 100
  const color = clamped >= 2 ? 'bg-green-500' : clamped <= -2 ? 'bg-red-500' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-16 bg-zinc-800 rounded-full h-1.5 relative">
        <div className="absolute top-0 left-1/2 w-px h-full bg-zinc-600" />
        <div
          className={cn('absolute top-0 h-full rounded-full', color)}
          style={{ left: clamped >= 0 ? '50%' : `${pct}%`, width: `${Math.abs(clamped) * 10}%` }}
        />
      </div>
      <span className={cn('text-xs font-bold w-5 text-right', clamped >= 1 ? 'text-green-400' : clamped <= -1 ? 'text-red-400' : 'text-zinc-400')}>
        {clamped > 0 ? `+${clamped}` : clamped}
      </span>
    </div>
  )
}

export function TodaysActionCard({ sbData, earnings }: Props) {
  const today = new Date()

  // Tickers with earnings in next 7 days
  const earningsMap: Record<string, string> = {}
  earnings.forEach(e => {
    const diff = differenceInDays(parseISO(e.earnings_date), today)
    if (diff >= 0 && diff <= 7) earningsMap[e.ticker] = e.earnings_date
  })

  if (!sbData) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-blue-800/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">TODAY&apos;S ACTION</h2>
          <span className="text-xs text-zinc-500 ml-1">— StocksBrain</span>
        </div>
        <p className="text-sm text-zinc-500">StocksBrain initializing — signals appear after first scheduled run (2am Dubai)</p>
      </div>
    )
  }

  const sorted = [...sbData.holdings].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  const ts = new Date(sbData.generated_at)
  const tsLabel = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="bg-zinc-900 rounded-xl border border-blue-800/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-blue-400" />
        <h2 className="text-lg font-bold text-white">TODAY&apos;S ACTION</h2>
        <span className="text-xs text-zinc-500 ml-1">— StocksBrain • {tsLabel}</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
          <span className="text-green-400 font-medium">{sbData.summary.hold_count} HOLD</span>
          {sbData.summary.trim_count > 0 && <span className="text-amber-400 font-medium">{sbData.summary.trim_count} TRIM</span>}
          {sbData.summary.sell_count > 0 && <span className="text-red-400 font-medium">{sbData.summary.sell_count} SELL</span>}
          {sbData.summary.buy_count > 0 && <span className="text-green-400 font-medium">{sbData.summary.buy_count} BUY</span>}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map(h => {
          const isAutopilot = h.signals?.autopilot === true
          const hasEarnings = earningsMap[h.ticker]
          const displayDecision = isAutopilot
            ? 'HOLD'
            : hasEarnings ? 'HOLD' : h.decision
          const displayLabel = isAutopilot
            ? 'HOLD (Wio managed)'
            : hasEarnings ? 'HOLD' : h.decision

          // Extract reason from output_line by stripping [TICKER] prefix
          const rawReason = h.output_line.replace(`[${h.ticker}] `, '').trim()
          const reason = isAutopilot
            ? `Managed by Wio Invest — gain ${h.gain_pct >= 0 ? '+' : ''}${h.gain_pct.toFixed(1)}%`
            : hasEarnings
              ? `⏸ Earnings ${new Date(hasEarnings).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — hold through results`
              : rawReason

          return (
            <div key={h.ticker} className="flex items-start gap-3 py-1.5 border-b border-zinc-800/50 last:border-0">
              <span className="shrink-0 w-14 font-bold text-white text-sm">{h.ticker}</span>
              <ScoreBar score={h.score} />
              <span className={cn('shrink-0 px-2 py-0.5 rounded text-xs font-bold', getDecisionStyle(displayDecision))}>
                {displayLabel}
              </span>
              <span className="text-xs text-zinc-400 leading-relaxed flex-1 min-w-0">{reason}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
