-- WIO Portfolio Tracker — Full Database Schema

CREATE TABLE IF NOT EXISTS holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  asset_class VARCHAR(20) NOT NULL DEFAULT 'US_STOCK' CHECK (asset_class IN ('US_STOCK', 'ETF', 'CRYPTO', 'COMMODITY')),
  bucket VARCHAR(20) NOT NULL DEFAULT 'QUALITY_STOCK' CHECK (bucket IN ('CORE_ETF', 'QUALITY_STOCK', 'SPECULATIVE', 'COMMODITY', 'CRYPTO', 'CASH')),
  shares DECIMAL(20,8) NOT NULL DEFAULT 0,
  avg_cost_per_share DECIMAL(20,4) NOT NULL DEFAULT 0,
  current_price DECIMAL(20,4) DEFAULT 0,
  sector VARCHAR(100),
  thesis TEXT,
  invalidation TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  currency VARCHAR(10) DEFAULT 'USD',
  price_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wealth_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  total_value DECIMAL(20,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(20,4) NOT NULL DEFAULT 0,
  cash_balance DECIMAL(20,4) DEFAULT 0,
  is_shariah BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wealth_portfolio_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES wealth_portfolios(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  shares DECIMAL(20,8) NOT NULL DEFAULT 0,
  value DECIMAL(20,4) NOT NULL DEFAULT 0,
  weight_percent DECIMAL(10,4) DEFAULT 0,
  sector VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(200),
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL', 'ADD', 'TRIM', 'EXIT')),
  shares DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,4) NOT NULL,
  thesis TEXT,
  invalidation TEXT,
  confidence VARCHAR(10) CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  outcome VARCHAR(15) CHECK (outcome IN ('WIN', 'LOSS', 'BREAKEVEN')),
  notes TEXT,
  lesson TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  total_value DECIMAL(20,4) NOT NULL,
  direct_holdings_value DECIMAL(20,4),
  wealth_portfolios_value DECIMAL(20,4),
  crypto_value DECIMAL(20,4),
  commodities_value DECIMAL(20,4),
  cash_value DECIMAL(20,4),
  total_pl_dollars DECIMAL(20,4),
  total_pl_percent DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bucket_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket VARCHAR(20) NOT NULL UNIQUE,
  target_min DECIMAL(5,2) NOT NULL,
  target_max DECIMAL(5,2) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  display_color VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS earnings_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  earnings_date DATE NOT NULL,
  timing VARCHAR(20),
  UNIQUE(ticker, earnings_date)
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Permissive policies
CREATE POLICY "Allow all" ON holdings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON wealth_portfolios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON wealth_portfolio_holdings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON trade_journal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON portfolio_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bucket_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON earnings_calendar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Seed bucket targets
INSERT INTO bucket_targets (bucket, target_min, target_max, display_name, display_color, sort_order) VALUES
('CORE_ETF', 50, 65, 'Core ETFs', '#3b82f6', 1),
('QUALITY_STOCK', 15, 25, 'Quality Stocks', '#22c55e', 2),
('SPECULATIVE', 2, 5, 'Speculative', '#f59e0b', 3),
('CRYPTO', 5, 10, 'Crypto', '#8b5cf6', 4),
('COMMODITY', 5, 15, 'Commodities', '#6b7280', 5),
('CASH', 5, 10, 'Cash Buffer', '#94a3b8', 6)
ON CONFLICT (bucket) DO NOTHING;

-- Seed settings
INSERT INTO settings (key, value, description) VALUES
('single_stock_cap', '7', 'Max single stock % of total portfolio'),
('aed_usd_rate', '3.6725', 'AED/USD peg rate'),
('base_currency', 'USD', 'Primary display currency'),
('tax_rate', '0', 'Capital gains tax rate (UAE = 0%)'),
('broker', 'Wio Invest', 'Primary broker name')
ON CONFLICT (key) DO NOTHING;

-- Seed earnings calendar
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
