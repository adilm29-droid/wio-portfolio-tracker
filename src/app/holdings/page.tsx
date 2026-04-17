'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { computeHoldingMetrics, fmtCurrency, fmtPercent, fmt, getPlColor, getPlBgColor, getActionSignalColor, cn } from '@/lib/utils'
import type { Holding, HoldingWithMetrics, BucketTarget, BucketType, AssetClass } from '@/lib/types'
import { Plus, RefreshCw, Download, Search, ChevronUp, ChevronDown, Pencil, Trash2, X, Check } from 'lucide-react'

const BUCKETS: BucketType[] = ['CORE_ETF', 'QUALITY_STOCK', 'SPECULATIVE', 'COMMODITY', 'CRYPTO', 'CASH']
const ASSET_CLASSES: AssetClass[] = ['US_STOCK', 'ETF', 'CRYPTO', 'COMMODITY']
const BUCKET_LABELS: Record<BucketType, string> = {
  CORE_ETF: 'Core ETF', QUALITY_STOCK: 'Quality Stock', SPECULATIVE: 'Speculative',
  COMMODITY: 'Commodity', CRYPTO: 'Crypto', CASH: 'Cash',
}

type SortKey = keyof HoldingWithMetrics
type SortDir = 'asc' | 'desc'

const emptyForm = {
  ticker: '', name: '', asset_class: 'US_STOCK' as AssetClass, bucket: 'QUALITY_STOCK' as BucketType,
  shares: '', avg_cost_per_share: '', current_price: '', sector: '', thesis: '', invalidation: '',
}

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterBucket, setFilterBucket] = useState('')
  const [filterAsset, setFilterAsset] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('market_value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Holding>>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: h }, { data: bt }] = await Promise.all([
      supabase.from('holdings').select('*').eq('is_active', true).order('created_at'),
      supabase.from('bucket_targets').select('*').order('sort_order'),
    ])
    const allH = h || []
    const total = allH.reduce((s, x) => s + x.shares * x.current_price, 0)
    setHoldings(allH.map(x => computeHoldingMetrics(x, total)))
    setBucketTargets(bt || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalValue = holdings.reduce((s, h) => s + h.market_value, 0)
  const totalCost = holdings.reduce((s, h) => s + h.cost_basis, 0)
  const totalPL = totalValue - totalCost

  const filtered = useMemo(() => {
    let r = [...holdings]
    if (search) r = r.filter(h => h.ticker.toLowerCase().includes(search.toLowerCase()) || h.name.toLowerCase().includes(search.toLowerCase()))
    if (filterBucket) r = r.filter(h => h.bucket === filterBucket)
    if (filterAsset) r = r.filter(h => h.asset_class === filterAsset)
    r.sort((a, b) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any
      if (av == null) return 1; if (bv == null) return -1
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return r
  }, [holdings, search, filterBucket, filterAsset, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="opacity-20" size={12} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  async function handleAdd() {
    setSaving(true)
    const { error } = await supabase.from('holdings').insert({
      ticker: form.ticker.toUpperCase(),
      name: form.name,
      asset_class: form.asset_class,
      bucket: form.bucket,
      shares: parseFloat(form.shares) || 0,
      avg_cost_per_share: parseFloat(form.avg_cost_per_share) || 0,
      current_price: parseFloat(form.current_price) || 0,
      sector: form.sector || null,
      thesis: form.thesis || null,
      invalidation: form.invalidation || null,
    })
    if (!error) { setShowAdd(false); setForm({ ...emptyForm }); await load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this holding?')) return
    await supabase.from('holdings').update({ is_active: false }).eq('id', id)
    await load()
  }

  async function handleEditSave(id: string) {
    setSaving(true)
    await supabase.from('holdings').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id)
    setEditId(null); setEditForm({})
    await load()
    setSaving(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetch('/api/refresh-prices', { method: 'POST' })
    await load()
    setRefreshing(false)
  }

  function exportCSV() {
    const cols = ['ticker','name','asset_class','bucket','shares','avg_cost_per_share','current_price','market_value','pl_dollars','pl_percent','weight_percent','sector']
    const rows = filtered.map(h => cols.map(c => (h as any)[c] ?? '').join(','))
    const csv = [cols.join(','), ...rows].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'holdings.csv'; a.click()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Holdings</h1>
          <p className="text-zinc-400 text-sm">{holdings.length} active positions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
            <Plus size={14} /> Add Holding
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Holdings', value: holdings.length.toString() },
          { label: 'Total Value', value: fmtCurrency(totalValue) },
          { label: 'Total P/L', value: `${fmtCurrency(totalPL)} (${fmtPercent(totalCost > 0 ? (totalPL/totalCost)*100 : 0)})`, colored: true, positive: totalPL >= 0 },
          { label: 'Positions', value: `${holdings.filter(h=>h.pl_percent>=0).length} up / ${holdings.filter(h=>h.pl_percent<0).length} down` },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn('text-lg font-bold', s.colored ? (s.positive ? 'text-green-400' : 'text-red-400') : 'text-white')}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticker or name..." className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
        </div>
        <select value={filterBucket} onChange={e => setFilterBucket(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All Buckets</option>
          {BUCKETS.map(b => <option key={b} value={b}>{BUCKET_LABELS[b]}</option>)}
        </select>
        <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All Types</option>
          {ASSET_CLASSES.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>
        {(search || filterBucket || filterAsset) && (
          <button onClick={() => { setSearch(''); setFilterBucket(''); setFilterAsset('') }} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {[
                { key: 'ticker', label: 'Ticker' }, { key: 'name', label: 'Name' },
                { key: 'bucket', label: 'Bucket' }, { key: 'shares', label: 'Shares' },
                { key: 'avg_cost_per_share', label: 'Avg Cost' }, { key: 'current_price', label: 'Price' },
                { key: 'market_value', label: 'Value' }, { key: 'pl_dollars', label: 'P/L $' },
                { key: 'pl_percent', label: 'P/L %' }, { key: 'weight_percent', label: 'Weight' },
                { key: 'action_signal', label: 'Signal' }, { key: 'days_held', label: 'Days' },
                { key: 'actions', label: '' },
              ].map(col => (
                <th key={col.key} onClick={() => col.key !== 'actions' && toggleSort(col.key as SortKey)}
                  className={cn('text-left px-4 py-3 text-zinc-400 font-medium whitespace-nowrap', col.key !== 'actions' && 'cursor-pointer hover:text-white select-none')}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.key !== 'actions' && col.key !== 'name' && col.key !== 'bucket' && <SortIcon col={col.key as SortKey} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => (
              <tr key={h.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                {editId === h.id ? (
                  <>
                    <td className="px-4 py-2"><input value={editForm.ticker || h.ticker} onChange={e => setEditForm(f => ({...f, ticker: e.target.value}))} className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs" /></td>
                    <td className="px-4 py-2"><input value={editForm.name || h.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="w-32 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs" /></td>
                    <td className="px-4 py-2"><select value={editForm.bucket || h.bucket} onChange={e => setEditForm(f => ({...f, bucket: e.target.value as BucketType}))} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs">{BUCKETS.map(b => <option key={b} value={b}>{BUCKET_LABELS[b]}</option>)}</select></td>
                    <td className="px-4 py-2"><input type="number" value={editForm.shares ?? h.shares} onChange={e => setEditForm(f => ({...f, shares: parseFloat(e.target.value)}))} className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs" /></td>
                    <td className="px-4 py-2"><input type="number" value={editForm.avg_cost_per_share ?? h.avg_cost_per_share} onChange={e => setEditForm(f => ({...f, avg_cost_per_share: parseFloat(e.target.value)}))} className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs" /></td>
                    <td className="px-4 py-2"><input type="number" value={editForm.current_price ?? h.current_price} onChange={e => setEditForm(f => ({...f, current_price: parseFloat(e.target.value)}))} className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs" /></td>
                    <td colSpan={6} className="px-4 py-2 text-zinc-400 text-xs">Save to recalculate</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSave(h.id)} disabled={saving} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check size={14} /></button>
                        <button onClick={() => { setEditId(null); setEditForm({}) }} className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"><X size={14} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-bold text-white">{h.ticker}</td>
                    <td className="px-4 py-3 text-zinc-300 max-w-[160px] truncate">{h.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-300">{BUCKET_LABELS[h.bucket as BucketType]}</span></td>
                    <td className="px-4 py-3 text-zinc-300">{fmt(h.shares, 4)}</td>
                    <td className="px-4 py-3 text-zinc-300">{fmtCurrency(h.avg_cost_per_share)}</td>
                    <td className="px-4 py-3 text-white font-medium">{fmtCurrency(h.current_price)}</td>
                    <td className="px-4 py-3 text-white font-semibold">{fmtCurrency(h.market_value)}</td>
                    <td className={cn('px-4 py-3 font-medium', getPlColor(h.pl_dollars))}>{h.pl_dollars >= 0 ? '+' : ''}{fmtCurrency(h.pl_dollars)}</td>
                    <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', getPlBgColor(h.pl_percent))}>{fmtPercent(h.pl_percent)}</span></td>
                    <td className="px-4 py-3 text-zinc-300">{fmt(h.weight_percent, 1)}%</td>
                    <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', getActionSignalColor(h.action_signal))}>{h.action_signal}</span></td>
                    <td className="px-4 py-3 text-zinc-400">{h.days_held}d</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditId(h.id); setEditForm({}) }} className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(h.id)} className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-zinc-500">No holdings found</div>}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Holding</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'ticker', label: 'Ticker*', placeholder: 'AMD' },
                { key: 'name', label: 'Name*', placeholder: 'Advanced Micro Devices' },
              ].map(f => (
                <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-zinc-400 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(x => ({...x, [f.key]: e.target.value}))} placeholder={f.placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Asset Class</label>
                <select value={form.asset_class} onChange={e => setForm(x => ({...x, asset_class: e.target.value as AssetClass}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {ASSET_CLASSES.map(a => <option key={a} value={a}>{a.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Bucket</label>
                <select value={form.bucket} onChange={e => setForm(x => ({...x, bucket: e.target.value as BucketType}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {BUCKETS.map(b => <option key={b} value={b}>{BUCKET_LABELS[b]}</option>)}
                </select>
              </div>
              {[
                { key: 'shares', label: 'Shares*', placeholder: '10' },
                { key: 'avg_cost_per_share', label: 'Avg Cost*', placeholder: '150.00' },
                { key: 'current_price', label: 'Current Price', placeholder: '175.00' },
                { key: 'sector', label: 'Sector', placeholder: 'Technology' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-zinc-400 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(x => ({...x, [f.key]: e.target.value}))} placeholder={f.placeholder} type={['shares','avg_cost_per_share','current_price'].includes(f.key) ? 'number' : 'text'} step="any" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Thesis</label>
                <textarea value={form.thesis} onChange={e => setForm(x => ({...x, thesis: e.target.value}))} rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Invalidation</label>
                <textarea value={form.invalidation} onChange={e => setForm(x => ({...x, invalidation: e.target.value}))} rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.ticker || !form.name || !form.shares} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Holding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
