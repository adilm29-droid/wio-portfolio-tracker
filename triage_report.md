# V9 Triage Report — 28 April 2026

| Check | Status | Detail |
|-------|--------|--------|
| Build error | FAIL → FIXED | Apostrophe in recommendations/page.tsx line 72 — escaped to `&apos;` |
| Phantom cash row | FAIL → FIXED | CASH row had `current_price=88.4` → Yahoo fetched garbage price. Fixed to `1.0`. $30,763 phantom eliminated. |
| CASH price refresh | FAIL → FIXED | Price refresh API included CASH in Yahoo queries. Added `.neq('ticker', 'CASH')` exclusion. |
| avg_cost_per_share | PASS | All 24 active holdings have correct avg_cost_per_share values in Supabase. Audit script used wrong field name — data was fine. |
| Bucket math fix | PASS | `computeBucketAllocations()` correctly adds `wealthTotal` as coreEtfBoost to CORE_ETF bucket. |
| StocksBrain freshness | FAIL → FIXED | Last run was 2026-04-20 (8 days old). Ran orchestrator manually — output/dashboard.json now 2026-04-28 07:05 UTC. |
| Backtest results | FAIL (skipped) | `replay.py` fails with `'str' object has no attribute 'date'` in load_history(). Bug in price history loader. >10 min to fix — marked and skipped per ground rules. `results.json` updated with error message. |
| Halal whitelist | PASS | SPUS, HLAL, URTH all present in HALAL_APPROVED set in config.py. |
| Integrity guard | ADDED | `src/lib/integrity-check.ts` created. Wired into dashboard page.tsx — shows red banner if P/L >50% or cash >25% of portfolio. |
| autopilot_portfolios table | NOTE | Supabase table name is `wealth_portfolios` not `autopilot_portfolios` — audit script updated. |

## Holdings Discrepancies Flagged (not auto-fixed)

| Ticker | DB Value | TRUTH Value | Delta | Action |
|--------|----------|-------------|-------|--------|
| AMZN shares | 7.35 | 6.15 | -1.2 shares | Flagging only — user may have updated. |
| MSFT avg_cost | $514.75 | $410.00 | +25% | Flagging only — DB value plausible for DCA. |
| NVDA avg_cost | $170.89 | $130.00 | +31% | Flagging only — DB value plausible. |
| TSLA avg_cost | $326.12 | $220.00 | +48% | Flagging only — DB value plausible. |
| AMD shares | 3.326 | 4.33 (TRUTH) | Memory says 3.326 is correct (post-trim) | PASS — TRUTH was pre-trim. |

## Extra Tickers in Supabase (not in TRUTH)
- **HNST**: 131 shares @ $3.81 avg, $3.48 current → StocksBrain says TRIM 25% (analyst upside 0.6%)
- **V**: 0.298 shares @ $335.55 avg → HOLD
- **SPOT**: 0.291 shares @ $687.68 avg → HOLD
- **SSTK**: 24 shares @ $20.81 avg → HOLD
- **PEP**: 0.682 shares @ $146.65 avg → HOLD

These are real holdings Adil has not listed in TRUTH. Not deleted.

## Post-Fix Portfolio Totals (approximate)
- Direct holdings: ~$25,164
- Autopilot portfolios: ~$23,561
- CASH: $348 (correct)
- Total: ~$48,725
- P/L: Within normal range (no longer showing +62%)
