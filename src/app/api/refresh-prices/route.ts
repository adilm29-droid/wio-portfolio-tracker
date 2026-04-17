import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const COMMODITY_SYMBOLS: Record<string, string> = {
  GOLD: 'GC=F',
  SILVER: 'SI=F',
}
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
}

let _yf: any = null
async function getYF() {
  if (!_yf) {
    const mod = await import('yahoo-finance2')
    const YF = mod.default
    _yf = new YF({ suppressNotices: ['yahooSurvey'] })
  }
  return _yf
}

async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols.length) return {}
  try {
    const yf = await getYF()
    const results: Record<string, number> = {}
    // Batch all symbols in one call using quoteCombine or quote array
    const quotes = await yf.quote(symbols, {}, { validateResult: false })
    const arr = Array.isArray(quotes) ? quotes : [quotes]
    for (const q of arr) {
      if (q?.regularMarketPrice && q?.symbol) results[q.symbol] = q.regularMarketPrice
    }
    return results
  } catch {
    return {}
  }
}

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {}
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(10000) }
    )
    const data = await res.json()
    const results: Record<string, number> = {}
    for (const id of ids) {
      if (data[id]?.usd) results[id] = data[id].usd
    }
    return results
  } catch {
    return {}
  }
}

export async function POST() {
  try {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('id, ticker, asset_class')
      .eq('is_active', true)

    if (!holdings?.length) return NextResponse.json({ message: 'No holdings', updated: 0 })

    const updates: { id: string; current_price: number }[] = []
    const cryptoHoldings = holdings.filter((h: any) => CRYPTO_IDS[h.ticker])
    const otherHoldings = holdings.filter((h: any) => !CRYPTO_IDS[h.ticker])

    const yahooSymbols = otherHoldings.map((h: any) => COMMODITY_SYMBOLS[h.ticker] ?? h.ticker)
    const tickerToYahoo: Record<string, string> = Object.fromEntries(
      otherHoldings.map((h: any) => [h.ticker, COMMODITY_SYMBOLS[h.ticker] ?? h.ticker])
    )

    const [yahooData, cryptoData] = await Promise.all([
      fetchYahooQuotes(yahooSymbols),
      fetchCryptoPrices(Array.from(new Set(cryptoHoldings.map((h: any) => CRYPTO_IDS[h.ticker])))),
    ])

    for (const h of otherHoldings as any[]) {
      const sym = tickerToYahoo[h.ticker]
      if (yahooData[sym]) updates.push({ id: h.id, current_price: yahooData[sym] })
    }
    for (const h of cryptoHoldings as any[]) {
      const gid = CRYPTO_IDS[h.ticker]
      if (cryptoData[gid]) updates.push({ id: h.id, current_price: cryptoData[gid] })
    }

    const now = new Date().toISOString()
    await Promise.all(
      updates.map(u =>
        supabase.from('holdings').update({
          current_price: u.current_price,
          price_updated_at: now,
          updated_at: now,
        }).eq('id', u.id)
      )
    )

    return NextResponse.json({ message: 'Refreshed', updated: updates.length, total: holdings.length })
  } catch (err) {
    return NextResponse.json({ error: 'Refresh failed', detail: String(err) }, { status: 500 })
  }
}

export async function GET() { return POST() }
