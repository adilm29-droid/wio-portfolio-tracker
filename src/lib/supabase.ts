import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      holdings: { Row: any; Insert: any; Update: any }
      wealth_portfolios: { Row: any; Insert: any; Update: any }
      wealth_portfolio_holdings: { Row: any; Insert: any; Update: any }
      trade_journal: { Row: any; Insert: any; Update: any }
      portfolio_snapshots: { Row: any; Insert: any; Update: any }
      bucket_targets: { Row: any; Insert: any; Update: any }
      earnings_calendar: { Row: any; Insert: any; Update: any }
      settings: { Row: any; Insert: any; Update: any }
    }
  }
}
