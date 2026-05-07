-- Wipe phantom and duplicate data
TRUNCATE TABLE holdings CASCADE;

-- Reset wealth_portfolios to canonical truth
DELETE FROM wealth_portfolios;

-- Insert canonical direct stocks (14 positions)
INSERT INTO holdings (ticker, name, asset_class, bucket, shares, avg_cost_per_share, current_price, sector, is_active, currency) VALUES
('AMD', 'Advanced Micro Devices', 'US_STOCK', 'SPECULATIVE', 1.32560237, 174.16, 421.27, 'Technology', true, 'USD'),
('AMZN', 'Amazon', 'US_STOCK', 'QUALITY_STOCK', 7.35181268, 224.15, 274.99, 'Consumer Discretionary', true, 'USD'),
('BRK.B', 'Berkshire Hathaway B', 'US_STOCK', 'QUALITY_STOCK', 1.07912121, 469.53, 469.75, 'Financials', true, 'USD'),
('GOOGL', 'Alphabet', 'US_STOCK', 'QUALITY_STOCK', 1.82004914, 384.61, 397.99, 'Technology', true, 'USD'),
('KO', 'Coca-Cola', 'US_STOCK', 'QUALITY_STOCK', 1.41585302, 70.63, 79.24, 'Consumer Staples', true, 'USD'),
('META', 'Meta Platforms', 'US_STOCK', 'QUALITY_STOCK', 0.55467511, 631.00, 613.10, 'Technology', true, 'USD'),
('MSFT', 'Microsoft', 'US_STOCK', 'QUALITY_STOCK', 3.65837526, 450.69, 413.97, 'Technology', true, 'USD'),
('NKE', 'Nike', 'US_STOCK', 'QUALITY_STOCK', 17.29868242, 55.38, 43.88, 'Consumer Discretionary', true, 'USD'),
('NVDA', 'NVIDIA', 'US_STOCK', 'QUALITY_STOCK', 10.17663281, 170.89, 207.84, 'Technology', true, 'USD'),
('PEP', 'PepsiCo', 'US_STOCK', 'QUALITY_STOCK', 0.68190124, 146.65, 155.96, 'Consumer Staples', true, 'USD'),
('PLTR', 'Palantir', 'US_STOCK', 'SPECULATIVE', 5.08551806, 162.83, 133.78, 'Technology', true, 'USD'),
('TSLA', 'Tesla', 'US_STOCK', 'SPECULATIVE', 2.20773912, 326.12, 398.89, 'Consumer Discretionary', true, 'USD'),
('UNH', 'UnitedHealth Group', 'US_STOCK', 'QUALITY_STOCK', 4.94367806, 305.27, 367.09, 'Healthcare', true, 'USD'),
('V', 'Visa', 'US_STOCK', 'QUALITY_STOCK', 0.29801924, 335.55, 318.88, 'Financials', true, 'USD');

-- Insert ETFs
INSERT INTO holdings (ticker, name, asset_class, bucket, shares, avg_cost_per_share, current_price, sector, is_active, currency) VALUES
('SPUS', 'SP Funds S&P 500 Sharia ETF', 'ETF', 'CORE_ETF', 68.33868213, 52.58, 55.61, 'ETF', true, 'USD'),
('URTH', 'iShares MSCI World ETF', 'ETF', 'CORE_ETF', 5.341595, 187.21, 200.64, 'ETF', true, 'USD'),
('HLAL', 'Wahed FTSE USA Shariah ETF', 'ETF', 'CORE_ETF', 16.03849238, 62.35, 69.33, 'ETF', true, 'USD');

-- Insert canonical wealth portfolios
INSERT INTO wealth_portfolios (name, total_value, total_cost, cash_balance, is_shariah, is_active) VALUES
('Cybersecurity & Digital Protection', 5502.06, 5833.63, 0, true, true),
('FATMAA', 6579.87, 5856.23, 0, true, true),
('Architects of AI', 6583.14, 5847.87, 0, true, true),
('Dividend Stocks', 6134.62, 5819.12, 0, true, true);
