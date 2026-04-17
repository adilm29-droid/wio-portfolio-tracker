-- WIO Portfolio Tracker — Full Database Schema
-- Run this in Supabase SQL Editor

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

-- Seed direct holdings
INSERT INTO holdings (ticker, name, asset_class, bucket, shares, avg_cost_per_share, current_price, sector) VALUES
('AMD', 'Advanced Micro Devices', 'US_STOCK', 'QUALITY_STOCK', 6.33, 174.16, 278.26, 'Technology'),
('AMZN', 'Amazon.com Inc.', 'US_STOCK', 'QUALITY_STOCK', 7.35, 224.15, 249.63, 'Technology'),
('NVDA', 'NVIDIA Corporation', 'US_STOCK', 'QUALITY_STOCK', 10.18, 170.89, 198.28, 'Technology'),
('TSLA', 'Tesla, Inc.', 'US_STOCK', 'QUALITY_STOCK', 3.21, 326.12, 388.63, 'Consumer Discretionary'),
('UNH', 'UnitedHealth Group', 'US_STOCK', 'QUALITY_STOCK', 4.94, 305.27, 316.46, 'Healthcare'),
('MSFT', 'Microsoft Corporation', 'US_STOCK', 'QUALITY_STOCK', 1.45, 514.75, 421.62, 'Technology'),
('META', 'Meta Platforms Inc', 'US_STOCK', 'QUALITY_STOCK', 0.55, 631.00, 682.62, 'Technology'),
('PLTR', 'Palantir Technologies', 'US_STOCK', 'QUALITY_STOCK', 7.09, 162.83, 142.66, 'Technology'),
('KO', 'Coca-Cola Company', 'US_STOCK', 'QUALITY_STOCK', 1.42, 70.63, 74.96, 'Consumer Staples'),
('PEP', 'Pepsico Inc.', 'US_STOCK', 'QUALITY_STOCK', 0.68, 146.65, 158.82, 'Consumer Staples'),
('V', 'Visa Inc.', 'US_STOCK', 'QUALITY_STOCK', 0.30, 335.55, 313.03, 'Financials'),
('SPOT', 'Spotify Technology', 'US_STOCK', 'QUALITY_STOCK', 0.29, 687.68, 533.31, 'Technology'),
('NKE', 'Nike Inc.', 'US_STOCK', 'QUALITY_STOCK', 10.57, 62.25, 45.70, 'Consumer Discretionary'),
('DEFT', 'DeFi Technologies', 'US_STOCK', 'SPECULATIVE', 822.01, 1.91, 0.75, 'Technology'),
('DUOL', 'Duolingo Inc.', 'US_STOCK', 'SPECULATIVE', 3.65, 185.99, 103.50, 'Technology'),
('RR', 'Richtech Robotics', 'US_STOCK', 'SPECULATIVE', 49.62, 4.21, 2.39, 'Technology'),
('SSTK', 'Shutterstock Inc.', 'US_STOCK', 'SPECULATIVE', 24.03, 20.81, 17.92, 'Technology'),
('HNST', 'The Honest Company', 'US_STOCK', 'SPECULATIVE', 131.27, 3.81, 3.36, 'Consumer Staples'),
('URTH', 'iShares MSCI World ETF', 'ETF', 'CORE_ETF', 5.34, 187.21, 193.44, 'Broad Market'),
('SPUS', 'SP Funds S&P 500 Sharia ETF', 'ETF', 'CORE_ETF', 29.15, 51.45, 52.40, 'US Large Cap'),
('HLAL', 'Wahed FTSE USA Shariah ETF', 'ETF', 'CORE_ETF', 16.04, 62.35, 64.55, 'US Large Cap'),
('GOLD', 'Gold', 'COMMODITY', 'COMMODITY', 0.51789, 4509.50, 4791.80, 'Precious Metals'),
('SILVER', 'Silver', 'COMMODITY', 'COMMODITY', 21.74808, 72.86, 78.81, 'Precious Metals');

INSERT INTO holdings (ticker, name, asset_class, bucket, shares, avg_cost_per_share, current_price, sector, currency) VALUES
('BTC', 'Bitcoin', 'CRYPTO', 'CRYPTO', 0.01466, 96468.00, 74786.00, 'Cryptocurrency', 'USD'),
('ETH', 'Ethereum', 'CRYPTO', 'CRYPTO', 0.42400, 3419.00, 2324.00, 'Cryptocurrency', 'USD'),
('XRP', 'Ripple', 'CRYPTO', 'CRYPTO', 637.19, 2.28, 1.44, 'Cryptocurrency', 'USD'),
('SOL', 'Solana', 'CRYPTO', 'CRYPTO', 9.382, 14.44, 88.35, 'Cryptocurrency', 'USD');

-- Seed wealth portfolios
INSERT INTO wealth_portfolios (id, name, total_value, total_cost, cash_balance, is_shariah)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'FATMAA', 5947.66, 5800.00, 64.30, true),
  ('22222222-2222-2222-2222-222222222222', 'Cybersecurity & Digital Protection', 5137.89, 5800.00, 18.73, true),
  ('33333333-3333-3333-3333-333333333333', 'Architects of AI', 5855.24, 5800.00, 95.12, true),
  ('44444444-4444-4444-4444-444444444444', 'Dividend Stocks', 6221.55, 5800.00, 57.65, true);

INSERT INTO wealth_portfolio_holdings (portfolio_id, ticker, name, shares, value, weight_percent, sector) VALUES
('11111111-1111-1111-1111-111111111111', 'GOOGL', 'Alphabet Inc.', 3.0, 1008.06, 16.95, 'Technology'),
('11111111-1111-1111-1111-111111111111', 'TSLA', 'Tesla Inc.', 2.0, 777.80, 13.08, 'Consumer Discretionary'),
('11111111-1111-1111-1111-111111111111', 'AAPL', 'Apple Inc.', 3.0, 790.20, 13.29, 'Technology'),
('11111111-1111-1111-1111-111111111111', 'MSFT', 'Microsoft Corp.', 2.0, 840.52, 14.13, 'Technology'),
('11111111-1111-1111-1111-111111111111', 'META', 'Meta Platforms', 2.0, 1353.74, 22.76, 'Technology'),
('11111111-1111-1111-1111-111111111111', 'AMD', 'Advanced Micro Devices', 4.0, 1113.04, 18.71, 'Technology'),
('22222222-2222-2222-2222-222222222222', 'CSCO', 'Cisco Systems', 10.0, 845.00, 16.45, 'Technology'),
('22222222-2222-2222-2222-222222222222', 'OKTA', 'Okta Inc.', 11.0, 792.11, 15.42, 'Technology'),
('22222222-2222-2222-2222-222222222222', 'PANW', 'Palo Alto Networks', 5.0, 834.85, 16.25, 'Technology'),
('22222222-2222-2222-2222-222222222222', 'NOW', 'ServiceNow Inc.', 8.0, 771.52, 15.02, 'Technology'),
('22222222-2222-2222-2222-222222222222', 'FFIV', 'F5 Inc.', 3.0, 924.18, 17.99, 'Technology'),
('22222222-2222-2222-2222-222222222222', 'TENB', 'Tenable Holdings', 50.0, 951.50, 18.52, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'AMAT', 'Applied Materials', 1.0, 389.90, 6.66, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'ADBE', 'Adobe Inc.', 1.0, 248.15, 4.24, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'LSCC', 'Lattice Semiconductor', 4.0, 447.52, 7.64, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'SNPS', 'Synopsys Inc.', 1.0, 441.15, 7.53, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'META', 'Meta Platforms', 1.0, 676.87, 11.56, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'GOOGL', 'Alphabet Inc.', 1.0, 336.02, 5.74, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'MRVL', 'Marvell Technology', 4.0, 533.48, 9.11, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'CDNS', 'Cadence Design', 1.0, 306.96, 5.24, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'AAPL', 'Apple Inc.', 2.0, 526.80, 9.00, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'QCOM', 'Qualcomm Inc.', 3.0, 403.41, 6.89, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'AMD', 'Advanced Micro Devices', 1.0, 278.26, 4.75, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'TSLA', 'Tesla Inc.', 1.0, 388.90, 6.64, 'Consumer Discretionary'),
('33333333-3333-3333-3333-333333333333', 'CRM', 'Salesforce Inc.', 2.0, 362.44, 6.19, 'Technology'),
('33333333-3333-3333-3333-333333333333', 'MSFT', 'Microsoft Corp.', 1.0, 420.26, 7.18, 'Technology'),
('44444444-4444-4444-4444-444444444444', 'XOM', 'Exxon Mobil Corp.', 4.0, 607.92, 9.77, 'Energy'),
('44444444-4444-4444-4444-444444444444', 'EMR', 'Emerson Electric', 5.0, 701.85, 11.28, 'Industrials'),
('44444444-4444-4444-4444-444444444444', 'ABT', 'Abbott Laboratories', 7.0, 668.29, 10.74, 'Healthcare'),
('44444444-4444-4444-4444-444444444444', 'LIN', 'Linde plc', 1.0, 499.22, 8.02, 'Materials'),
('44444444-4444-4444-4444-444444444444', 'CVX', 'Chevron Corp.', 3.0, 564.45, 9.07, 'Energy'),
('44444444-4444-4444-4444-444444444444', 'MMM', '3M Company', 4.0, 602.20, 9.68, 'Industrials'),
('44444444-4444-4444-4444-444444444444', 'UPS', 'United Parcel Service', 7.0, 735.42, 11.82, 'Industrials'),
('44444444-4444-4444-4444-444444444444', 'DOV', 'Dover Corp.', 3.0, 642.51, 10.33, 'Industrials'),
('44444444-4444-4444-4444-444444444444', 'JNJ', 'Johnson & Johnson', 2.0, 469.08, 7.54, 'Healthcare'),
('44444444-4444-4444-4444-444444444444', 'PPG', 'PPG Industries', 6.0, 672.96, 10.82, 'Materials');
