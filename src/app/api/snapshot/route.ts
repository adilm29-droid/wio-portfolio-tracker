import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .eq('is_active', true)

    const { data: wealthPortfolios } = await supabase
      .from('wealth_portfolios')
      .select('*')
      .eq('is_active', true)

    if (!holdings) return NextResponse.json({ error: 'No data' }, { status: 500 })

    const directValue = holdings.reduce((s: number, h: any) => s + h.shares * h.current_price, 0)
    const wealthValue = (wealthPortfolios || []).reduce((s: number, p: any) => s + p.total_value, 0)
    const totalValue = directValue + wealthValue

    const cryptoValue = holdings.filter((h: any) => h.asset_class === 'CRYPTO').reduce((s: number, h: any) => s + h.shares * h.current_price, 0)
    const commoditiesValue = holdings.filter((h: any) => h.asset_class === 'COMMODITY').reduce((s: number, h: any) => s + h.shares * h.current_price, 0)
    const cashValue = holdings.filter((h: any) => h.bucket === 'CASH').reduce((s: number, h: any) => s + h.shares * h.current_price, 0)

    const totalCost = holdings.reduce((s: number, h: any) => s + h.shares * h.avg_cost_per_share, 0) +
      (wealthPortfolios || []).reduce((s: number, p: any) => s + p.total_cost, 0)
    const totalPl = totalValue - totalCost

    const today = new Date().toISOString().split('T')[0]

    await supabase.from('portfolio_snapshots').upsert({
      snapshot_date: today,
      total_value: totalValue,
      direct_holdings_value: directValue,
      wealth_portfolios_value: wealthValue,
      crypto_value: cryptoValue,
      commodities_value: commoditiesValue,
      cash_value: cashValue,
      total_pl_dollars: totalPl,
      total_pl_percent: totalCost > 0 ? (totalPl / totalCost) * 100 : 0,
    }, { onConflict: 'snapshot_date' })

    return NextResponse.json({ message: 'Snapshot saved', date: today, totalValue })
  } catch (error) {
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 })
  }
}
