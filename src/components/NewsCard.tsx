'use client'

import { Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SBNewsItem } from '@/lib/stocksbrain-fetch'

interface Props {
  newsItems: SBNewsItem[]
  loading?: boolean
}

function sentimentEmoji(sentiment: string) {
  if (sentiment === 'positive') return '🟢'
  if (sentiment === 'negative') return '🔴'
  return '⚪'
}

function relativeTime(ts: string) {
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const hours = Math.floor(diff / 3600_000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  } catch {
    return ts
  }
}

export function NewsCard({ newsItems, loading }: Props) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
        <Newspaper size={18} className="text-blue-400" />
        <h2 className="text-lg font-bold text-white">Portfolio News</h2>
        <span className="text-xs text-zinc-500 ml-1">— StocksBrain filtered</span>
      </div>
      <div className="divide-y divide-zinc-800">
        {loading ? (
          <div className="px-5 py-4 text-sm text-zinc-500">Loading news...</div>
        ) : newsItems.length === 0 ? (
          <div className="px-5 py-6 text-center text-zinc-600 text-sm">
            <p>No news available</p>
            <p className="text-xs mt-1 text-zinc-700">StocksBrain news feed populates after first scheduled run</p>
          </div>
        ) : newsItems.map((item, i) => (
          <div key={i} className="px-5 py-3 hover:bg-zinc-800/30">
            <div className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{sentimentEmoji(item.sentiment)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 leading-snug line-clamp-2">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                      {item.headline}
                    </a>
                  ) : item.headline}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-blue-400">{item.ticker}</span>
                  <span className="text-xs text-zinc-500">{item.source}</span>
                  <span className="text-xs text-zinc-600">{relativeTime(item.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
