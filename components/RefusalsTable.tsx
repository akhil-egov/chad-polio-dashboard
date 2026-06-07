'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { refusalsByReason } from '@/lib/campaign-queries'
import { COLORS, REFUSAL_COLOR } from '@/lib/constants'

function formatReason(code: string): string {
  return code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export function RefusalsTable() {
  const { data, t } = useDashboard()
  if (!data) return null

  const reasonRows = refusalsByReason(data)
  const reasonTotals = reasonRows.map(r => [r.reason, r.count] as [string, number])
  const grandTotal = reasonRows.reduce((s, r) => s + r.count, 0)
  const maxCount = reasonRows[0]?.count ?? 1

  const byFacility = new Map<string, { facility_id: string; reasons: Map<string, number>; total: number }>()
  for (const r of data.refusals) {
    if (!byFacility.has(r.facility_name)) {
      byFacility.set(r.facility_name, { facility_id: r.facility_id, reasons: new Map(), total: 0 })
    }
    const fac = byFacility.get(r.facility_name)!
    fac.reasons.set(r.reason_code, (fac.reasons.get(r.reason_code) ?? 0) + r.count)
    fac.total += r.count
  }
  const facilityRows = [...byFacility.entries()].sort((a, b) => b[1].total - a[1].total)

  const th = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap'
  const thCenter = 'px-3 py-3 text-center text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap'

  return (
    <div className="space-y-5">
      {/* Summary by reason */}
      <div className="bg-white rounded-lg shadow-sm p-5 border" style={{ borderColor: COLORS.BORDER }}>
        <h3 className="text-[15px] font-bold tracking-wide uppercase mb-4" style={{ color: COLORS.WHO_BLUE }}>
          {t('Refusal Reasons — Campaign Total')} ({grandTotal.toLocaleString()})
        </h3>
        <div className="space-y-3">
          {reasonTotals.map(([code, count]) => {
            const barColor = REFUSAL_COLOR[code] ?? COLORS.REFUSAL
            return (
              <div key={code} className="flex items-center gap-3">
                <div className="w-52 shrink-0 text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>{formatReason(code)}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-[6px]">
                  <div
                    className="h-[6px] rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%`, background: barColor }}
                  />
                </div>
                <div className="w-12 text-right text-[13px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
                <div className="w-10 text-right text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{((count / grandTotal) * 100).toFixed(0)}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-facility breakdown */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm" style={{ borderColor: COLORS.BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: COLORS.BORDER, background: '#FAF8F4' }}>
              <th className={th}>{t('Facility')}</th>
              {reasonTotals.map(([code]) => (
                <th key={code} className={thCenter}>{formatReason(code)}</th>
              ))}
              <th className="px-4 py-3 text-right text-[13px] font-bold tracking-wide uppercase text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {facilityRows.map(([facility_name, { facility_id, reasons, total }], i) => (
              <tr key={facility_name} className={`border-b transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? 'bg-white' : ''}`} style={{ borderColor: '#F0EBE3' }}>
                <td className="px-4 py-3.5">
                  <div className="text-[15px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{facility_name}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{facility_id}</div>
                </td>
                {reasonTotals.map(([code]) => {
                  const count = reasons.get(code) ?? 0
                  return (
                    <td key={code} className="px-3 py-3.5 text-center text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>
                      {count > 0 ? count : <span className="text-slate-200">—</span>}
                    </td>
                  )
                })}
                <td className="px-4 py-3.5 text-right text-[14px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
