'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  CheckCircle, XCircle, Download, Upload, Trash2,
  Save, Database, Palette, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Setting {
  key: string
  value: string
  updated_at?: string
}

interface BucketTarget {
  id: string
  bucket: string
  display_name: string
  target_min: number
  target_max: number
}

interface TableCount {
  name: string
  count: number | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const saveSetting = async (key: string, value: string) => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return error
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden', className)}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800 bg-zinc-900/80">
        <Icon className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {hint && <p className="text-xs text-zinc-600 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  )
}

// ─── Reset confirmation modal ──────────────────────────────────────────────────

function ResetModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [typed, setTyped] = useState('')
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)

  const TABLES = ['holdings', 'transactions', 'portfolio_snapshots', 'settings', 'bucket_targets']

  const handleReset = async () => {
    setResetting(true)
    try {
      for (const table of TABLES) {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
      // settings table uses key not id
      await supabase.from('settings').delete().neq('key', '__sentinel__')
      setDone(true)
    } catch {
      // ignore
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-800/50 bg-zinc-950 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Reset All Data</h3>
              <p className="text-xs text-zinc-500">This action cannot be undone</p>
            </div>
          </div>

          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-300 font-medium">All data has been deleted.</p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    You are about to permanently delete all holdings, transactions, snapshots and settings.
                    The following tables will be truncated:
                  </p>
                  <ul className="text-xs text-zinc-500 space-y-0.5 font-mono bg-zinc-900 rounded-lg p-3">
                    {TABLES.map(t => <li key={t}>• {t}</li>)}
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-2 rounded-lg bg-red-900/40 border border-red-700/50 text-sm text-red-300 hover:bg-red-900/60 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm you want to erase all data.
                  </p>
                  <input
                    autoFocus
                    value={typed}
                    onChange={e => setTyped(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                      Back
                    </button>
                    <button
                      disabled={typed !== 'DELETE'}
                      onClick={() => setStep(3)}
                      className="flex-1 py-2 rounded-lg bg-red-900/40 border border-red-700/50 text-sm text-red-300 hover:bg-red-900/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Confirmed
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-red-300 font-medium">
                    Final warning — this is irreversible. Are you absolutely sure?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(2)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                      Back
                    </button>
                    <button
                      disabled={resetting}
                      onClick={handleReset}
                      className="flex-1 py-2 rounded-lg bg-red-600 text-sm text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {resetting ? 'Deleting…' : 'Yes, delete everything'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [buckets, setBuckets] = useState<BucketTarget[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [tableCounts, setTableCounts] = useState<TableCount[]>([])
  const [bucketDraft, setBucketDraft] = useState<BucketTarget[]>([])
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [showReset, setShowReset] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const DB_TABLES = ['holdings', 'transactions', 'portfolio_snapshots', 'settings', 'bucket_targets', 'wealth_portfolios']

  // ── Load data ──
  const loadAll = useCallback(async () => {
    // Test connection
    const { error: connErr } = await supabase.from('settings').select('key').limit(1)
    setConnected(!connErr)

    // Settings
    const { data: sData } = await supabase.from('settings').select('*')
    if (sData) {
      const map: Record<string, string> = {}
      sData.forEach((s: Setting) => { map[s.key] = s.value })
      setSettings(map)
    }

    // Bucket targets
    const { data: bData } = await supabase.from('bucket_targets').select('*').order('bucket')
    if (bData) {
      setBuckets(bData)
      setBucketDraft(bData)
    }

    // Table counts
    const counts: TableCount[] = await Promise.all(
      DB_TABLES.map(async (name) => {
        const { count } = await supabase.from(name).select('*', { count: 'exact', head: true })
        return { name, count }
      })
    )
    setTableCounts(counts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Save a single setting with feedback ──
  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(p => ({ ...p, [key]: true }))
    await saveSetting(key, value)
    setSettings(p => ({ ...p, [key]: value }))
    setSaving(p => ({ ...p, [key]: false }))
    setSaved(p => ({ ...p, [key]: true }))
    setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000)
  }

  // ── Bucket targets ──
  const handleBucketChange = (id: string, field: 'target_min' | 'target_max', val: string) => {
    setBucketDraft(prev => prev.map(b => b.id === id ? { ...b, [field]: parseFloat(val) || 0 } : b))
  }

  const saveBuckets = async () => {
    setSaving(p => ({ ...p, buckets: true }))
    for (const b of bucketDraft) {
      await supabase
        .from('bucket_targets')
        .update({ target_min: b.target_min, target_max: b.target_max })
        .eq('id', b.id)
    }
    setBuckets(bucketDraft)
    setSaving(p => ({ ...p, buckets: false }))
    setSaved(p => ({ ...p, buckets: true }))
    setTimeout(() => setSaved(p => ({ ...p, buckets: false })), 2000)
  }

  // ── Export ──
  const exportData = async () => {
    const exported: Record<string, unknown[]> = {}
    for (const t of DB_TABLES) {
      const { data } = await supabase.from(t).select('*')
      exported[t] = data ?? []
    }
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wio-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ──
  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('Reading file…')
    try {
      const text = await file.text()
      const json: Record<string, unknown[]> = JSON.parse(text)
      for (const [table, rows] of Object.entries(json)) {
        if (!DB_TABLES.includes(table)) continue
        if (!Array.isArray(rows) || rows.length === 0) continue
        setImportStatus(`Importing ${table}…`)
        await supabase.from(table).upsert(rows as Record<string, unknown>[], { ignoreDuplicates: false })
      }
      setImportStatus('Import complete!')
      await loadAll()
      setTimeout(() => setImportStatus(null), 3000)
    } catch {
      setImportStatus('Import failed — invalid JSON file.')
      setTimeout(() => setImportStatus(null), 4000)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Input field helper ──
  function SettingInput({
    settingKey,
    defaultValue,
    type = 'text',
    unit,
  }: {
    settingKey: string
    defaultValue: string
    type?: string
    unit?: string
  }) {
    const [local, setLocal] = useState(settings[settingKey] ?? defaultValue)
    const changed = local !== (settings[settingKey] ?? defaultValue)
    useEffect(() => {
      setLocal(settings[settingKey] ?? defaultValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings[settingKey]])

    return (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <input
            type={type}
            value={local}
            onChange={e => setLocal(e.target.value)}
            className="w-36 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
          />
          {unit && (
            <span className="absolute right-3 text-xs text-zinc-500 pointer-events-none">{unit}</span>
          )}
        </div>
        {changed && (
          <button
            disabled={saving[settingKey]}
            onClick={() => handleSaveSetting(settingKey, local)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving[settingKey] ? '…' : 'Save'}
          </button>
        )}
        {saved[settingKey] && !changed && (
          <CheckCircle className="w-4 h-4 text-green-400" />
        )}
      </div>
    )
  }

  // ── Slider helper ──
  function SettingSlider({
    settingKey,
    defaultValue,
    min,
    max,
    unit = '%',
  }: {
    settingKey: string
    defaultValue: number
    min: number
    max: number
    unit?: string
  }) {
    const current = parseFloat(settings[settingKey] ?? String(defaultValue))
    const [local, setLocal] = useState(current)
    useEffect(() => {
      setLocal(parseFloat(settings[settingKey] ?? String(defaultValue)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings[settingKey]])

    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={local}
          onChange={e => setLocal(Number(e.target.value))}
          className="w-32 accent-blue-500"
        />
        <span className="w-16 text-sm font-mono text-zinc-200 text-center bg-zinc-800 rounded px-2 py-0.5">
          {local}{unit}
        </span>
        {local !== current && (
          <button
            disabled={saving[settingKey]}
            onClick={() => handleSaveSetting(settingKey, String(local))}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving[settingKey] ? '…' : 'Save'}
          </button>
        )}
        {saved[settingKey] && local === current && (
          <CheckCircle className="w-4 h-4 text-green-400" />
        )}
      </div>
    )
  }

  return (
    <>
      {showReset && <ResetModal onClose={() => { setShowReset(false); loadAll() }} />}

      <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
              <p className="text-sm text-zinc-500 mt-1">Portfolio configuration and data management</p>
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* ── Portfolio Settings ── */}
          <SectionCard title="Portfolio Settings" icon={Save}>
            <div>
              <FieldRow label="Single Stock Cap" hint="Maximum weight per individual stock">
                <SettingSlider settingKey="single_stock_cap_pct" defaultValue={10} min={1} max={20} />
              </FieldRow>
              <FieldRow label="AED / USD Rate" hint="Used for AED-denominated reporting">
                <SettingInput settingKey="aed_usd_rate" defaultValue="3.6725" type="number" />
              </FieldRow>
              <FieldRow label="Base Currency" hint="All valuations displayed in">
                <span className="text-sm font-semibold text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg">USD</span>
              </FieldRow>
              <FieldRow label="Tax Rate" hint="UAE — 0% personal capital gains tax">
                <SettingInput settingKey="tax_rate_pct" defaultValue="0" type="number" unit="%" />
              </FieldRow>
              <FieldRow label="Broker" hint="Your brokerage platform">
                <SettingInput settingKey="broker_name" defaultValue="Wio Invest" />
              </FieldRow>
            </div>
          </SectionCard>

          {/* ── Bucket Targets ── */}
          <SectionCard title="Bucket Targets" icon={Database}>
            {bucketDraft.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-6">No bucket targets found. Run the DB seed first.</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_100px_100px] gap-2 mb-2 px-1">
                  <span className="text-xs text-zinc-600 font-medium">Bucket</span>
                  <span className="text-xs text-zinc-600 font-medium text-center">Min %</span>
                  <span className="text-xs text-zinc-600 font-medium text-center">Max %</span>
                </div>
                {bucketDraft.map((b) => (
                  <div key={b.id} className="grid grid-cols-[1fr_100px_100px] gap-2 items-center py-2 border-b border-zinc-800/60 last:border-0">
                    <span className="text-sm text-zinc-200 font-medium">{b.display_name}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={b.target_min}
                      onChange={e => handleBucketChange(b.id, 'target_min', e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={b.target_max}
                      onChange={e => handleBucketChange(b.id, 'target_max', e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                    />
                  </div>
                ))}

                <div className="pt-3 flex items-center gap-3">
                  <button
                    onClick={saveBuckets}
                    disabled={saving.buckets || JSON.stringify(buckets) === JSON.stringify(bucketDraft)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving.buckets ? 'Saving…' : 'Save Targets'}
                  </button>
                  {saved.buckets && <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Status ── */}
          <SectionCard title="System Status" icon={Database}>
            <div className="space-y-1 divide-y divide-zinc-800/60">
              <FieldRow label="Supabase Connection" hint="Real-time DB connectivity">
                {connected === null ? (
                  <span className="text-xs text-zinc-500 animate-pulse">Checking…</span>
                ) : connected ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                    <CheckCircle className="w-4 h-4" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                    <XCircle className="w-4 h-4" /> Disconnected
                  </span>
                )}
              </FieldRow>

              <FieldRow label="Last Price Refresh" hint="When prices were last updated from the API">
                <span className="text-xs text-zinc-400 font-mono">
                  {settings.last_price_refresh
                    ? new Date(settings.last_price_refresh).toLocaleString()
                    : 'Never'}
                </span>
              </FieldRow>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Database Tables</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tableCounts.map(({ name, count }) => (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <span className="text-xs text-zinc-400 font-mono truncate">{name}</span>
                    <span className="text-xs font-semibold text-zinc-200 ml-2 tabular-nums">
                      {count ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* ── Data Management ── */}
          <SectionCard title="Data Management" icon={Download}>
            <div className="space-y-3">
              {/* Export */}
              <button
                onClick={exportData}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-100">Export All Data as JSON</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Download a full backup of all tables</p>
                </div>
              </button>

              {/* Import */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={importData}
                  className="hidden"
                  id="import-json"
                />
                <label
                  htmlFor="import-json"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">Import Data from JSON</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Restore from a previous backup (upserts)</p>
                  </div>
                </label>
                {importStatus && (
                  <p className="mt-2 text-xs text-zinc-400 px-1">{importStatus}</p>
                )}
              </div>

              {/* Reset */}
              <button
                onClick={() => setShowReset(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-900/40 bg-red-950/20 text-sm font-medium hover:bg-red-950/30 hover:border-red-800/60 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-300">Reset All Data</p>
                  <p className="text-xs text-red-900/80 text-red-500/70 mt-0.5">
                    Permanently delete all records from every table
                  </p>
                </div>
              </button>
            </div>
          </SectionCard>

          {/* ── Theme ── */}
          <SectionCard title="Theme" icon={Palette}>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
              <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-zinc-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-zinc-200">Dark mode is active</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Background: zinc-950 · Cards: zinc-900 · Accents: blue-500
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'Background', color: 'bg-zinc-950', hex: '#09090b' },
                { name: 'Card',       color: 'bg-zinc-900', hex: '#18181b' },
                { name: 'Border',     color: 'bg-zinc-800', hex: '#27272a' },
                { name: 'Accent',     color: 'bg-blue-500', hex: '#3b82f6' },
              ].map(sw => (
                <div key={sw.name} className="flex items-center gap-2 bg-zinc-800/40 rounded-lg p-2">
                  <div className={cn('w-5 h-5 rounded shrink-0', sw.color, 'border border-zinc-700')} />
                  <div>
                    <p className="text-xs text-zinc-300 font-medium">{sw.name}</p>
                    <p className="text-[10px] text-zinc-600 font-mono">{sw.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>
      </div>
    </>
  )
}
