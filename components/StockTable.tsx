'use client'
import { useState } from 'react'
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

type SortKey = 'vials_issued' | 'vials_returned' | 'vials_used' | 'utilization'

export function StockTable() {
  const { data, mode, t } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('vials_issued')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  const isPublic = mode === 'public'

  const rows = data.stock.map(r => ({
    ...r,
    utilization: r.vials_issued > 0 ? (r.vials_used / r.vials_issued) * 100 : 0,
  })).sort((a, b) =>
    asc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
  )

  const totalIssued = rows.reduce((s, r) => s + r.vials_issued, 0)
  const totalReturned = rows.reduce((s, r) => s + r.vials_returned, 0)
  const totalUsed = rows.reduce((s, r) => s + r.vials_used, 0)

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc)
    else { setSortKey(k); setAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return asc ? <IconChevronUp size={12} className="inline ml-0.5 opacity-50" /> : <IconChevronDown size={12} className="inline ml-0.5 opacity-50" />
  }

  const th = 'px-4 py-3 text-left font-condensed text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 cursor-pointer select-none hover:text-[#009FDB] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FDB] focus-visible:ring-inset'
  const thStatic = 'px-4 py-3 text-left font-condensed text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500'

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { labelKey: 'Total Issued', value: totalIssued, color: '#009FDB' },
          { labelKey: 'Total Returned', value: totalReturned, color: '#ca8a04' },
          { labelKey: 'Total Used', value: totalUsed, color: '#16a34a' },
        ].map(({ labelKey, value, color }) => (
          <div key={labelKey} className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
            <div className="h-[3px]" style={{ background: color }} />
            <div className="px-5 py-4">
              <p className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">{t(labelKey)}</p>
              <p className="font-data text-[1.5rem] font-bold text-slate-800 leading-none mt-1">{value.toLocaleString()}</p>
              <p className="font-condensed text-[10px] text-slate-500 mt-1 uppercase tracking-wide">{t('vials')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className={thStatic}>{t('Facility')}</th>
              <th className={th} onClick={() => handleSort('vials_issued')}>{t('Issued')} <SortIcon k="vials_issued" /></th>
              <th className={th} onClick={() => handleSort('vials_returned')}>{t('Returned')} <SortIcon k="vials_returned" /></th>
              <th className={th} onClick={() => handleSort('vials_used')}>{t('Used')} <SortIcon k="vials_used" /></th>
              <th className={th} onClick={() => handleSort('utilization')}>{t('Utilization')} <SortIcon k="utilization" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const utilColor = isPublic ? 'text-slate-700' : (r.utilization >= 80 ? 'text-green-700' : r.utilization >= 50 ? 'text-amber-600' : 'text-red-600')
              const barColor = isPublic ? '#009FDB' : (r.utilization >= 80 ? '#16a34a' : r.utilization >= 50 ? '#ca8a04' : '#dc2626')
              return (
                <tr key={r.facility_name} className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[13px] text-slate-800">{r.facility_name}</div>
                    <div className="font-data text-[10px] text-slate-500 mt-0.5">{r.facility_id}</div>
                  </td>
                  <td className="px-4 py-3 font-data text-[13px] text-slate-700">{r.vials_issued.toLocaleString()}</td>
                  <td className="px-4 py-3 font-data text-[13px] text-slate-500">{r.vials_returned.toLocaleString()}</td>
                  <td className="px-4 py-3 font-data text-[13px] font-semibold text-slate-800">{r.vials_used.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-[4px]">
                        <div className="h-[4px] rounded-full" style={{ width: `${Math.min(r.utilization, 100)}%`, background: barColor }} />
                      </div>
                      <span className={`font-data text-[12px] font-semibold ${utilColor}`}>{r.utilization.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
