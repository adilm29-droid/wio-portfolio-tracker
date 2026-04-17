import { NextResponse } from 'next/server'

// yahoo-finance2 is a CommonJS module — import dynamically to avoid ESM issues
async function getYahooFinance() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yf = require('yahoo-finance2').default ?? require('yahoo-finance2')
  return yf
}

export async function GET() {
  try {
    const yahooFinance = await getYahooFinance()
    const symbols = ['^GSPC', '^IXIC', '^VIX', 'CL=F', 'GC=F', 'BTC-USD']
    const quotes = await Promise.allSettled(
      symbols.map((s: string) => yahooFinance.quote(s))
    )

    const result: Record<string, {
      price: number
      change: number
      changePercent: number
      label?: string
    }> = {}

    const names = ['sp500', 'nasdaq', 'vix', 'oil', 'gold', 'btc'] as const

    quotes.forEach((q, i) => {
      if (q.status === 'fulfilled' && q.value) {
        result[names[i]] = {
          price: q.value.regularMarketPrice ?? 0,
          change: q.value.regularMarketChange ?? 0,
          changePercent: q.value.regularMarketChangePercent ?? 0,
        }
      }
    })

    // Hardcoded values for instruments without live feed
    result.treasury10y = { price: 4.32, change: 0.02, changePercent: 0.47 }
    result.fedFunds = {
      price: 4.375,
      change: 0,
      changePercent: 0,
      label: '4.25–4.50%',
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[market-data] Error fetching quotes:', error)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
