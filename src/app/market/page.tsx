'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, Filter } from 'lucide-react'
import { cn, fmt, fmtPercent, getVixRisk } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketQuote {
  price: number
  change: number
  changePercent: number
  label?: string
}

interface MarketData {
  sp500?: MarketQuote
  nasdaq?: MarketQuote
  vix?: MarketQuote
  oil?: MarketQuote
  gold?: MarketQuote
  btc?: MarketQuote
  treasury10y?: MarketQuote
  fedFunds?: MarketQuote
  error?: string
}

interface NewsItem {
  id: string
  source: string
  headline: string
  summary: string
  timestamp: number
  category: string
  url: string
}

type NewsCategory = 'all' | 'general' | 'earnings' | 'ipo' | 'mergers'

// ─── Fallback / placeholder data ─────────────────────────────────────────────

const PLACEHOLDER_MARKET: MarketData = {
  sp500:      { price: 5234.18,  change: 18.42,   changePercent: 0.35  },
  nasdaq:     { price: 16420.47, change: 92.14,   changePercent: 0.56  },
  vix:        { price: 18.72,    change: -1.34,   changePercent: -6.68 },
  oil:        { price: 82.14,    change: -0.38,   changePercent: -0.46 },
  gold:       { price: 2341.60,  change: 12.80,   changePercent: 0.55  },
  btc:        { price: 67240.00, change: 1420.00, changePercent: 2.16  },
  treasury10y:{ price: 4.32,     change: 0.02,    changePercent: 0.47  },
  fedFunds:   { price: 4.375,    change: 0,       changePercent: 0, label: '4.25–4.50%' },
}

const PLACEHOLDER_NEWS: NewsItem[] = [
  {
    id: '1', source: 'Reuters', category: 'earnings',
    headline: 'AMD beats Q1 estimates on strong data-center GPU demand',
    summary: 'Advanced Micro Devices reported Q1 revenue of $5.47B, up 2% YoY, driven by MI300X GPU sales to hyperscalers.',
    timestamp: Date.now() - 1_800_000, url: '#',
  },
  {
    id: '2', source: 'Bloomberg', category: 'general',
    headline: 'Tesla delivers 386K vehicles in Q1, missing Wall Street target of 449K',
    summary: "Tesla's first-quarter deliveries fell short of analyst expectations amid softening EV demand and price competition.",
    timestamp: Date.now() - 5_400_000, url: '#',
  },
  {
    id: '3', source: 'CNBC', category: 'general',
    headline: 'Fed officials signal patience on rate cuts as inflation stays sticky',
    summary: 'Multiple Fed governors reiterated a "higher for longer" stance, dampening hopes for a June rate cut.',
    timestamp: Date.now() - 9_000_000, url: '#',
  },
  {
    id: '4', source: 'WSJ', category: 'mergers',
    headline: 'Alphabet in advanced talks to acquire cybersecurity firm Wiz for $23B',
    summary: "Google's parent company is pursuing its largest-ever acquisition to bolster cloud security offerings.",
    timestamp: Date.now() - 14_400_000, url: '#',
  },
  {
    id: '5', source: 'FT', category: 'ipo',
    headline: 'Reddit IPO prices at $34/share, values platform at $6.4B',
    summary: 'The social media company priced its initial public offering above the expected range after strong institutional demand.',
    timestamp: Date.now() - 21_600_000, url: '#',
  },
  {
    id: '6', source: 'MarketWatch', category: 'earnings',
    headline: 'NVDA raises full-year guidance after blowout data-center quarter',
    summary: "Nvidia's data-center revenue more than doubled YoY to $22.6B, driven by Hopper GPU and NVLink demand.",
    timestamp: Date.now() - 28_800_000, url: '#',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatPrice(key: string, q: MarketQuote): string {
  if (q.label) return q.label
  if (key === 'btc')        return `$${fmt(q.price, 0)}`
  if (key === 'treasury10y' || key === 'vix') return `${fmt(q.price, 2)}%`
  if (key === 'oil' || key === 'gold') return `$${fmt(q.price, 2)}`
  return `$${fmt(q.price, 2)}`
}

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  all: 'All',
  general: 'General',
  earnings: 'Earnings',
  ipo: 'IPO',
  mergers: 'M&A',
}

const CATEGORY_COLORS: Record<string, string> = {
  general:  'bg-blue-500/20 text-blue-400',
  earnings: 'bg-amber-500/20 text-amber-400',
  ipo:      'bg-purple-500/20 text-purple-400',
  mergers:  'bg-green-500/20 text-green-400',
}

// ─── Market Card ─────────────────────────────────────────────────────────────

interface CardDef {
  key: keyof MarketData
  label: string
}

const ROW1: CardDef[] = [
  { key: 'sp500',   label: 'S&P 500' },
  { key: 'nasdaq',  label: 'NASDAQ' },
  { key: 'vix',     label: 'VIX' },
  { key: 'oil',     label: 'Oil (WTI)' },
]
const ROW2: CardDef[] = [
  { key: 'gold',        label: 'Gold' },
  { key: 'btc',         label: 'Bitcoin' },
  { key: 'treasury10y', label: '10Y Treasury' },
  { key: 'fedFunds',    label: 'Fed Funds Rate' },
]

function MarketCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 animate-pulse space-y-3">
      <div className="h-3 w-24 bg-zinc-800 rounded" />
      <div className="h-6 w-32 bg-zinc-800 rounded" />
      <div className="h-3 w-20 bg-zinc-800 rounded" />
    </div>
  )
}

function MarketCard({
  cardKey,
  label,
  data,
}: {
  cardKey: keyof MarketData
  label: string
  data: MarketData
}) {
  const quote = data[cardKey] as MarketQuote | undefined
  if (!quote) return <MarketCardSkeleton />

  const up = quote.changePercent >= 0
  const flat = quote.changePercent === 0
  const dirColor = flat ? 'text-zinc-400' : up ? 'text-green-400' : 'text-red-400'
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        {cardKey === 'vix' && quote && (() => {
          const risk = getVixRisk(quote.price)
          return (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', risk.bg, risk.color)}>
              {risk.label}
            </span>
          )
        })()}
      </div>

      <div className="mt-2">
        <span className="text-xl font-bold text-zinc-100 tabular-nums">
          {formatPrice(cardKey as string, quote)}
        </span>
      </div>

      <div className={cn('mt-1 flex items-center gap-1.5 text-sm font-medium', dirColor)}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="tabular-nums">
          {flat
            ? 'No change'
            : `${up ? '+' : ''}${fmt(quote.change, cardKey === 'vix' || cardKey === 'treasury10y' ? 3 : 2)}`
          }
        </span>
        <span className="text-zinc-500">·</span>
        <span className="tabular-nums">{fmtPercent(quote.changePercent, 2)}</span>
      </div>
    </div>
  )
}

// ─── News Card ────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="group flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
            {item.source}
          </span>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded capitalize',
            CATEGORY_COLORS[item.category] ?? 'bg-zinc-700/50 text-zinc-400'
          )}>
            {item.category}
          </span>
          <span className="text-xs text-zinc-600 ml-auto">{relativeTime(item.timestamp)}</span>
        </div>

        <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1 line-clamp-2 group-hover:text-white transition-colors">
          {item.headline}
        </h3>

        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{item.summary}</p>
      </div>

      {item.url !== '#' && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 self-start mt-1 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [marketData, setMarketData] = useState<MarketData>(PLACEHOLDER_MARKET)
  const [marketLoading, setMarketLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [news, setNews] = useState<NewsItem[]>(PLACEHOLDER_NEWS)
  const [newsLoading, setNewsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('all')
  const [visibleCount, setVisibleCount] = useState(5)

  // ── Fetch market data ──
  const fetchMarket = useCallback(async () => {
    setMarketLoading(true)
    try {
      const res = await fetch('/api/market-data')
      if (res.ok) {
        const json: MarketData = await res.json()
        if (!json.error) {
          setMarketData(json)
          setLastUpdated(new Date())
        }
      }
    } catch {
      // Keep placeholder on network error
    } finally {
      setMarketLoading(false)
    }
  }, [])

  // ── Fetch news from Finnhub demo ──
  const fetchNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const res = await fetch(
        'https://finnhub.io/api/v1/news?category=general&token=demo',
        { next: { revalidate: 300 } }
      )
      if (res.ok) {
        const raw: Array<{
          id: number
          source: string
          headline: string
          summary: string
          datetime: number
          category: string
          url: string
        }> = await res.json()

        if (Array.isArray(raw) && raw.length > 0) {
          setNews(
            raw.slice(0, 30).map((r) => ({
              id: String(r.id),
              source: r.source,
              headline: r.headline,
              summary: r.summary,
              timestamp: r.datetime * 1000,
              category: r.category?.toLowerCase() ?? 'general',
              url: r.url,
            }))
          )
        }
      }
    } catch {
      // Keep placeholder news
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarket()
    fetchNews()
  }, [fetchMarket, fetchNews])

  const allCards = [...ROW1, ...ROW2]

  const filteredNews =
    activeCategory === 'all'
      ? news
      : news.filter((n) => {
          if (activeCategory === 'mergers') return n.category === 'mergers' || n.category === 'm&a'
          return n.category === activeCategory
        })

  const visibleNews = filteredNews.slice(0, visibleCount)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Market Overview</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Live prices &amp; market news
              {lastUpdated && (
                <span className="ml-2 text-zinc-600">
                  · Updated {relativeTime(lastUpdated.getTime())}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchMarket}
            disabled={marketLoading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700',
              'text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-600',
              'bg-zinc-900 transition-colors disabled:opacity-50',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', marketLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* ── Market Grid ── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            {allCards.map(({ key, label }) => (
              <MarketCard key={key} cardKey={key} label={label} data={marketData} />
            ))}
          </div>

          {/* VIX callout banner */}
          {(() => {
            const viq = marketData.vix
            if (!viq) return null
            const risk = getVixRisk(viq.price)
            return (
              <div className={cn(
                'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3',
                risk.bg,
                'border-current/20'
              )}>
                <span className={cn('text-sm font-bold', risk.color)}>
                  VIX {fmt(viq.price, 2)} — Market Sentiment: {risk.label}
                </span>
                <span className="text-xs text-zinc-500">
                  {viq.price < 20
                    ? 'Low volatility regime. Risk assets favoured.'
                    : viq.price < 30
                    ? 'Elevated uncertainty. Size positions carefully.'
                    : 'High fear. Potential opportunity for long-term buyers.'}
                </span>
              </div>
            )
          })()}
        </section>

        {/* ── News Feed ── */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">Market News</h2>
              {newsLoading && (
                <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
              )}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-600" />
              {(Object.keys(CATEGORY_LABELS) as NewsCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setVisibleCount(5) }}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    activeCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {newsLoading && news.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 animate-pulse">
                    <div className="flex gap-2 mb-2">
                      <div className="h-5 w-16 bg-zinc-800 rounded" />
                      <div className="h-5 w-14 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 w-full bg-zinc-800 rounded" />
                  </div>
                ))
              : visibleNews.map((item) => <NewsCard key={item.id} item={item} />)
            }
          </div>

          {filteredNews.length === 0 && !newsLoading && (
            <div className="text-center py-10 text-zinc-600 text-sm">
              No news in this category.
            </div>
          )}

          {visibleCount < filteredNews.length && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setVisibleCount((v) => v + 5)}
                className="px-6 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
              >
                Load more ({filteredNews.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
