'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtCurrency, fmtPercent, fmt, getPlColor, cn } from '@/lib/utils'
import type { WealthPortfolio, WealthPortfolioHolding, Holding } from '@/lib/types'
import { AlertTriangle, Edit2, X, Check, Shield } from 'lucide-react'

export default function WealthPortfoliosPage() {
  const [portfolios, setPortfolios] = useState<(WealthPortfolio & { holdings: WealthPortfolioHolding[] })[]>([])
  const [directHoldings, setDirectHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: wps }, { data: wph }, { data: dh }] = await Promise.all([
      supabase.from('wealth_portfolios').select('*').eq('is_active', true).order('created_at'),
      supabase.from('wealth_portfolio_holdings').select('*'),
      supabase.from('holdings').select('*').eq('is_active', true),
    ])
    const enriched = (wps || []).map(wp => ({
      ...wp,
      holdings: (wph || []).filter(h => h.portfolio_id === wp.id),
    }))
    setPortfolios(enriched)
    setDirectHoldings(dh || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalWealthValue = portfolios.reduce((s, p) => s + p.total_value, 0)
  const totalDirectValue = directHoldings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const grandTotal = totalWealthValue + totalDirectValue

  const directTickers = new Set(directHoldings.map(h => h.ticker))

  // Overlap analysis
  const overlapMap: Record<string, { directValue: number; wealthValue: number; portfolios: string[] }> = {}
  portfolios.forEach(p => {
    p.holdings.forEach(h => {
      if (directTickers.has(h.ticker)) {
        if (!overlapMap[h.ticker]) {
          const dh = directHoldings.find(x => x.ticker === h.ticker)
          overlapMap[h.ticker] = { directValue: dh ? dh.shares * dh.current_price : 0, wealthValue: 0, portfolios: [] }
        }
        overlapMap[h.ticker].wealthValue += h.value
        if (!overlapMap[h.ticker].portfolios.includes(p.name)) overlapMap[h.ticker].portfolios.push(p.name)
      }
    })
  })

  async function saveValue(id: string) {
    setSaving(true)
    await supabase.from('wealth_portfolios').update({ total_value: parseFloat(editValue), updated_at: new Date().toISOString() }).eq('id', id)
    setEditId(null); setEditValue('')
    await load()
    setSaving(false)
  }

  const SECTOR_COLORS: Record<string, string> = {
    Technology: '#3b82f6', 'Consumer Discretionary': '#f59e0b', Healthcare: '#22c55e',
    Financials: '#8b5cf6', Energy: '#ef4444', Materials: '#6b7280', Industrials: '#06b6d4', Other: '#71717a',
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Wealth Portfolios</h1>
        <p className="text-zinc-400 text-sm">Wio-managed thematic Shariah portfolios</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">Total Wealth Value</p>
          <p className="text-2xl font-bold text-white">{fmtCurrency(totalWealthValue)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">Portfolios</p>
          <p className="text-2xl font-bold text-white">{portfolios.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500">% of Grand Total</p>
          <p className="text-2xl font-bold text-white">{fmt(grandTotal > 0 ? (totalWealthValue / grandTotal) * 100 : 0, 1)}%</p>
        </div>
      </div>

      {/* Portfolio Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {portfolios.map(p => {
          const pl = p.total_value - p.total_cost
          const plPct = p.total_cost > 0 ? (pl / p.total_cost) * 100 : 0
          const overlapTickers = p.holdings.filter(h => directTickers.has(h.ticker))
          return (
            <div key={p.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    {p.is_shariah && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                        <Shield size={10} /> Shariah
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {editId === p.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-sm">$</span>
                        <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-32 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500" />
                        <button onClick={() => saveValue(p.id)} disabled={saving} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check size={14} /></button>
                        <button onClick={() => setEditId(null)} className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">{fmtCurrency(p.total_value)}</span>
                        <button onClick={() => { setEditId(p.id); setEditValue(p.total_value.toString()) }} className="p-1 text-zinc-500 hover:text-blue-400 transition-colors"><Edit2 size={12} /></button>
                      </div>
                    )}
                    <span className={cn('text-sm font-medium', getPlColor(pl))}>
                      {pl >= 0 ? '+' : ''}{fmtCurrency(pl)} ({fmtPercent(plPct)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Holdings table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-1.5 text-zinc-500 font-medium">Ticker</th>
                      <th className="text-left py-1.5 text-zinc-500 font-medium">Name</th>
                      <th className="text-right py-1.5 text-zinc-500 font-medium">Shares</th>
                      <th className="text-right py-1.5 text-zinc-500 font-medium">Value</th>
                      <th className="text-right py-1.5 text-zinc-500 font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.holdings.map(h => {
                      const isOverlap = directTickers.has(h.ticker)
                      return (
                        <tr key={h.id} className="border-b border-zinc-800/40">
                          <td className="py-1.5">
                            <span className="font-bold text-white">{h.ticker}</span>
                            {isOverlap && <span className="ml-1 px-1 py-0.5 rounded text-[10px] bg-amber-400/10 text-amber-400">⚠ Direct</span>}
                          </td>
                          <td className="py-1.5 text-zinc-400 max-w-[120px] truncate">{h.name}</td>
                          <td className="py-1.5 text-zinc-300 text-right">{fmt(h.shares, 2)}</td>
                          <td className="py-1.5 text-zinc-300 text-right">{fmtCurrency(h.value)}</td>
                          <td className="py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-12 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, h.weight_percent)}%` }} />
                              </div>
                              <span className="text-zinc-400">{fmt(h.weight_percent, 1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Overlap warnings */}
              {overlapTickers.length > 0 && (
                <div className="mt-3 p-2 bg-amber-400/5 border border-amber-400/20 rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">Overlaps with direct holdings</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {overlapTickers.map(h => (
                      <span key={h.ticker} className="px-1.5 py-0.5 bg-amber-400/10 text-amber-300 rounded text-xs">{h.ticker}</span>
                    ))}
                  </div>
                </div>
              )}

              {p.cash_balance > 0 && (
                <p className="mt-2 text-xs text-zinc-500">Cash balance: {fmtCurrency(p.cash_balance)}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Overlap Analysis */}
      {Object.keys(overlapMap).length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-amber-800/30 p-5">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" /> Ticker Overlap Analysis
          </h2>
          <p className="text-zinc-400 text-sm mb-4">Tickers held both directly and in wealth portfolios</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Ticker', 'Direct Value', 'Wealth Portfolio Value', 'Combined', 'Portfolio(s)', 'Weight %'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-zinc-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(overlapMap).map(([ticker, data]) => {
                  const combined = data.directValue + data.wealthValue
                  const weight = grandTotal > 0 ? (combined / grandTotal) * 100 : 0
                  return (
                    <tr key={ticker} className="border-b border-zinc-800/50">
                      <td className="px-4 py-2 font-bold text-white">{ticker}</td>
                      <td className="px-4 py-2 text-zinc-300">{fmtCurrency(data.directValue)}</td>
                      <td className="px-4 py-2 text-zinc-300">{fmtCurrency(data.wealthValue)}</td>
                      <td className="px-4 py-2 font-semibold text-white">{fmtCurrency(combined)}</td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">{data.portfolios.join(', ')}</td>
                      <td className="px-4 py-2">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', weight > 7 ? 'bg-red-400/20 text-red-400' : 'bg-zinc-700 text-zinc-300')}>
                          {fmt(weight, 1)}%{weight > 7 ? ' ⚠' : ''}
                        </span>
                      </td>
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
