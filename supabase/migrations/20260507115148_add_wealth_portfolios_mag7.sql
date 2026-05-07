-- Migration: Update wealth portfolio values and add Magnificent 7
-- Date: 2026-05-07
-- Sync values from Wio app context (May 2026)

-- Update existing portfolio values to match current Wio app readings
UPDATE wealth_portfolios SET total_value = 5470.00, total_cost = 5800.00, updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111'; -- Cybersecurity & Digital Protection

UPDATE wealth_portfolios SET total_value = 6518.00, total_cost = 5800.00, updated_at = now()
WHERE id = '22222222-2222-2222-2222-222222222222'; -- FATMAA

UPDATE wealth_portfolios SET total_value = 6528.00, total_cost = 5800.00, updated_at = now()
WHERE id = '33333333-3333-3333-3333-333333333333'; -- Architects of AI

UPDATE wealth_portfolios SET total_value = 6115.00, total_cost = 5800.00, updated_at = now()
WHERE id = '44444444-4444-4444-4444-444444444444'; -- Dividend Stocks

-- Add Magnificent 7 portfolio (placeholder until Wio app value verified)
INSERT INTO wealth_portfolios (id, name, total_value, total_cost, cash_balance, is_shariah, is_active)
VALUES ('55555555-5555-5555-5555-555555555555', 'Magnificent 7', 6000.00, 5800.00, 0.00, true, true)
ON CONFLICT (id) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  total_cost = EXCLUDED.total_cost,
  updated_at = now();
