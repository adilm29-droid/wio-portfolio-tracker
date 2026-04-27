'use client'

import { AlertTriangle } from 'lucide-react'

const FRAMEWORKS = [
  {
    name: 'Goldman GS Sustain',
    shortName: 'GS',
    focus: 'Long-term winners via ROCE, market positioning, management quality, ESG',
    signals: ['ROE > 15%', 'Profit margin > 15%', 'Revenue growth > 10%', 'Low debt (D/E < 50)'],
    color: 'text-blue-400',
    border: 'border-blue-800/40',
  },
  {
    name: 'Bridgewater All-Weather',
    shortName: 'BW',
    focus: 'Risk parity across inflation/deflation/growth regimes',
    signals: ['Beta vs VIX regime', 'Dividend yield', 'Sector regime fit', 'Currency exposure'],
    color: 'text-purple-400',
    border: 'border-purple-800/40',
  },
  {
    name: 'JPMorgan Earnings Momentum',
    shortName: 'JPM',
    focus: 'Earnings history, estimate revisions, guidance trajectory',
    signals: ['Earnings beat + raised guide', 'Analyst upside >20%', 'Fwd PE < Trailing PE', 'EPS QoQ growth'],
    color: 'text-green-400',
    border: 'border-green-800/40',
  },
  {
    name: 'BlackRock 6-Factor',
    shortName: 'BLK',
    focus: 'Value + Momentum + Quality + Size + Volatility + Yield composite',
    signals: ['P/E 0–60', 'Above 200MA, RSI 40–75', 'ROE + gross margin', 'Beta < 0.8 for low-vol premium'],
    color: 'text-amber-400',
    border: 'border-amber-800/40',
  },
  {
    name: 'Citadel Mean-Reversion',
    shortName: 'CIT',
    focus: 'Stat-arb signals: RSI extremes, Bollinger positioning, sector strength',
    signals: ['RSI < 30 = strong buy', 'RSI > 75 = overbought', 'Price vs 200MA z-score', 'Volume divergence'],
    color: 'text-red-400',
    border: 'border-red-800/40',
  },
  {
    name: 'Renaissance Patterns',
    shortName: 'REN',
    focus: 'Chart patterns, seasonality, earnings drift, day-of-week effects',
    signals: ['Post-beat drift (30–60d)', 'Jan/Nov seasonality', 'Healthy uptrend pattern', 'Summer weakness (May–Aug)'],
    color: 'text-cyan-400',
    border: 'border-cyan-800/40',
  },
  {
    name: 'Two Sigma Alt-Data',
    shortName: '2SIG',
    focus: 'News velocity, web traffic proxies, analyst revision momentum',
    signals: ['Positive news momentum (3+ articles)', 'Analyst upside > 25%', 'Post-beat signal', 'Thesis break flags'],
    color: 'text-orange-400',
    border: 'border-orange-800/40',
  },
  {
    name: 'AQR Value + Momentum',
    shortName: 'AQR',
    focus: 'High momentum + low valuation = rare gem vs overvalued + no momentum = trap',
    signals: ['Above 200MA + RSI 45–75', 'P/E < 25 or P/S < 5', 'Value-momentum gem combo', 'Avoids momentum traps'],
    color: 'text-pink-400',
    border: 'border-pink-800/40',
  },
  {
    name: 'Berkshire Moat',
    shortName: 'BRK',
    focus: 'Brand, network effects, switching costs, patents, regulatory moats',
    signals: ['Wide moat (5/5)', 'Narrow moat (3–4/5)', 'Fair price for moat width', 'Brand pricing power'],
    color: 'text-yellow-400',
    border: 'border-yellow-800/40',
  },
]

export default function FrameworksPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Institutional Frameworks</h1>
        <p className="text-zinc-400 text-sm mt-1">9 simplified implementations of Goldman, Bridgewater, JPM, BlackRock, Citadel, Renaissance, Two Sigma, AQR, Berkshire</p>
      </div>

      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-zinc-800/60 border border-zinc-700">
        <AlertTriangle size={16} className="text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400">These are simplified educational implementations using free public data. Real institutional models use proprietary data, proprietary factor libraries, and orders-of-magnitude more compute than this system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMEWORKS.map(f => (
          <div key={f.name} className={`bg-zinc-900 rounded-xl border ${f.border} p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-lg font-black ${f.color}`}>{f.shortName}</span>
              <div>
                <p className="text-sm font-bold text-white">{f.name}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-3">{f.focus}</p>
            <div className="space-y-1.5">
              {f.signals.map(s => (
                <div key={s} className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${f.color.replace('text-', 'bg-')}`} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-lg font-bold text-white mb-2">Combined Framework Score</h2>
        <p className="text-sm text-zinc-400">All 9 frameworks run for each holding via StocksBrain. Each returns -2 to +2. Weighted aggregate (factor-specific weights) produces a final institutional score that contributes 1.5x weight in the 14-factor decision engine.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">Max possible</p>
            <p className="text-lg font-bold text-green-400">+18</p>
          </div>
          <div className="p-3 bg-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">Min possible</p>
            <p className="text-lg font-bold text-red-400">-18</p>
          </div>
          <div className="p-3 bg-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500">Weight in engine</p>
            <p className="text-lg font-bold text-white">1.5×</p>
          </div>
        </div>
      </div>
    </div>
  )
}
