import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Use dynamic require to avoid ESM/CJS issues with yahoo-finance2
async function getQuote(symbol: string): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yf = require('yahoo-finance2').default
    const q = await yf.quote(symbol, {}, { validateResult: false })
    return (q as any)?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
}
const COMMODITY_SYMBOLS: Record<string, string> = {
  GOLD: 'GC=F', SILVER: 'SI=F',
}

export async function POST() {
  try {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('id, ticker, asset_class')
      .eq('is_active', true)

    if (!holdings?.length) return NextResponse.json({ message: 'No holdings', updated: 0 })

    const updates: { id: string; current_price: number }[] = []
    const stocks = holdings.filter((h: any) => (h.asset_class === 'US_STOCK' || h.asset_class === 'ETF') && !COMMODITY_SYMBOLS[h.ticker])
    const commodities = holdings.filter((h: any) => h.asset_class === 'COMMODITY' || COMMODITY_SYMBOLS[h.ticker])
    const cryptos = holdings.filter((h: any) => h.asset_class === 'CRYPTO' || CRYPTO_IDS[h.ticker])

    for (const h of stocks as any[]) {
      const price = await getQuote(h.ticker)
      if (price) updates.push({ id: h.id, current_price: price })
    }

    for (const h of commodities as any[]) {
      const sym = COMMODITY_SYMBOLS[h.ticker]
      if (!sym) continue
      const price = await getQuote(sym)
      if (price) updates.push({ id: h.id, current_price: price })
    }

    if (cryptos.length > 0) {
      const rawIds = (cryptos as any[]).map(h => CRYPTO_IDS[h.ticker]).filter(Boolean)
      const ids = Array.from(new Set(rawIds)).join(',')
      if (ids) {
        try {
          const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
          const data = await res.json()
          for (const h of cryptos as any[]) {
            const gid = CRYPTO_IDS[h.ticker]
            if (gid && data[gid]?.usd) updates.push({ id: h.id, current_price: data[gid].usd })
          }
        } catch {}
      }
    }

    for (const u of updates) {
      await supabase.from('holdings').update({
        current_price: u.current_price,
        price_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', u.id)
    }

    return NextResponse.json({ message: 'Refreshed', updated: updates.length })
  } catch (err) {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
  }
}

export async function GET() { return POST() }
