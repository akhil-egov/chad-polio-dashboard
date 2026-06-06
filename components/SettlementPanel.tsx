'use client'
import { useDashboard } from '@/lib/dashboard-context'

const SETTLEMENT_COLORS: Record<string, string> = {
  URBAN: '#009FDB',
  RURAL: '#16a34a',
  SLUMS: '#ca8a04',
  NOMADS_PASTORALISTS: '#7c3aed',
}

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export function SettlementPanel() {
  const { data } = useDashboard()
  if (!data) return null

  const rows = [...data.settlement].sort((a, b) => b.household_count - a.household_count)
  const totalHH = rows.reduce((s, r) => s + r.household_count, 0)
  const totalElig = rows.reduce((s, r) => s + r.eligible_children, 0)
  const totalVax = rows.reduce((s, r) => s + r.vaccinated, 0)
  const overallPct = totalElig > 0 ? (totalVax / totalElig) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rows.map(r => {
          const color = SETTLEMENT_COLORS[r.settlement_type] ?? '#64748b'
          const pctColor = r.pct_complete >= 80 ? 'text-green-700' : r.pct_complete >= 50 ? 'text-amber-600' : 'text-red-600'
          return (
            <div key={r.settlement_type} className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
              <div className="h-[3px]" style={{ background: color }} />
              <div className="p-4 space-y-3">
                <p className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">
                  {formatLabel(r.settlement_type)}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-condensed text-[9px] uppercase tracking-wide text-slate-400">Households</span>
                    <span className="font-data text-[13px] font-semibold text-slate-700">{r.household_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-condensed text-[9px] uppercase tracking-wide text-slate-400">Eligible</span>
                    <span className="font-data text-[13px] font-semibold text-slate-700">{r.eligible_children.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-condensed text-[9px] uppercase tracking-wide text-slate-400">Vaccinated</span>
                    <span className="font-data text-[13px] font-semibold text-slate-700">{r.vaccinated.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="w-full bg-slate-200 rounded-full h-[4px] mb-1">
                    <div className="h-[4px] rounded-full transition-all" style={{ width: `${Math.min(r.pct_complete, 100)}%`, background: color }} />
                  </div>
                  <p className={`font-data text-[12px] font-bold ${pctColor}`}>{r.pct_complete.toFixed(1)}% coverage</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison bar */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
        <p className="font-condensed text-[9px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-3">
          Settlement Mix — {totalHH.toLocaleString()} total households
        </p>
        <div className="flex h-5 rounded overflow-hidden gap-px">
          {rows.filter(r => r.household_count > 0).map(r => {
            const pct = totalHH > 0 ? (r.household_count / totalHH) * 100 : 0
            const color = SETTLEMENT_COLORS[r.settlement_type] ?? '#64748b'
            return (
              <div
                key={r.settlement_type}
                className="relative group"
                style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? 2 : 0 }}
                title={`${formatLabel(r.settlement_type)}: ${r.household_count.toLocaleString()} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {rows.filter(r => r.household_count > 0).map(r => {
            const color = SETTLEMENT_COLORS[r.settlement_type] ?? '#64748b'
            const pct = totalHH > 0 ? (r.household_count / totalHH) * 100 : 0
            return (
              <div key={r.settlement_type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="font-condensed text-[10px] text-slate-500">{formatLabel(r.settlement_type)}</span>
                <span className="font-data text-[10px] text-slate-400">{pct.toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
