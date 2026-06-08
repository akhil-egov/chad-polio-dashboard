'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { COLORS } from '@/lib/constants'

const SETTLEMENT_COLORS: Record<string, string> = {
  URBAN: COLORS.WHO_BLUE,
  RURAL: '#16a34a',
  SLUMS: '#ca8a04',
  NOMADS_PASTORALISTS: '#7c3aed',
}

export function SettlementPanel() {
  const { data, mode, t } = useDashboard()
  if (!data) return null

  const isPublic = mode === 'public'

  const rows = [...data.settlement]
    .filter(r => r.settlement_type !== 'NOMADS_PASTORALISTS')
    .sort((a, b) => b.household_count - a.household_count)
  const totalHH = rows.reduce((s, r) => s + r.household_count, 0)
  const totalElig = rows.reduce((s, r) => s + r.eligible_children, 0)
  const totalVax = rows.reduce((s, r) => s + r.vaccinated, 0)
  const overallPct = totalElig > 0 ? (totalVax / totalElig) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rows.map(r => {
          const color = SETTLEMENT_COLORS[r.settlement_type] ?? COLORS.TEXT_SECONDARY
          const pctColor = isPublic
            ? 'text-slate-700'
            : (r.pct_complete >= 80 ? 'text-green-700' : r.pct_complete >= 50 ? 'text-amber-600' : 'text-red-600')
          return (
            <div key={r.settlement_type} className="bg-white rounded-lg shadow-sm overflow-hidden border" style={{ borderColor: COLORS.BORDER }}>
              <div className="h-[4px]" style={{ background: color }} />
              <div className="p-4 space-y-3">
                <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500">
                  {t(r.settlement_type)}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] uppercase tracking-wide text-slate-500">{t('Households')}</span>
                    <span className="text-[13px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{r.household_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] uppercase tracking-wide text-slate-500">{t('Eligible')}</span>
                    <span className="text-[13px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{r.eligible_children.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] uppercase tracking-wide text-slate-500">{t('Vaccinated')}</span>
                    <span className="text-[13px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{r.vaccinated.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="w-full bg-slate-200 rounded-full h-[4px] mb-1">
                    <div className="h-[4px] rounded-full transition-all" style={{ width: `${Math.min(r.pct_complete, 100)}%`, background: color }} />
                  </div>
                  <p className={`text-[13px] font-bold ${pctColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{r.pct_complete.toFixed(1)}% {t('coverage')}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison bar */}
      <div className="bg-white rounded-lg shadow-sm p-5 border" style={{ borderColor: COLORS.BORDER }}>
        <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500 mb-3">
          {totalHH.toLocaleString()} {t('total households')}
        </p>
        <div className="flex h-5 rounded overflow-hidden gap-px">
          {rows.filter(r => r.household_count > 0).map(r => {
            const pct = totalHH > 0 ? (r.household_count / totalHH) * 100 : 0
            const color = SETTLEMENT_COLORS[r.settlement_type] ?? COLORS.TEXT_SECONDARY
            return (
              <div
                key={r.settlement_type}
                className="relative group"
                style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? 2 : 0 }}
                title={`${t(r.settlement_type)}: ${r.household_count.toLocaleString()} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {rows.filter(r => r.household_count > 0).map(r => {
            const color = SETTLEMENT_COLORS[r.settlement_type] ?? COLORS.TEXT_SECONDARY
            const pct = totalHH > 0 ? (r.household_count / totalHH) * 100 : 0
            return (
              <div key={r.settlement_type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>{t(r.settlement_type)}</span>
                <span className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
