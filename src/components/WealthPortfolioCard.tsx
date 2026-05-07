'use client'

import { Shield, TrendingUp, TrendingDown } from 'lucide-react'
import type { WealthPortfolio } from '@/lib/types'
import { fmtCurrency, fmtPercent, fmt, getPlColor, cn } from '@/lib/utils'

interface Props {
  portfolios: WealthPortfolio[]
  totalPortfolioValue: number
}

export function WealthPortfolioCard({ portfolios, totalPortfolioValue }: Props) {
  if (portfolios.length === 0) return null

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Wealth Portfolios</h2>
          <span className="text-xs text-zinc-500">Wio Autopilot · Shariah</span>
        </div>
        <a href="/wealth-portfolios" className="text-xs text-blue-400 hover:text-blue-300">Details →</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
        {portfolios.map(p => {
          const pl = p.total_value - p.total_cost
          const plPct = p.total_cost > 0 ? (pl / p.total_cost) * 100 : 0
          const weight = totalPortfolioValue > 0 ? (p.total_value / totalPortfolioValue) * 100 : 0
          const positive = pl >= 0
          return (
            <div key={p.id} className="p-4 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-white leading-snug max-w-[160px]">{p.name}</p>
                {positive
                  ? <TrendingUp size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  : <TrendingDown size={14} className="text-red-400 shrink-0 mt-0.5" />
                }
              </div>
              <p className="text-xl font-bold text-white">{fmtCurrency(p.total_value)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs font-medium', getPlColor(pl))}>
                  {positive ? '+' : ''}{fmtCurrency(pl)} ({fmtPercent(plPct)})
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{fmt(weight, 1)}% of total portfolio</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
