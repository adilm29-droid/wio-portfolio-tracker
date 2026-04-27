'use client'

const DECISION_TYPES = [
  { emoji: '🟢', code: 'ADD_TO',              desc: 'Held, dropped >7% on no thesis break, score ≥+5' },
  { emoji: '🟡', code: 'TRIM',                desc: 'Oversized (>7%) AND gain >50% AND signal triggered' },
  { emoji: '🔵', code: 'HOLD',                desc: 'Default — explicit one-line reason always shown' },
  { emoji: '🔴', code: 'EXIT',                desc: 'Speculative class only, thesis broken by data' },
  { emoji: '⭐', code: 'NEW_BUY',             desc: 'Halal universe, score ≥+10, debate 5/6 bull confirm, max 1/week' },
  { emoji: '🎯', code: 'ASYMMETRIC_OPPORTUNITY', desc: 'Rare setup: 8+ triggers align (ServiceNow-style)' },
  { emoji: '🪙', code: 'CRYPTO_RISK',         desc: 'Alt drawdown >40% from entry — debate thesis validity' },
  { emoji: '💰', code: 'CASH_DEPLOYMENT',     desc: 'Ranked action plan when cash buffer filled and available' },
  { emoji: '🌙', code: 'MOONSHOT_OPPORTUNITY',desc: 'Speculative bet — all 8 prerequisites + debate 5/6' },
  { emoji: '🏛️', code: 'CONGRESS_FOLLOW',     desc: 'Watch only — requires independent thesis before acting' },
  { emoji: '⚠️', code: 'POLICY_RISK_ALERT',   desc: 'Material political/regulatory threat to a holding' },
]

const THRESHOLDS = [
  { range: '≥ +10 + debate confirms', decision: 'STRONG BUY', color: 'text-green-400' },
  { range: '+5 to +9',                decision: 'MODERATE BUY (ADD_TO if held)', color: 'text-green-300' },
  { range: '-2 to +4',                decision: 'HOLD', color: 'text-blue-400' },
  { range: '-5 to -3',                decision: 'MODERATE SELL (TRIM if oversized)', color: 'text-amber-400' },
  { range: '≤ -8 + debate confirms',  decision: 'STRONG SELL (EXIT speculative only)', color: 'text-red-400' },
]

export default function DecisionsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Decision Engine</h1>
        <p className="text-zinc-400 text-sm mt-1">11 decision types + 14-factor scoring + bull/bear debate confirmation</p>
      </div>

      {/* Score thresholds */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Score → Decision Thresholds</h2>
          <p className="text-xs text-zinc-500 mt-0.5">14-factor weighted score (max ±22.4) maps to decisions</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {THRESHOLDS.map(t => (
            <div key={t.range} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-zinc-400 font-mono">{t.range}</span>
              <span className={`text-sm font-bold ${t.color}`}>{t.decision}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 11 Decision types */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">11 Decision Types</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {DECISION_TYPES.map(d => (
            <div key={d.code} className="flex items-start gap-3 px-5 py-3">
              <span className="text-base shrink-0">{d.emoji}</span>
              <div>
                <span className="text-sm font-bold text-white font-mono">{d.code}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Required fields for each decision */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-lg font-bold text-white mb-3">Every Decision Shows</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Ticker + Action', 'Confidence %', 'Plain-English reason (1 line)', 'Score breakdown (expandable)', 'Invalidation trigger', 'Time horizon'].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
        <p className="text-xs text-zinc-600">Decision history appears here after StocksBrain has run. Each decision is logged to output/decisions_log.json with full reasoning.</p>
      </div>
    </div>
  )
}
