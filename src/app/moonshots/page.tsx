'use client'

import { Rocket, Lock, AlertTriangle, CheckCircle } from 'lucide-react'

const MOONSHOT_CATEGORIES = [
  { name: 'AI Infrastructure', examples: 'Picks-and-shovels plays on model training/inference', halal: true },
  { name: 'Defense & Space', examples: 'Commercial satellite, defense contractors', halal: true },
  { name: 'Cybersecurity', examples: 'Zero-trust, threat intelligence platforms', halal: true },
  { name: 'Quantum Computing', examples: 'Early stage quantum hardware/software', halal: true },
  { name: 'Robotics', examples: 'Industrial + humanoid robot plays', halal: true },
  { name: 'Biotech (FDA)', examples: 'Phase 3 catalysts within 12 months', halal: false },
]

const MOONSHOT_PREREQS = [
  'Market cap $500M–$10B',
  'Revenue growth >50% YoY OR transformative thesis',
  'Insider buying last 90 days',
  'Down >40% from 52-week high',
  'Avg daily volume > $5M (liquid)',
  'Halal screen pass',
  'Real product, not vapor',
  'Bull/bear debate: 5/6 agents confirm',
]

export default function MoonshotsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Moonshot Bucket</h1>
        <p className="text-zinc-400 text-sm mt-1">Layer 2 — max $2,500 total, funded from realized gains only</p>
      </div>

      {/* Non-dismissable reality check */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-300">Reality Check — Read This First</p>
          <p className="text-sm text-amber-200 mt-1">Moonshots target <strong>5–20x over 1–3 years</strong> (NOT 5000x — that&apos;s survivorship bias). <strong>50%+ go to zero.</strong> Max $2,500 total bucket. Funded ONLY from realized gains, never from core allocation.</p>
        </div>
      </div>

      {/* Bucket status */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={20} className="text-red-400" />
          <div>
            <p className="text-sm font-bold text-white">Moonshot Bucket: LOCKED</p>
            <p className="text-xs text-zinc-500">Unlock condition: Cash buffer must reach $1,500 first</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">Current Buffer</p>
            <p className="text-lg font-bold text-red-400">~$348</p>
          </div>
          <div className="p-3 bg-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">Unlock At</p>
            <p className="text-lg font-bold text-white">$1,500</p>
          </div>
          <div className="p-3 bg-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">Max Moonshot</p>
            <p className="text-lg font-bold text-white">$2,500</p>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">All 8 Prerequisites Must Pass</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Any candidate failing even one is automatically rejected</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {MOONSHOT_PREREQS.map((req, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <CheckCircle size={14} className="text-zinc-600 shrink-0" />
              <span className="text-sm text-zinc-400">{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Screener Categories</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {MOONSHOT_CATEGORIES.map(c => (
            <div key={c.name} className="flex items-center gap-4 px-5 py-3">
              <Rocket size={14} className="text-zinc-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.examples}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.halal ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {c.halal ? 'Halal ✓' : 'Review'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
        <p className="text-xs text-zinc-600">Moonshot candidates appear here after weekly screener runs (Sun 8am Dubai). Screener checks all 8 prerequisites automatically.</p>
      </div>
    </div>
  )
}
