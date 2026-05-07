import urllib.request
import json
import os

sql = open('schema.sql', 'r').read()

# Remove existing holdings inserts and replace with user's exact data
# We'll apply DDL only first, then seed separately
ddl_only = sql.split("-- Seed bucket targets")[0]

# Add bucket_targets, settings, earnings calendar seeds (no conflict with user data)
ddl_with_seeds = ddl_only + """
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='holdings' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON holdings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wealth_portfolios' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON wealth_portfolios FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wealth_portfolio_holdings' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON wealth_portfolio_holdings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trade_journal' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON trade_journal FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='portfolio_snapshots' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON portfolio_snapshots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bucket_targets' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON bucket_targets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='earnings_calendar' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON earnings_calendar FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='settings' AND policyname='Allow all') THEN
    CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO bucket_targets (bucket, target_min, target_max, display_name, display_color, sort_order) VALUES
('CORE_ETF', 50, 65, 'Core ETFs', '#3b82f6', 1),
('QUALITY_STOCK', 15, 25, 'Quality Stocks', '#22c55e', 2),
('SPECULATIVE', 2, 5, 'Speculative', '#f59e0b', 3),
('CRYPTO', 5, 10, 'Crypto', '#8b5cf6', 4),
('COMMODITY', 5, 15, 'Commodities', '#6b7280', 5),
('CASH', 5, 10, 'Cash Buffer', '#94a3b8', 6)
ON CONFLICT (bucket) DO NOTHING;

INSERT INTO settings (key, value, description) VALUES
('single_stock_cap', '7', 'Max single stock % of total portfolio'),
('aed_usd_rate', '3.6725', 'AED/USD peg rate'),
('base_currency', 'USD', 'Primary display currency'),
('tax_rate', '0', 'Capital gains tax rate (UAE = 0%)'),
('broker', 'Wio Invest', 'Primary broker name')
ON CONFLICT (key) DO NOTHING;

INSERT INTO earnings_calendar (ticker, earnings_date, timing) VALUES
('UNH', '2026-04-21', 'BMO'),
('TSLA', '2026-04-22', 'AMC'),
('GOOGL', '2026-04-29', 'AMC'),
('MSFT', '2026-04-29', 'AMC'),
('META', '2026-04-30', 'AMC'),
('AMZN', '2026-05-01', 'AMC'),
('AAPL', '2026-05-01', 'AMC'),
('AMD', '2026-05-06', 'AMC'),
('PEP', '2026-04-17', 'BMO'),
('NKE', '2026-06-26', 'AMC')
ON CONFLICT (ticker, earnings_date) DO NOTHING;
"""

data = json.dumps({'query': ddl_with_seeds}).encode('utf-8')
req = urllib.request.Request(
    'https://api.supabase.com/v1/projects/vgakkzbglulhxlbjmosb/database/query',
    data=data,
    headers={
        'Authorization': f'Bearer {os.environ.get("SUPABASE_ACCESS_TOKEN", "")}',
        'Content-Type': 'application/json'
    }
)
try:
    resp = urllib.request.urlopen(req)
    print('SUCCESS:', resp.read().decode())
except Exception as e:
    print('ERROR:', e)
    if hasattr(e, 'read'):
        print(e.read().decode())
