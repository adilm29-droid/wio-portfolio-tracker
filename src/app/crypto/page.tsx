'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtCurrency, fmtPercent, fmt, getPlColor, getPlBgColor, cn, AED_USD_RATE } from '@/lib/utils'
import type { Holding } from '@/lib/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

const CRYPTO_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', XRP: '#00aae4', SOL: '#9945ff',
}

export default function CryptoPage() {
  const [cryptos, setCryptos] = useState<Holding[]>([])
  const [allHoldings, setAllHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('holdings').select('*').eq('is_active', true)
    const all = data || []
    setAllHoldings(all)
    setCryptos(all.filter(h => h.asset_class === 'CRYPTO'))
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
  const totalCryptoValue = cryptos.reduce((s, h) => s + h.shares * h.current_price, 0)
  const btcEthValue = cryptos.filter(h => ['BTC','ETH'].includes(h.ticker)).reduce((s, h) => s + h.shares * h.current_price, 0)
  const btcEthPct = totalCryptoValue > 0 ? (btcEthValue / totalCryptoValue) * 100 : 0

  const pieData = cryptos.map(h => ({
    name: h.ticker,
    value: h.shares * h.current_price,
  }))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crypto</h1>
          <p className="text-zinc-400 text-sm">Digital asset holdings</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh Prices
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Crypto Value', value: fmtCurrency(totalCryptoValue) },
          { label: 'Total (AED)', value: `AED ${fmt(totalCryptoValue * AED_USD_RATE, 0)}` },
          { label: '% of Portfolio', value: `${fmt(totalPortfolioValue > 0 ? (totalCryptoValue / totalPortfolioValue) * 100 : 0, 1)}%` },
          { label: 'BTC + ETH %', value: `${fmt(btcEthPct, 1)}%`, note: btcEthPct >= 70 ? 'green' : btcEthPct >= 60 ? 'amber' : 'red' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn('text-xl font-bold', s.note === 'green' ? 'text-green-400' : s.note === 'amber' ? 'text-amber-400' : s.note === 'red' ? 'text-red-400' : 'text-white')}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Crypto cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cryptos.map(h => {
          const value = h.shares * h.current_price
          const cost = h.shares * h.avg_cost_per_share
          const pl = value - cost
          const plPct = cost > 0 ? (pl / cost) * 100 : 0
          const cryptoWeight = totalCryptoValue > 0 ? (value / totalCryptoValue) * 100 : 0
          const portfolioWeight = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0
          const color = CRYPTO_COLORS[h.ticker] || '#8b5cf6'
          return (
            <div key={h.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">{h.ticker}</h3>
                    <p className="text-xs text-zinc-500">{h.name}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${color}20`, color }}>
                    {h.ticker[0]}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Quantity</span>
                    <span className="text-sm text-white font-medium">{fmt(h.shares, 5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Price</span>
                    <span className="text-sm text-white font-medium">{fmtCurrency(h.current_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">USD Value</span>
                    <span className="text-sm font-bold text-white">{fmtCurrency(value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">AED Value</span>
                    <span className="text-sm text-zinc-300">AED {fmt(value * AED_USD_RATE, 0)}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2 flex justify-between">
                    <span className="text-xs text-zinc-500">P/L</span>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', getPlColor(pl))}>{pl >= 0 ? '+' : ''}{fmtCurrency(pl)}</p>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded', getPlBgColor(plPct))}>{fmtPercent(plPct)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Crypto weight</span>
                    <span className="text-xs text-zinc-300">{fmt(cryptoWeight, 1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Portfolio weight</span>
                    <span className="text-xs text-zinc-300">{fmt(portfolioWeight, 1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crypto pie chart */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-lg font-bold mb-4">Crypto Allocation</h2>
          <div className="flex items-center gap-6">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={CRYPTO_COLORS[entry.name] || '#8b5cf6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {cryptos.map(h => {
                const v = h.shares * h.current_price
                const pct = totalCryptoValue > 0 ? (v / totalCryptoValue) * 100 : 0
                const color = CRYPTO_COLORS[h.ticker] || '#8b5cf6'
                return (
                  <div key={h.ticker}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-white">{h.ticker}</span>
                      </div>
                      <span className="text-sm text-zinc-300">{fmt(pct, 1)}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-500">
                Target: 70% BTC+ETH, 20% large-cap, 10% spec
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg border" style={{ borderColor: btcEthPct >= 70 ? '#16a34a40' : '#d9770640', background: btcEthPct >= 70 ? '#16a34a10' : '#d9770610' }}>
            <p className="text-xs" style={{ color: btcEthPct >= 70 ? '#4ade80' : '#fbbf24' }}>
              {btcEthPct >= 70 ? '✓' : '⚠'} BTC + ETH: {fmt(btcEthPct, 1)}% (Target: ≥70%)
            </p>
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-lg font-bold mb-4">Market Sentiment</h2>
          <div className="space-y-3">
            <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-amber-400" />
                <span className="font-semibold text-amber-400">BTC — Bearish</span>
              </div>
              <p className="text-sm text-zinc-300">BTC at {fmtCurrency(cryptos.find(h => h.ticker === 'BTC')?.current_price || 74786)} — Below estimated 200-day MA of ~$77,000</p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Portfolio target (5-10%)', actual: totalPortfolioValue > 0 ? (totalCryptoValue / totalPortfolioValue) * 100 : 0, min: 5, max: 10 },
              ].map(rule => {
                const ok = rule.actual >= rule.min && rule.actual <= rule.max
                const warn = rule.actual > rule.max * 1.5 || rule.actual < rule.min * 0.5
                return (
                  <div key={rule.label} className={cn('p-3 rounded-lg border', ok ? 'bg-green-400/5 border-green-400/20' : warn ? 'bg-red-400/5 border-red-400/20' : 'bg-amber-400/5 border-amber-400/20')}>
                    <p className={cn('text-xs font-medium', ok ? 'text-green-400' : warn ? 'text-red-400' : 'text-amber-400')}>
                      {ok ? '✓' : warn ? '✗' : '⚠'} {rule.label}
                    </p>
                    <p className="text-zinc-400 text-xs mt-0.5">Currently {fmt(rule.actual, 1)}%</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
