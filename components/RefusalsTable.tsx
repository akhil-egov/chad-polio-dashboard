'use client'
import { useDashboard } from '@/lib/dashboard-context'

function formatReason(code: string): string {
  return code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export function RefusalsTable() {
  const { data, t } = useDashboard()
  if (!data) return null

  const byReason = new Map<string, number>()
  for (const r of data.refusals) {
    byReason.set(r.reason_code, (byReason.get(r.reason_code) ?? 0) + r.count)
  }
  const reasonTotals = [...byReason.entries()].sort((a, b) => b[1] - a[1])
  const grandTotal = reasonTotals.reduce((s, [, c]) => s + c, 0)
  const maxCount = reasonTotals[0]?.[1] ?? 1

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

  return (
    <div className="space-y-5">
      {/* Summary by reason */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-5">
        <h3 className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-[#009FDB] mb-4">
          {t('Refusal Reasons — Campaign Total')} ({grandTotal.toLocaleString()})
        </h3>
        <div className="space-y-3">
          {reasonTotals.map(([code, count]) => (
            <div key={code} className="flex items-center gap-3">
              <div className="w-48 shrink-0 font-condensed text-[11px] text-slate-600 truncate">{formatReason(code)}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-[6px]">
                <div
                  className="h-[6px] rounded-full bg-[#dc2626]"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <div className="w-12 text-right font-data text-[12px] font-semibold text-slate-700">{count}</div>
              <div className="w-10 text-right font-data text-[10px] text-slate-500">{((count / grandTotal) * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-facility breakdown */}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-condensed text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">{t('Facility')}</th>
              {reasonTotals.map(([code]) => (
                <th key={code} className="px-3 py-3 text-center font-condensed text-[10px] font-bold tracking-[0.12em] uppercase text-slate-500 whitespace-nowrap">
                  {formatReason(code)}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-condensed text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {facilityRows.map(([facility_name, { facility_id, reasons, total }], i) => (
              <tr key={facility_name} className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[13px] text-slate-800">{facility_name}</div>
                  <div className="font-data text-[10px] text-slate-500 mt-0.5">{facility_id}</div>
                </td>
                {reasonTotals.map(([code]) => {
                  const count = reasons.get(code) ?? 0
                  return (
                    <td key={code} className="px-3 py-3 text-center font-data text-[13px] text-slate-700">
                      {count > 0 ? count : <span className="text-slate-200">—</span>}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-right font-data text-[13px] font-semibold text-slate-800">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
