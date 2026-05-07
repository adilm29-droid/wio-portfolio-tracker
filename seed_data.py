import urllib.request
import json
import os

BASE_URL = "https://vgakkzbglulhxlbjmosb.supabase.co/rest/v1"
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def post(table, data):
    url = f"{BASE_URL}/{table}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=HEADERS, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        print(f"  OK {table}: {resp.status}")
        return True
    except Exception as e:
        print(f"  ERR {table}: {e}")
        if hasattr(e, "read"):
            print("  ", e.read().decode())
        return False

def delete_all(table):
    url = f"{BASE_URL}/{table}?id=neq.00000000-0000-0000-0000-000000000000"
    req = urllib.request.Request(url, headers={**HEADERS, "Prefer": "return=minimal"}, method="DELETE")
    try:
        resp = urllib.request.urlopen(req)
        print(f"  Cleared {table}")
    except Exception as e:
        print(f"  Clear {table} err: {e}")

# Clear existing holdings and wealth data
delete_all("wealth_portfolio_holdings")
delete_all("wealth_portfolios")
delete_all("holdings")

# STOCKS
print("Seeding stocks...")
stocks = [
    {"ticker": "AMD", "name": "Advanced Micro Devices", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 6.33, "avg_cost_per_share": 174.40, "current_price": 0, "sector": "Technology"},
    {"ticker": "AMZN", "name": "Amazon.com Inc.", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 7.35, "avg_cost_per_share": 222.30, "current_price": 0, "sector": "Consumer Discretionary"},
    {"ticker": "KO", "name": "Coca-Cola Company", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 1.42, "avg_cost_per_share": 70.44, "current_price": 0, "sector": "Consumer Staples"},
    {"ticker": "META", "name": "Meta Platforms Inc", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 0.55, "avg_cost_per_share": 350.00, "current_price": 0, "sector": "Technology"},
    {"ticker": "MSFT", "name": "Microsoft Corporation", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 1.45, "avg_cost_per_share": 516.00, "current_price": 0, "sector": "Technology"},
    {"ticker": "NKE", "name": "Nike Inc.", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 10.57, "avg_cost_per_share": 61.10, "current_price": 0, "sector": "Consumer Discretionary"},
    {"ticker": "NVDA", "name": "NVIDIA Corporation", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 10.18, "avg_cost_per_share": 151.50, "current_price": 0, "sector": "Technology"},
    {"ticker": "PLTR", "name": "Palantir Technologies", "asset_class": "US_STOCK", "bucket": "SPECULATIVE", "shares": 7.09, "avg_cost_per_share": 162.50, "current_price": 0, "sector": "Technology"},
    {"ticker": "PEP", "name": "Pepsico Inc.", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 0.68, "avg_cost_per_share": 147.00, "current_price": 0, "sector": "Consumer Staples"},
    {"ticker": "SSTK", "name": "Shutterstock Inc.", "asset_class": "US_STOCK", "bucket": "SPECULATIVE", "shares": 24.03, "avg_cost_per_share": 20.81, "current_price": 0, "sector": "Technology"},
    {"ticker": "SPOT", "name": "Spotify Technology", "asset_class": "US_STOCK", "bucket": "SPECULATIVE", "shares": 0.29, "avg_cost_per_share": 690.00, "current_price": 0, "sector": "Technology"},
    {"ticker": "TSLA", "name": "Tesla, Inc.", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 3.21, "avg_cost_per_share": 326.00, "current_price": 0, "sector": "Consumer Discretionary"},
    {"ticker": "HNST", "name": "The Honest Company", "asset_class": "US_STOCK", "bucket": "SPECULATIVE", "shares": 131.27, "avg_cost_per_share": 3.82, "current_price": 0, "sector": "Consumer Staples"},
    {"ticker": "UNH", "name": "UnitedHealth Group", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 4.94, "avg_cost_per_share": 306.00, "current_price": 0, "sector": "Healthcare"},
    {"ticker": "V", "name": "Visa Inc.", "asset_class": "US_STOCK", "bucket": "QUALITY_STOCK", "shares": 0.30, "avg_cost_per_share": 333.00, "current_price": 0, "sector": "Financials"},
]
post("holdings", stocks)

# COMMODITIES
print("Seeding commodities...")
commodities = [
    {"ticker": "GOLD", "name": "Gold", "asset_class": "COMMODITY", "bucket": "COMMODITY", "shares": 0.51789, "avg_cost_per_share": 2336.00, "current_price": 0, "sector": "Precious Metals"},
    {"ticker": "SILVER", "name": "Silver", "asset_class": "COMMODITY", "bucket": "COMMODITY", "shares": 21.74808, "avg_cost_per_share": 72.70, "current_price": 0, "sector": "Precious Metals"},
]
post("holdings", commodities)

# CRYPTO
print("Seeding crypto...")
crypto = [
    {"ticker": "BTC", "name": "Bitcoin", "asset_class": "CRYPTO", "bucket": "CRYPTO", "shares": 0.01466, "avg_cost_per_share": 36400.00, "current_price": 0, "sector": "Cryptocurrency"},
    {"ticker": "ETH", "name": "Ethereum", "asset_class": "CRYPTO", "bucket": "CRYPTO", "shares": 0.42400, "avg_cost_per_share": 10040.00, "current_price": 0, "sector": "Cryptocurrency"},
    {"ticker": "XRP", "name": "Ripple", "asset_class": "CRYPTO", "bucket": "CRYPTO", "shares": 637.18524, "avg_cost_per_share": 8.21, "current_price": 0, "sector": "Cryptocurrency"},
    {"ticker": "SOL", "name": "Solana", "asset_class": "CRYPTO", "bucket": "CRYPTO", "shares": 9.38195, "avg_cost_per_share": 514.00, "current_price": 0, "sector": "Cryptocurrency"},
]
post("holdings", crypto)

# ETFs
print("Seeding ETFs...")
etfs = [
    {"ticker": "URTH", "name": "iShares MSCI World ETF", "asset_class": "ETF", "bucket": "CORE_ETF", "shares": 5.34, "avg_cost_per_share": 187.00, "current_price": 0, "sector": "Broad Market"},
    {"ticker": "SPUS", "name": "SP Funds S&P 500 Sharia ETF", "asset_class": "ETF", "bucket": "CORE_ETF", "shares": 29.15, "avg_cost_per_share": 51.70, "current_price": 0, "sector": "US Large Cap"},
    {"ticker": "HLAL", "name": "Wahed FTSE USA Shariah ETF", "asset_class": "ETF", "bucket": "CORE_ETF", "shares": 16.04, "avg_cost_per_share": 62.50, "current_price": 0, "sector": "US Large Cap"},
]
post("holdings", etfs)

# WEALTH PORTFOLIOS
print("Seeding wealth portfolios...")
portfolios = [
    {"id": "11111111-1111-1111-1111-111111111111", "name": "Cybersecurity & Digital Protection", "total_value": 5137.89, "total_cost": 5800.00, "cash_balance": 18.73, "is_shariah": True},
    {"id": "22222222-2222-2222-2222-222222222222", "name": "FATMAA", "total_value": 5947.66, "total_cost": 5800.00, "cash_balance": 64.30, "is_shariah": True},
    {"id": "33333333-3333-3333-3333-333333333333", "name": "Architects of AI", "total_value": 5855.24, "total_cost": 5800.00, "cash_balance": 95.12, "is_shariah": True},
    {"id": "44444444-4444-4444-4444-444444444444", "name": "Dividend Stocks", "total_value": 6221.55, "total_cost": 5800.00, "cash_balance": 57.65, "is_shariah": True},
]
post("wealth_portfolios", portfolios)

# WEALTH PORTFOLIO HOLDINGS (from schema.sql)
print("Seeding wealth portfolio holdings...")
wph = [
    {"portfolio_id": "22222222-2222-2222-2222-222222222222", "ticker": "GOOGL", "name": "Alphabet Inc.", "shares": 3.0, "value": 1008.06, "weight_percent": 16.95, "sector": "Technology"},
    {"portfolio_id": "22222222-2222-2222-2222-222222222222", "ticker": "TSLA", "name": "Tesla Inc.", "shares": 2.0, "value": 777.80, "weight_percent": 13.08, "sector": "Consumer Discretionary"},
    {"portfolio_id": "22222222-2222-2222-2222-222222222222", "ticker": "AAPL", "name": "Apple Inc.", "shares": 3.0, "value": 790.20, "weight_percent": 13.29, "sector": "Technology"},
    {"portfolio_id": "22222222-2222-2222-2222-222222222222", "ticker": "MSFT", "name": "Microsoft Corp.", "shares": 2.0, "value": 840.52, "weight_percent": 14.13, "sector": "Technology"},
    {"portfolio_id": "22222222-2222-2222-2222-222222222222", "ticker": "META", "name": "Meta Platforms", "shares": 2.0, "value": 1353.74, "weight_percent": 22.76, "sector": "Technology"},
    {"portfolio_id": "22222222-2222-2222-2222-222222222222", "ticker": "AMD", "name": "Advanced Micro Devices", "shares": 4.0, "value": 1113.04, "weight_percent": 18.71, "sector": "Technology"},
    {"portfolio_id": "11111111-1111-1111-1111-111111111111", "ticker": "CSCO", "name": "Cisco Systems", "shares": 10.0, "value": 845.00, "weight_percent": 16.45, "sector": "Technology"},
    {"portfolio_id": "11111111-1111-1111-1111-111111111111", "ticker": "OKTA", "name": "Okta Inc.", "shares": 11.0, "value": 792.11, "weight_percent": 15.42, "sector": "Technology"},
    {"portfolio_id": "11111111-1111-1111-1111-111111111111", "ticker": "PANW", "name": "Palo Alto Networks", "shares": 5.0, "value": 834.85, "weight_percent": 16.25, "sector": "Technology"},
    {"portfolio_id": "11111111-1111-1111-1111-111111111111", "ticker": "NOW", "name": "ServiceNow Inc.", "shares": 8.0, "value": 771.52, "weight_percent": 15.02, "sector": "Technology"},
    {"portfolio_id": "11111111-1111-1111-1111-111111111111", "ticker": "FFIV", "name": "F5 Inc.", "shares": 3.0, "value": 924.18, "weight_percent": 17.99, "sector": "Technology"},
    {"portfolio_id": "11111111-1111-1111-1111-111111111111", "ticker": "TENB", "name": "Tenable Holdings", "shares": 50.0, "value": 951.50, "weight_percent": 18.52, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "AMAT", "name": "Applied Materials", "shares": 1.0, "value": 389.90, "weight_percent": 6.66, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "ADBE", "name": "Adobe Inc.", "shares": 1.0, "value": 248.15, "weight_percent": 4.24, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "LSCC", "name": "Lattice Semiconductor", "shares": 4.0, "value": 447.52, "weight_percent": 7.64, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "SNPS", "name": "Synopsys Inc.", "shares": 1.0, "value": 441.15, "weight_percent": 7.53, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "META", "name": "Meta Platforms", "shares": 1.0, "value": 676.87, "weight_percent": 11.56, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "GOOGL", "name": "Alphabet Inc.", "shares": 1.0, "value": 336.02, "weight_percent": 5.74, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "MRVL", "name": "Marvell Technology", "shares": 4.0, "value": 533.48, "weight_percent": 9.11, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "CDNS", "name": "Cadence Design", "shares": 1.0, "value": 306.96, "weight_percent": 5.24, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "AAPL", "name": "Apple Inc.", "shares": 2.0, "value": 526.80, "weight_percent": 9.00, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "QCOM", "name": "Qualcomm Inc.", "shares": 3.0, "value": 403.41, "weight_percent": 6.89, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "AMD", "name": "Advanced Micro Devices", "shares": 1.0, "value": 278.26, "weight_percent": 4.75, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "TSLA", "name": "Tesla Inc.", "shares": 1.0, "value": 388.90, "weight_percent": 6.64, "sector": "Consumer Discretionary"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "CRM", "name": "Salesforce Inc.", "shares": 2.0, "value": 362.44, "weight_percent": 6.19, "sector": "Technology"},
    {"portfolio_id": "33333333-3333-3333-3333-333333333333", "ticker": "MSFT", "name": "Microsoft Corp.", "shares": 1.0, "value": 420.26, "weight_percent": 7.18, "sector": "Technology"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "XOM", "name": "Exxon Mobil Corp.", "shares": 4.0, "value": 607.92, "weight_percent": 9.77, "sector": "Energy"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "EMR", "name": "Emerson Electric", "shares": 5.0, "value": 701.85, "weight_percent": 11.28, "sector": "Industrials"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "ABT", "name": "Abbott Laboratories", "shares": 7.0, "value": 668.29, "weight_percent": 10.74, "sector": "Healthcare"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "LIN", "name": "Linde plc", "shares": 1.0, "value": 499.22, "weight_percent": 8.02, "sector": "Materials"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "CVX", "name": "Chevron Corp.", "shares": 3.0, "value": 564.45, "weight_percent": 9.07, "sector": "Energy"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "MMM", "name": "3M Company", "shares": 4.0, "value": 602.20, "weight_percent": 9.68, "sector": "Industrials"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "UPS", "name": "United Parcel Service", "shares": 7.0, "value": 735.42, "weight_percent": 11.82, "sector": "Industrials"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "DOV", "name": "Dover Corp.", "shares": 3.0, "value": 642.51, "weight_percent": 10.33, "sector": "Industrials"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "JNJ", "name": "Johnson & Johnson", "shares": 2.0, "value": 469.08, "weight_percent": 7.54, "sector": "Healthcare"},
    {"portfolio_id": "44444444-4444-4444-4444-444444444444", "ticker": "PPG", "name": "PPG Industries", "shares": 6.0, "value": 672.96, "weight_percent": 10.82, "sector": "Materials"},
]
post("wealth_portfolio_holdings", wph)

print("\nDone!")
