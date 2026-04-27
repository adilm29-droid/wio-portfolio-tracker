'use client'

import { Shield, TrendingUp, Users, FileText, Building, AlertTriangle } from 'lucide-react'

const CAVEATS = {
  insider: "Insider sells often = compensation/diversification, not bearish. Cluster buys (3+ insiders, 30 days, total >$1M) are the real signal.",
  congress: "Congressional disclosures lag 30-45 days. Use as confirmation of independent thesis, not standalone signal.",
  altdata: "Alt-data signals (web traffic, job posts) are proxies only — free public data vs paid satellite/credit card feeds at institutions.",
}

export default function IntelligencePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Intelligence Layer</h1>
        <p className="text-zinc-400 text-sm mt-1">14 data sources — insider activity, congressional trades, AI deals, M&A, political news, and more</p>
      </div>

      {/* Insider Trading */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Users size={18} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">Insider Trading</h2>
          <span className="ml-auto text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">SEC Form 4</span>
        </div>
        <div className="px-5 py-4">
          <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-xs text-zinc-400 mb-4">
            ℹ️ {CAVEATS.insider}
          </div>
          <p className="text-sm text-zinc-400">Insider cluster detection runs nightly via StocksBrain. Data appears here after first GitHub Actions run (2am Dubai).</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {['Cluster buys (3+ insiders)', 'Single officer buys', 'Cluster sells (compensation signal)'].map(label => (
              <div key={label} className="p-3 bg-zinc-800 rounded-lg text-center">
                <p className="text-2xl font-bold text-white">—</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Congressional Trades */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Building size={18} className="text-purple-400" />
          <h2 className="text-lg font-bold text-white">Congressional Trades</h2>
          <span className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Capitol Trades</span>
        </div>
        <div className="px-5 py-4">
          <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-xs text-zinc-400 mb-4">
            ℹ️ {CAVEATS.congress}
          </div>
          <p className="text-sm text-zinc-400">Congressional disclosure data from Capitol Trades API. Cluster detection (3+ politicians, same ticker) flags in dashboard.</p>
        </div>
      </div>

      {/* AI Deals & Partnerships */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-green-400" />
          <h2 className="text-lg font-bold text-white">AI Deals & Partnerships</h2>
          <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">8-K Filings</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-zinc-400">Tracks hyperscaler deals (AWS/Azure/GCP), Anthropic/OpenAI partnerships, robotics/autonomous system announcements. Cluster signal: 2+ deals in same ticker same week = momentum.</p>
          <div className="mt-3 p-3 bg-zinc-800/40 rounded-lg">
            <p className="text-xs text-zinc-500">Source: SEC EDGAR 8-K Item 1.01 filings + company press release RSS feeds</p>
          </div>
        </div>
      </div>

      {/* M&A Tracker */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <FileText size={18} className="text-amber-400" />
          <h2 className="text-lg font-bold text-white">M&A Activity</h2>
          <span className="ml-auto text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">SEC 8-K</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-zinc-400">Acquisition targets in your portfolio = +3 signal (deal premium). Acquirer with strategic logic = +1. Rumors flagged separately.</p>
        </div>
      </div>

      {/* Political/Policy News */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-400" />
          <h2 className="text-lg font-bold text-white">Political & Regulatory</h2>
          <span className="ml-auto text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Federal Register</span>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Tech/Semis', items: 'Export controls, antitrust, CHIPS Act', color: 'border-blue-800/40' },
              { label: 'Healthcare', items: 'Medicare/Medicaid, PBM regulation', color: 'border-green-800/40' },
              { label: 'Crypto', items: 'SEC enforcement, ETF approvals', color: 'border-orange-800/40' },
              { label: 'Halal', items: 'Sharia compliance updates', color: 'border-purple-800/40' },
            ].map(s => (
              <div key={s.label} className={`p-3 rounded-lg border bg-zinc-800/30 ${s.color}`}>
                <p className="text-xs font-bold text-white mb-1">{s.label}</p>
                <p className="text-xs text-zinc-500">{s.items}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
