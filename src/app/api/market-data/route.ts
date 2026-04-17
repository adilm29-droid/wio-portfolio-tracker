import { NextResponse } from 'next/server'

let _yf: any = null
async function getYF() {
  if (!_yf) {
    const mod = await import('yahoo-finance2')
    const YF = mod.default
    _yf = new YF({ suppressNotices: ['yahooSurvey'] })
  }
  return _yf
}

export async function GET() {
  try {
    const yahooFinance = await getYF()
    const symbols = ['^GSPC', '^IXIC', '^VIX', 'CL=F', 'GC=F', 'BTC-USD']
    const quotes = await Promise.allSettled(
      symbols.map((s: string) => yahooFinance.quote(s, {}, { validateResult: false }))
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
