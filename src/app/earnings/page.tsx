'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtCurrency, fmt, cn } from '@/lib/utils'
import type { EarningsCalendar, Holding, WealthPortfolioHolding } from '@/lib/types'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import { differenceInDays, format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsCalendar[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [wphList, setWphList] = useState<WealthPortfolioHolding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: e }, { data: h }, { data: wph }] = await Promise.all([
        supabase.from('earnings_calendar').select('*').order('earnings_date'),
        supabase.from('holdings').select('*').eq('is_active', true),
        supabase.from('wealth_portfolio_holdings').select('*'),
      ])
      setEarnings(e || [])
      setHoldings(h || [])
      setWphList(wph || [])
      setLoading(false)
    }
    load()
  }, [])

  const today = startOfDay(new Date())
  const directTickers = new Set(holdings.map(h => h.ticker))
  const wealthTickers = new Set(wphList.map(h => h.ticker))

  const enriched = earnings.map(e => {
    const date = parseISO(e.earnings_date)
    const days = differenceInDays(date, today)
    const isDirect = directTickers.has(e.ticker)
    const isWealth = wealthTickers.has(e.ticker)
    const holding = holdings.find(h => h.ticker === e.ticker)
    const positionSize = holding ? holding.shares * holding.current_price : 0
    const isPast = isBefore(date, today)
    return { ...e, date, days, isDirect, isWealth, positionSize, isPast }
  })

  const upcoming = enriched.filter(e => !e.isPast).sort((a, b) => a.days - b.days)
  const past = enriched.filter(e => e.isPast).sort((a, b) => b.days - a.days).slice(0, 5)
  const thisWeek = upcoming.filter(e => e.days <= 7).length
  const next14 = upcoming.filter(e => e.days <= 14).length

  function urgencyColor(days: number) {
    if (days <= 3) return 'bg-red-400/20 text-red-400 border-red-400/30'
    if (days <= 7) return 'bg-amber-400/20 text-amber-400 border-amber-400/30'
    if (days <= 14) return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
    return 'bg-zinc-700/50 text-zinc-400 border-zinc-700'
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Earnings Calendar</h1>
        <p className="text-zinc-400 text-sm">Upcoming earnings for your holdings</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Earnings This Week', value: thisWeek.toString(), alert: thisWeek > 0 },
          { label: 'Next 14 Days', value: next14.toString() },
          { label: 'Total Upcoming', value: upcoming.length.toString() },
          { label: 'Total at Risk (Direct)', value: fmtCurrency(upcoming.filter(e => e.isDirect).reduce((s, e) => s + e.positionSize, 0)) },
        ].map(s => (
          <div key={s.label} className={cn('bg-zinc-900 rounded-xl p-4 border', s.alert ? 'border-red-800/50 bg-red-900/10' : 'border-zinc-800')}>
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn('text-xl font-bold', s.alert ? 'text-red-400' : 'text-white')}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Urgency legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: '≤3 days', color: 'bg-red-400/20 text-red-400' },
          { label: '≤7 days', color: 'bg-amber-400/20 text-amber-400' },
          { label: '≤14 days', color: 'bg-yellow-400/20 text-yellow-400' },
          { label: '>14 days', color: 'bg-zinc-700/50 text-zinc-400' },
        ].map(l => (
          <span key={l.label} className={cn('px-3 py-1 rounded-full border', l.color)}>{l.label}</span>
        ))}
      </div>

      {/* Upcoming earnings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.map(e => (
          <div key={e.id} className={cn('rounded-xl border p-4 transition-colors', urgencyColor(e.days))}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{e.ticker}</span>
                {e.timing && (
                  <span className="px-2 py-0.5 rounded text-xs bg-zinc-800/50 text-zinc-300 border border-zinc-700">
                    {e.timing === 'BMO' ? '🌅 Before Open' : '🌆 After Close'}
                  </span>
                )}
                {e.isDirect && <span className="px-2 py-0.5 rounded text-xs bg-blue-400/20 text-blue-400 border border-blue-400/20">Direct</span>}
                {e.isWealth && <span className="px-2 py-0.5 rounded text-xs bg-purple-400/20 text-purple-400 border border-purple-400/20">Wealth Portfolio</span>}
              </div>
              <div className="flex items-center gap-4 text-sm">
                {e.isDirect && e.positionSize > 0 && (
                  <span className="text-zinc-300">Position: <span className="font-bold text-white">{fmtCurrency(e.positionSize)}</span></span>
                )}
                <span className="font-medium">{format(e.date, 'MMM d, yyyy')}</span>
                <span className="font-bold">
                  {e.days === 0 ? '🔴 TODAY' : e.days === 1 ? '🔴 Tomorrow' : `${e.days}d away`}
                </span>
              </div>
            </div>
            {e.days <= 7 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs opacity-80">
                <AlertTriangle size={12} />
                {e.days <= 3 ? 'Imminent earnings — high volatility risk. Review position size.' : 'Earnings within 7 days — monitor closely.'}
              </div>
            )}
          </div>
        ))}
        {upcoming.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p>No upcoming earnings tracked</p>
          </div>
        )}
      </div>

      {/* Past earnings */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-500">Past (Recent)</h2>
          {past.map(e => (
            <div key={e.id} className="rounded-xl border border-zinc-800/50 p-4 opacity-50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-zinc-400">{e.ticker}</span>
                  {e.timing && <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-500">{e.timing}</span>}
                  {e.isDirect && <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-500">Direct</span>}
                </div>
                <span className="text-sm text-zinc-600">{format(e.date, 'MMM d, yyyy')} — {Math.abs(e.days)}d ago</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
