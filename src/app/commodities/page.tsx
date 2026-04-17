'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtCurrency, fmtPercent, fmt, getPlColor, getPlBgColor, cn, AED_USD_RATE } from '@/lib/utils'
import type { Holding } from '@/lib/types'
import { RefreshCw } from 'lucide-react'

export default function CommoditiesPage() {
  const [commodities, setCommodities] = useState<Holding[]>([])
  const [allHoldings, setAllHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('holdings').select('*').eq('is_active', true)
    const all = data || []
    setAllHoldings(all)
    setCommodities(all.filter(h => h.asset_class === 'COMMODITY'))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await fetch('/api/refresh-prices', { method: 'POST' })
    await load()
    setRefreshing(false)
  }

  const totalPortfolioValue = allHoldings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalCommodityValue = commodities.reduce((s, h) => s + h.shares * h.current_price, 0)
  const commodityPct = totalPortfolioValue > 0 ? (totalCommodityValue / totalPortfolioValue) * 100 : 0

  const COMMODITY_META: Record<string, { emoji: string; unit: string; color: string; desc: string }> = {
    GOLD: { emoji: '🥇', unit: 'oz', color: '#f59e0b', desc: 'Store of value / inflation hedge' },
    SILVER: { emoji: '🥈', unit: 'oz', color: '#94a3b8', desc: 'Industrial metal / monetary metal' },
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commodities</h1>
          <p className="text-zinc-400 text-sm">Precious metals portfolio</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Allocation status */}
      <div className={cn('p-4 rounded-xl border', commodityPct >= 5 && commodityPct <= 15 ? 'bg-green-400/5 border-green-400/20' : commodityPct < 5 ? 'bg-amber-400/5 border-amber-400/20' : 'bg-amber-400/5 border-amber-400/20')}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-300">Commodities Allocation</p>
            <p className="text-xs text-zinc-500 mt-0.5">Target: 5-15% of total portfolio</p>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-bold', commodityPct >= 5 && commodityPct <= 15 ? 'text-green-400' : 'text-amber-400')}>
              {fmt(commodityPct, 1)}%
            </p>
            <p className="text-xs text-zinc-500">{fmtCurrency(totalCommodityValue)}</p>
          </div>
        </div>
        <div className="mt-3 w-full bg-zinc-800 rounded-full h-2">
          <div className={cn('h-full rounded-full transition-all', commodityPct >= 5 && commodityPct <= 15 ? 'bg-green-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, (commodityPct / 20) * 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%</span>
        </div>
      </div>

      {/* Commodity cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {commodities.map(h => {
          const meta = COMMODITY_META[h.ticker] || { emoji: '🔶', unit: 'oz', color: '#6b7280', desc: '' }
          const value = h.shares * h.current_price
          const cost = h.shares * h.avg_cost_per_share
          const pl = value - cost
          const plPct = cost > 0 ? (pl / cost) * 100 : 0
          const portfolioWeight = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0
          const priceChangePct = h.avg_cost_per_share > 0 ? ((h.current_price - h.avg_cost_per_share) / h.avg_cost_per_share) * 100 : 0
          return (
            <div key={h.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{meta.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{h.name}</h2>
                    <p className="text-xs text-zinc-500">{meta.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{fmtCurrency(value)}</p>
                  <p className="text-sm text-zinc-400">AED {fmt(value * AED_USD_RATE, 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: `Quantity (${meta.unit})`, value: fmt(h.shares, 5) },
                  { label: `Price per ${meta.unit}`, value: fmtCurrency(h.current_price) },
                  { label: `Avg Cost per ${meta.unit}`, value: fmtCurrency(h.avg_cost_per_share) },
                  { label: 'Portfolio Weight', value: `${fmt(portfolioWeight, 2)}%` },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">{s.label}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Unrealized P/L</p>
                  <p className={cn('text-lg font-bold', getPlColor(pl))}>{pl >= 0 ? '+' : ''}{fmtCurrency(pl)}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded', getPlBgColor(plPct))}>{fmtPercent(plPct)}</span>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">From cost basis</p>
                  <p className={cn('text-lg font-bold', getPlColor(priceChangePct))}>
                    {priceChangePct >= 0 ? '+' : ''}{fmt(priceChangePct, 1)}%
                  </p>
                  <p className="text-xs text-zinc-500">{fmtCurrency(h.avg_cost_per_share)} → {fmtCurrency(h.current_price)}</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg text-xs text-zinc-400">
                <p className="font-medium text-zinc-300 mb-1">Context</p>
                {h.ticker === 'GOLD' && 'Gold historically performs well during inflation and market uncertainty. Key safe-haven asset.'}
                {h.ticker === 'SILVER' && 'Silver has dual nature — precious metal + industrial uses. Higher volatility than gold.'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h3 className="font-semibold mb-3">Commodities Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-zinc-500 text-xs">Total Value</p><p className="font-bold text-white">{fmtCurrency(totalCommodityValue)}</p></div>
          <div><p className="text-zinc-500 text-xs">Total (AED)</p><p className="font-bold text-white">AED {fmt(totalCommodityValue * AED_USD_RATE, 0)}</p></div>
          <div><p className="text-zinc-500 text-xs">Total P/L</p>
            <p className={cn('font-bold', getPlColor(commodities.reduce((s, h) => s + (h.shares * h.current_price - h.shares * h.avg_cost_per_share), 0)))}>
              {fmtCurrency(commodities.reduce((s, h) => s + (h.shares * h.current_price - h.shares * h.avg_cost_per_share), 0))}
            </p>
          </div>
          <div><p className="text-zinc-500 text-xs">Portfolio %</p>
            <p className={cn('font-bold', commodityPct >= 5 && commodityPct <= 15 ? 'text-green-400' : 'text-amber-400')}>
              {fmt(commodityPct, 1)}% {commodityPct >= 5 && commodityPct <= 15 ? '✓' : '⚠'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
