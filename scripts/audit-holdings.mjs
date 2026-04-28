import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supa = createClient(url, key)

const { data: holdings, error: hErr } = await supa.from('holdings').select('*')
const { data: autopilots, error: aErr } = await supa.from('autopilot_portfolios').select('*')

if (hErr) { console.error('Holdings error:', hErr.message); process.exit(1) }

console.log('=== HOLDINGS ===')
const rows = (holdings || []).map(h => ({
  ticker: h.ticker,
  shares: h.shares,
  avg_cost: h.avg_cost,
  current_price: h.current_price,
  value: (h.shares * (h.current_price || h.avg_cost || 0)).toFixed(2),
  pl_pct: h.avg_cost > 0 ? (((h.current_price - h.avg_cost) / h.avg_cost) * 100).toFixed(2) + '%' : 'N/A',
  bucket: h.bucket,
  is_active: h.is_active,
}))
console.table(rows)

console.log('\n=== AUTOPILOTS ===')
if (autopilots && autopilots.length > 0) {
  console.table(autopilots.map(a => ({ name: a.name, total_value: a.total_value, currency: a.currency })))
} else {
  console.log(aErr ? 'Error: ' + aErr.message : 'No autopilot portfolios found')
}

const totalHoldingsValue = (holdings || []).reduce((s, h) => s + h.shares * (h.current_price || h.avg_cost || 0), 0)
console.log('\n=== TOTALS ===')
console.log('Holdings total:', totalHoldingsValue.toFixed(2))

const suspicious = (holdings || []).filter(h =>
  h.avg_cost === 0 || h.avg_cost === null ||
  (h.ticker === 'CASH' && h.shares * (h.current_price || 1) > 5000) ||
  (h.current_price && h.avg_cost && (h.current_price / h.avg_cost > 10 || h.avg_cost / h.current_price > 10))
)
console.log('\n=== SUSPICIOUS ROWS ===')
if (suspicious.length === 0) {
  console.log('None found')
} else {
  console.log(JSON.stringify(suspicious, null, 2))
}
