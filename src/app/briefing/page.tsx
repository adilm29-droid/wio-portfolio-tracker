'use client'

import { useEffect, useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'

const BRIEFING_URL = 'https://raw.githubusercontent.com/adilm29-droid/stocksbrain/main/output/briefing.txt'

export default function BriefingPage() {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  async function fetchBriefing() {
    setLoading(true)
    try {
      const bust = Date.now()
      const res = await fetch(`${BRIEFING_URL}?_=${bust}`)
      if (res.ok) {
        const t = await res.text()
        setText(t)
        setLastFetched(new Date())
      } else {
        setText(null)
      }
    } catch {
      setText(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBriefing() }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Briefing</h1>
          <p className="text-zinc-400 text-sm mt-1">StocksBrain output — generated 2am Dubai nightly</p>
        </div>
        <button
          onClick={fetchBriefing}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {lastFetched && (
        <p className="text-xs text-zinc-600">
          Fetched at {lastFetched.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {loading ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
          <RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-zinc-400">Loading briefing...</p>
        </div>
      ) : text ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 overflow-x-auto">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-white">StocksBrain Briefing</span>
          </div>
          <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">{text}</pre>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
          <FileText size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No briefing available yet</p>
          <p className="text-xs text-zinc-600 mt-2">StocksBrain runs at 2am Dubai time Mon–Fri. First briefing appears after the GitHub Actions workflow runs.</p>
          <p className="text-xs text-zinc-700 mt-1">
            Enable workflows at: github.com/adilm29-droid/stocksbrain/actions
          </p>
        </div>
      )}
    </div>
  )
}
