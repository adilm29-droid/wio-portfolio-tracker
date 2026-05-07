import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supa = createClient(url, key)

// Fix CASH row: current_price should always be 1 (1 dollar = 1 unit of cash)
const { data, error } = await supa
  .from('holdings')
  .update({ current_price: 1.0, price_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  .eq('ticker', 'CASH')
  .select()

if (error) {
  console.error('Failed to fix CASH price:', error.message)
  process.exit(1)
}

console.log('Fixed CASH row:', data)
console.log('CASH value is now $' + (data?.[0]?.shares * 1.0).toFixed(2) + ' (was $' + (data?.[0]?.shares * 88.4).toFixed(2) + ')')
