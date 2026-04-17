'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computeHoldingMetrics, fmt, cn } from '@/lib/utils'
import type { Holding, WealthPortfolio, WealthPortfolioHolding, BucketTarget } from '@/lib/types'
import { Shield, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface RuleStatus { label: string; subLabel?: string; pass: boolean; warn?: boolean; info?: boolean; detail: string; tickers?: string[] }

export default function RulesPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [wps, setWps] = useState<(WealthPortfolio & { holdings: WealthPortfolioHolding[] })[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: h }, { data: wp }, { data: wph }, { data: bt }] = await Promise.all([
        supabase.from('holdings').select('*').eq('is_active', true),
        supabase.from('wealth_portfolios').select('*').eq('is_active', true),
        supabase.from('wealth_portfolio_holdings').select('*'),
        supabase.from('bucket_targets').select('*').order('sort_order'),
      ])
      setHoldings(h || [])
      setWps((wp || []).map(w => ({ ...w, holdings: (wph || []).filter(x => x.portfolio_id === w.id) })))
      setBucketTargets(bt || [])
      setLoading(false)
    }
    load()
  }, [])

  const wealthTotal = wps.reduce((s, p) => s + p.total_value, 0)
  const directTotal = holdings.reduce((s, h) => s + h.shares * h.current_price, 0)
  const totalValue = directTotal + wealthTotal
  const withMetrics = holdings.map(h => computeHoldingMetrics(h, totalValue))

  const etfVal = holdings.filter(h => h.bucket === 'CORE_ETF').reduce((s, h) => s + h.shares * h.current_price, 0)
  const etfPct = totalValue > 0 ? (etfVal / totalValue) * 100 : 0
  const cashVal = holdings.filter(h => h.bucket === 'CASH').reduce((s, h) => s + h.shares * h.current_price, 0)
  const cashPct = totalValue > 0 ? (cashVal / totalValue) * 100 : 0
  const cryptoVal = holdings.filter(h => h.asset_class === 'CRYPTO').reduce((s, h) => s + h.shares * h.current_price, 0)
  const cryptoPct = totalValue > 0 ? (cryptoVal / totalValue) * 100 : 0
  const techVal = withMetrics.filter(h => h.sector === 'Technology').reduce((s, h) => s + h.market_value, 0)
  const techPct = totalValue > 0 ? (techVal / totalValue) * 100 : 0
  const overweightStocks = withMetrics.filter(h => h.bucket !== 'CORE_ETF' && h.weight_percent > 7)
  const overweightSpec = withMetrics.filter(h => h.bucket === 'SPECULATIVE' && h.weight_percent > 5)
  const down50 = withMetrics.filter(h => h.pl_percent <= -50)

  const etfBt = bucketTargets.find(b => b.bucket === 'CORE_ETF')
  const etfNeeded = etfBt && etfPct < etfBt.target_min ? ((etfBt.target_min - etfPct) / 100 * totalValue) : 0
  const cashNeeded = cashPct < 5 ? ((5 - cashPct) / 100 * totalValue) : 0

  const rules: RuleStatus[] = [
    {
      label: 'Core ETFs 50-65%',
      pass: etfPct >= 50, warn: etfPct < 50,
      detail: etfPct < 50
        ? `Currently ${fmt(etfPct, 1)}% — need to add ~${fmt(etfNeeded, 0)} to ETFs`
        : etfPct > 65 ? `Currently ${fmt(etfPct, 1)}% — slightly overweight` : `Currently ${fmt(etfPct, 1)}% ✓`,
      tickers: holdings.filter(h => h.bucket === 'CORE_ETF').map(h => h.ticker),
    },
    {
      label: 'Cash buffer 5-10%',
      pass: cashPct >= 5 && cashPct <= 10, warn: cashPct < 5,
      detail: cashPct < 5 ? `Currently ~${fmt(cashPct, 1)}% — need $${fmt(cashNeeded, 0)} cash` : `Currently ${fmt(cashPct, 1)}% ✓`,
    },
    {
      label: 'No single stock >7%',
      pass: overweightStocks.length === 0, warn: overweightStocks.length > 0,
      detail: overweightStocks.length > 0
        ? overweightStocks.map(h => `${h.ticker} at ${fmt(h.weight_percent, 1)}%`).join(', ')
        : 'All positions within cap ✓',
      tickers: overweightStocks.map(h => h.ticker),
    },
    {
      label: 'Tech concentration <40%',
      pass: techPct <= 40, warn: techPct > 40,
      detail: `Tech at ${fmt(techPct, 1)}%${techPct > 40 ? ' — reduce or diversify' : ' ✓'}`,
      tickers: withMetrics.filter(h => h.sector === 'Technology').map(h => h.ticker),
    },
    {
      label: 'Crypto 5-10%',
      pass: cryptoPct >= 5 && cryptoPct <= 10, warn: cryptoPct > 10 || (cryptoPct < 5 && cryptoPct > 0),
      detail: `Currently ${fmt(cryptoPct, 1)}% (target 5-10%)`,
    },
    {
      label: 'No spec position >5%',
      pass: overweightSpec.length === 0, warn: overweightSpec.length > 0,
      detail: overweightSpec.length > 0
        ? `${overweightSpec.map(h => h.ticker).join(', ')} over 5%`
        : 'All spec positions within limit ✓',
    },
    {
      label: 'No position down >50%',
      pass: down50.length === 0, warn: down50.length > 0,
      detail: down50.length > 0
        ? down50.map(h => `${h.ticker} at ${fmt(h.pl_percent, 0)}%`).join(', ')
        : 'No extreme drawdowns ✓',
      tickers: down50.map(h => h.ticker),
    },
    { label: 'Staged entry (not lump sum)', info: true, pass: true, detail: 'Enter at 25-40% of intended size. Scale in on dips.' },
    { label: 'Sell on broken thesis, not price', info: true, pass: true, detail: 'Review DEFT: thesis of crypto treasury yield may be broken.' },
  ]

  function StatusIcon({ rule }: { rule: RuleStatus }) {
    if (rule.info) return <Info size={16} className="text-blue-400 shrink-0" />
    if (rule.pass && !rule.warn) return <CheckCircle size={16} className="text-green-400 shrink-0" />
    if (rule.warn) return <AlertTriangle size={16} className="text-amber-400 shrink-0" />
    return <XCircle size={16} className="text-red-400 shrink-0" />
  }

  function StatusBadge({ rule }: { rule: RuleStatus }) {
    if (rule.info) return <span className="px-2 py-0.5 rounded text-xs bg-blue-400/10 text-blue-400">INFO</span>
    if (rule.pass && !rule.warn) return <span className="px-2 py-0.5 rounded text-xs bg-green-400/10 text-green-400 font-bold">✅ PASS</span>
    if (rule.warn) return <span className="px-2 py-0.5 rounded text-xs bg-amber-400/10 text-amber-400 font-bold">⚠️ WARN</span>
    return <span className="px-2 py-0.5 rounded text-xs bg-red-400/10 text-red-400 font-bold">❌ FAIL</span>
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold">Rules Engine</h1>
          <p className="text-zinc-400 text-sm">Live status of your Investor OS rules</p>
        </div>
      </div>

      {/* Rules table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="font-semibold">Investment Rules Checklist</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {rules.map((rule, i) => (
            <div key={i} className={cn('px-6 py-4 hover:bg-zinc-800/30 transition-colors', !rule.pass && !rule.info ? 'bg-red-900/5' : rule.warn ? 'bg-amber-900/5' : '')}>
              <div className="flex items-start gap-3">
                <StatusIcon rule={rule} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-white">{rule.label}</span>
                    <StatusBadge rule={rule} />
                  </div>
                  <p className={cn('text-sm mt-0.5', !rule.pass && !rule.info ? 'text-red-300' : rule.warn ? 'text-amber-300' : 'text-zinc-400')}>
                    {rule.detail}
                  </p>
                  {rule.tickers && rule.tickers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rule.tickers.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buy rules */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-lg font-bold mb-4 text-green-400">Buy Rules</h2>
          <div className="space-y-3">
            {[
              { title: 'Staged Entry Always', desc: 'Enter at 25-40% of intended position. Scale in on dips or confirmation.' },
              { title: 'Multiple Supports Needed', desc: 'Requires market support + technical setup + fundamental thesis. Not just one.' },
              { title: 'Check Earnings Calendar', desc: 'Never initiate a new position within 14 days of earnings.' },
              { title: 'Never Buy Just On Dip', desc: "A falling price is not a thesis. Understand WHY it's falling first." },
            ].map(r => (
              <div key={r.title} className="p-3 bg-green-400/5 border border-green-400/10 rounded-lg">
                <p className="text-sm font-semibold text-green-300">{r.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sell rules */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-lg font-bold mb-4 text-red-400">Sell Rules</h2>
          <div className="space-y-3">
            {[
              { title: 'Core ETFs: Almost Never Sell', desc: 'These are the foundation. Only sell in extreme rebalancing needs.' },
              { title: 'Quality Stocks: Thesis Only', desc: 'Sell when the fundamental thesis breaks — not on price drops.' },
              { title: 'Speculative: Exit Faster', desc: 'Give less rope on invalidation. These are high-risk by design.' },
              { title: 'Crypto: Cut Weakest Alts First', desc: 'BTC/ETH hold longest. Alts like XRP/SOL exit on first breakdown.' },
            ].map(r => (
              <div key={r.title} className="p-3 bg-red-400/5 border border-red-400/10 rounded-lg">
                <p className="text-sm font-semibold text-red-300">{r.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Position sizing reference */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-lg font-bold mb-4">Position Sizing Quick Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800">{['Type','Max Position','Starter Size','Notes'].map(h => <th key={h} className="text-left px-4 py-2 text-zinc-400 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {[
                { type: 'Core ETF', max: 'No cap', starter: '100% at once OK', note: 'Buy and hold. DCA if large.' },
                { type: 'Quality Stock', max: '7% of portfolio', starter: '25-40% of intended', note: 'Scale in. Review on -30%.' },
                { type: 'Speculative', max: '5% ceiling', starter: '2-4% to start', note: 'Cut fast on invalidation.' },
                { type: 'Crypto (total)', max: '10% of portfolio', starter: 'BTC/ETH first', note: 'Alts max 2-3% each.' },
                { type: 'New Position', max: '25-40% intended size', starter: 'Always staged', note: 'Never all-in on first entry.' },
              ].map(r => (
                <tr key={r.type} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="px-4 py-2.5 font-semibold text-white">{r.type}</td>
                  <td className="px-4 py-2.5 text-amber-300">{r.max}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{r.starter}</td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
