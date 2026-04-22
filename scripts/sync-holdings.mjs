/**
 * One-time Supabase holdings sync — Apr 22, 2026
 * Run from project root: node scripts/sync-holdings.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vgakkzbglulhxlbjmosb.supabase.co',
  'sb_publishable_1998wG_WKuZlCxcF17ablg_9bk6slEm'
)

// AED → USD conversion rate (Apr 2026)
const AED_TO_USD = 1 / 3.6725

// All prices in USD. Crypto avg_cost converted from AED.
const HOLDINGS_UPDATE = [
  // Stocks
  { ticker: 'AMD',  shares: 4.32560237,    avg_cost_per_share: 174.16,  current_price: 284.45 },
  { ticker: 'AMZN', shares: 7.35181268,    avg_cost_per_share: 224.15,  current_price: 249.90 },
  { ticker: 'KO',   shares: 1.41585302,    avg_cost_per_share: 70.63,   current_price: 74.70 },
  { ticker: 'META', shares: 0.55467511,    avg_cost_per_share: 631.00,  current_price: 668.85 },
  { ticker: 'MSFT', shares: 1.45468479,    avg_cost_per_share: 514.75,  current_price: 424.23 },
  { ticker: 'NKE',  shares: 10.56899598,   avg_cost_per_share: 62.25,   current_price: 46.39 },
  { ticker: 'NVDA', shares: 10.17663281,   avg_cost_per_share: 170.89,  current_price: 199.87 },
  { ticker: 'PLTR', shares: 7.08551806,    avg_cost_per_share: 162.83,  current_price: 145.97 },
  { ticker: 'PEP',  shares: 0.68190124,    avg_cost_per_share: 146.65,  current_price: 154.92 },
  { ticker: 'SPOT', shares: 0.29083350,    avg_cost_per_share: 687.68,  current_price: 522.39 },
  { ticker: 'SSTK', shares: 24.02652532,   avg_cost_per_share: 20.81,   current_price: 17.99 },
  { ticker: 'TSLA', shares: 3.20773912,    avg_cost_per_share: 326.12,  current_price: 386.39 },
  { ticker: 'HNST', shares: 131.27494223,  avg_cost_per_share: 3.81,    current_price: 3.39 },
  { ticker: 'UNH',  shares: 4.94367806,    avg_cost_per_share: 305.27,  current_price: 345.95 },
  { ticker: 'V',    shares: 0.29801924,    avg_cost_per_share: 335.55,  current_price: 309.96 },
  // ETFs
  { ticker: 'SPUS', shares: 60.95569328,   avg_cost_per_share: 52.38,   current_price: 52.75 },
  { ticker: 'URTH', shares: 5.34159500,    avg_cost_per_share: 187.21,  current_price: 193.27 },
  { ticker: 'HLAL', shares: 16.03849238,   avg_cost_per_share: 62.35,   current_price: 64.86 },
  // Commodities (USD/oz)
  { ticker: 'GOLD',   shares: 0.51789,     avg_cost_per_share: 4510.57, current_price: 4763.00 },
  { ticker: 'SILVER', shares: 21.74808,    avg_cost_per_share: 72.86,   current_price: 78.40 },
  // Crypto — avg cost converted from AED to USD at 3.6725 AED/USD
  { ticker: 'BTC', shares: 0.01466495,    avg_cost_per_share: Math.round(354587.10 * AED_TO_USD), current_price: Math.round(286555 * AED_TO_USD) },
  { ticker: 'ETH', shares: 0.42399581,    avg_cost_per_share: Math.round(11506.84 * AED_TO_USD * 10) / 10, current_price: Math.round(8781 * AED_TO_USD * 10) / 10 },
  { ticker: 'XRP', shares: 637.18524387,  avg_cost_per_share: Math.round(8.16 * AED_TO_USD * 1000) / 1000, current_price: Math.round(5.34 * AED_TO_USD * 1000) / 1000 },
  { ticker: 'SOL', shares: 9.38194714,    avg_cost_per_share: Math.round(516.02 * AED_TO_USD * 100) / 100, current_price: Math.round(323.51 * AED_TO_USD * 100) / 100 },
]

const WEALTH_PORTFOLIOS_UPDATE = [
  { name: 'Cybersecurity',    total_value: 5397.87, total_cost: 5800 },
  { name: 'Architects of AI', total_value: 6012.93, total_cost: 5800 },
  { name: 'FATMAA',           total_value: 5956.48, total_cost: 5800 },
  { name: 'Dividend Stocks',  total_value: 6193.79, total_cost: 5800 },
]

async function main() {
  const now = new Date().toISOString()
  let totalUpdated = 0
  const errors = []
  const skipped = []

  // ── Holdings ──────────────────────────────────────────────────────────
  console.log('Fetching active holdings from Supabase...')
  const { data: currentHoldings, error: fetchErr } = await supabase
    .from('holdings')
    .select('id, ticker')
    .eq('is_active', true)

  if (fetchErr) {
    console.error('FATAL: Could not fetch holdings:', fetchErr.message)
    process.exit(1)
  }
  console.log(`Found ${currentHoldings.length} active holdings\n`)

  const tickerToId = Object.fromEntries(currentHoldings.map(h => [h.ticker, h.id]))

  for (const h of HOLDINGS_UPDATE) {
    const id = tickerToId[h.ticker]
    if (!id) { skipped.push(h.ticker); continue }

    const { error: upErr } = await supabase
      .from('holdings')
      .update({ shares: h.shares, avg_cost_per_share: h.avg_cost_per_share, current_price: h.current_price, price_updated_at: now, updated_at: now })
      .eq('id', id)

    if (upErr) { errors.push(`${h.ticker}: ${upErr.message}`); console.error(`  ✗ ${h.ticker}: ${upErr.message}`) }
    else { totalUpdated++; console.log(`  ✓ ${h.ticker} — ${h.shares} shares @ avg $${h.avg_cost_per_share}`) }
  }

  console.log(`\nHoldings: ${totalUpdated} updated, ${skipped.length} skipped`)
  if (skipped.length) console.log(`  Skipped (not in DB): ${skipped.join(', ')}`)

  // ── Wealth Portfolios ─────────────────────────────────────────────────
  console.log('\nFetching wealth portfolios...')
  const { data: wps, error: wpFetchErr } = await supabase
    .from('wealth_portfolios')
    .select('id, name')
    .eq('is_active', true)

  if (wpFetchErr) { console.error('Could not fetch wealth portfolios:', wpFetchErr.message) }
  else {
    const nameToId = Object.fromEntries((wps || []).map(w => [w.name, w.id]))
    let wpUpdated = 0
    for (const wp of WEALTH_PORTFOLIOS_UPDATE) {
      const id = nameToId[wp.name]
      if (!id) { console.log(`  ⚠ Not found: "${wp.name}"`); continue }
      const { error: wpUpErr } = await supabase
        .from('wealth_portfolios')
        .update({ total_value: wp.total_value, total_cost: wp.total_cost, updated_at: now })
        .eq('id', id)
      if (wpUpErr) { errors.push(`WP ${wp.name}: ${wpUpErr.message}`); console.error(`  ✗ ${wp.name}: ${wpUpErr.message}`) }
      else { wpUpdated++; console.log(`  ✓ ${wp.name} — $${wp.total_value.toLocaleString()}`) }
    }
    console.log(`\nWealth portfolios: ${wpUpdated} updated`)
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log(`Holdings updated : ${totalUpdated}/${HOLDINGS_UPDATE.length}`)
  if (errors.length) { console.log(`Errors (${errors.length}):`); errors.forEach(e => console.log(`  • ${e}`)) }
  else console.log('No errors.')
}

main().catch(e => { console.error('Script failed:', e); process.exit(1) })
