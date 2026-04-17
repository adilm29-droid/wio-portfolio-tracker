'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtCurrency, fmt, cn } from '@/lib/utils'
import type { TradeJournal } from '@/lib/types'
import { Plus, X, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const ACTION_COLORS: Record<string, string> = {
  BUY: 'bg-green-400/20 text-green-400',
  SELL: 'bg-red-400/20 text-red-400',
  ADD: 'bg-blue-400/20 text-blue-400',
  TRIM: 'bg-amber-400/20 text-amber-400',
  EXIT: 'bg-zinc-600/40 text-zinc-400',
}
const OUTCOME_COLORS: Record<string, string> = {
  WIN: 'bg-green-400/20 text-green-400',
  LOSS: 'bg-red-400/20 text-red-400',
  BREAKEVEN: 'bg-zinc-600/40 text-zinc-400',
}
const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: 'bg-green-400/10 text-green-400',
  MEDIUM: 'bg-amber-400/10 text-amber-400',
  LOW: 'bg-red-400/10 text-red-400',
}

const emptyForm = {
  trade_date: new Date().toISOString().slice(0, 16),
  ticker: '', name: '', action: 'BUY', shares: '', price: '',
  thesis: '', invalidation: '', confidence: '' as any, outcome: '' as any,
  notes: '', lesson: '',
}

export default function JournalPage() {
  const [entries, setEntries] = useState<TradeJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [filterTicker, setFilterTicker] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')

  async function load() {
    const { data } = await supabase.from('trade_journal').select('*').order('trade_date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let r = [...entries]
    if (filterTicker) r = r.filter(e => e.ticker.toLowerCase().includes(filterTicker.toLowerCase()))
    if (filterAction) r = r.filter(e => e.action === filterAction)
    if (filterOutcome) r = r.filter(e => e.outcome === filterOutcome)
    return r
  }, [entries, filterTicker, filterAction, filterOutcome])

  const withOutcome = entries.filter(e => e.outcome)
  const wins = withOutcome.filter(e => e.outcome === 'WIN').length
  const winRate = withOutcome.length > 0 ? (wins / withOutcome.length) * 100 : 0
  const totalTrades = entries.length

  async function handleAdd() {
    setSaving(true)
    const { error } = await supabase.from('trade_journal').insert({
      trade_date: form.trade_date ? new Date(form.trade_date).toISOString() : new Date().toISOString(),
      ticker: form.ticker.toUpperCase(),
      name: form.name || null,
      action: form.action,
      shares: parseFloat(form.shares) || 0,
      price: parseFloat(form.price) || 0,
      thesis: form.thesis || null,
      invalidation: form.invalidation || null,
      confidence: form.confidence || null,
      outcome: form.outcome || null,
      notes: form.notes || null,
      lesson: form.lesson || null,
    })
    if (!error) { setShowAdd(false); setForm({ ...emptyForm }); await load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete journal entry?')) return
    await supabase.from('trade_journal').delete().eq('id', id)
    await load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade Journal</h1>
          <p className="text-zinc-400 text-sm">Every trade logged for learning</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Log Trade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: totalTrades.toString() },
          { label: 'Win Rate', value: `${fmt(winRate, 1)}%`, colored: true, positive: winRate >= 50 },
          { label: 'Trades with Outcome', value: `${withOutcome.length} / ${totalTrades}` },
          { label: 'Wins / Losses', value: `${wins}W / ${withOutcome.length - wins}L` },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={cn('text-xl font-bold', s.colored ? (s.positive ? 'text-green-400' : 'text-red-400') : 'text-white')}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-zinc-500" />
        <input value={filterTicker} onChange={e => setFilterTicker(e.target.value)} placeholder="Filter by ticker..." className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-40" />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All Actions</option>
          {['BUY','SELL','ADD','TRIM','EXIT'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All Outcomes</option>
          {['WIN','LOSS','BREAKEVEN'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {(filterTicker || filterAction || filterOutcome) && (
          <button onClick={() => { setFilterTicker(''); setFilterAction(''); setFilterOutcome('') }} className="px-2 py-1.5 text-xs text-zinc-400 hover:text-white flex items-center gap-1"><X size={12} /> Clear</button>
        )}
        <span className="ml-auto text-xs text-zinc-500">{filtered.length} entries</span>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {filtered.map(e => (
          <div key={e.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <span className="font-bold text-white text-lg">{e.ticker}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-bold', ACTION_COLORS[e.action])}>{e.action}</span>
                {e.confidence && <span className={cn('px-2 py-0.5 rounded text-xs', CONFIDENCE_COLORS[e.confidence])}>{e.confidence}</span>}
                {e.outcome && <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', OUTCOME_COLORS[e.outcome])}>{e.outcome}</span>}
                <span className="text-zinc-400 text-sm">{fmt(e.shares, 4)} shares @ {fmtCurrency(e.price)}</span>
                <span className="font-semibold text-white">{fmtCurrency(e.shares * e.price)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-500">{format(parseISO(e.trade_date), 'MMM d, yyyy')}</span>
                <button onClick={() => handleDelete(e.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors"><X size={14} /></button>
              </div>
            </div>
            {e.name && <p className="text-sm text-zinc-400 mt-1">{e.name}</p>}
            {e.thesis && <div className="mt-2 p-2 bg-zinc-800/50 rounded-lg"><p className="text-xs text-zinc-500 mb-0.5">Thesis</p><p className="text-sm text-zinc-300">{e.thesis}</p></div>}
            {e.invalidation && <div className="mt-2 p-2 bg-zinc-800/50 rounded-lg"><p className="text-xs text-zinc-500 mb-0.5">Invalidation</p><p className="text-sm text-zinc-300">{e.invalidation}</p></div>}
            {e.notes && <p className="text-xs text-zinc-500 mt-2">{e.notes}</p>}
            {e.lesson && <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/30 rounded-lg"><p className="text-xs text-blue-400 mb-0.5">Lesson Learned</p><p className="text-sm text-blue-200">{e.lesson}</p></div>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-2">📓</p>
            <p>No trades logged yet. Every trade is a lesson.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Log Trade</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Date & Time</label>
                <input type="datetime-local" value={form.trade_date} onChange={e => setForm(x => ({...x, trade_date: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              {[{k:'ticker',l:'Ticker*',p:'AMD'},{k:'name',l:'Name',p:'Advanced Micro Devices'}].map(f => (
                <div key={f.k}><label className="block text-xs text-zinc-400 mb-1">{f.l}</label><input value={(form as any)[f.k]} onChange={e => setForm(x => ({...x, [f.k]: e.target.value}))} placeholder={f.p} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Action*</label>
                <select value={form.action} onChange={e => setForm(x => ({...x, action: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {['BUY','SELL','ADD','TRIM','EXIT'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Confidence</label>
                <select value={form.confidence || ''} onChange={e => setForm(x => ({...x, confidence: e.target.value || null}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">—</option>
                  {['HIGH','MEDIUM','LOW'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {[{k:'shares',l:'Shares*'},{k:'price',l:'Price*'}].map(f => (
                <div key={f.k}><label className="block text-xs text-zinc-400 mb-1">{f.l}</label><input type="number" step="any" value={(form as any)[f.k]} onChange={e => setForm(x => ({...x, [f.k]: e.target.value}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Outcome</label>
                <select value={form.outcome || ''} onChange={e => setForm(x => ({...x, outcome: e.target.value || null}))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">—</option>
                  {['WIN','LOSS','BREAKEVEN'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {[{k:'thesis',l:'Thesis'},{k:'invalidation',l:'Invalidation'},{k:'notes',l:'Notes'},{k:'lesson',l:'Lesson Learned'}].map(f => (
                <div key={f.k} className="col-span-2"><label className="block text-xs text-zinc-400 mb-1">{f.l}</label><textarea value={(form as any)[f.k]} onChange={e => setForm(x => ({...x, [f.k]: e.target.value}))} rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" /></div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.ticker || !form.shares || !form.price} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Log Trade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
