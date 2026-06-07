'use client'
import { useState } from 'react'
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'
import { CoverageBar } from '@/components/ui/CoverageBar'
import { COLORS } from '@/lib/constants'

type SortKey = 'vials_issued' | 'vials_returned' | 'vials_used' | 'utilization'

export function StockTable() {
  const { data, mode, t } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('vials_issued')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  const vis = getVisibility(mode)

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

  const th = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 cursor-pointer select-none hover:text-[#006EB6] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] focus-visible:ring-inset'
  const thStatic = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500'

  const summaryItems = [
    { labelKey: 'Total Issued', value: totalIssued, color: COLORS.WHO_BLUE },
    { labelKey: 'Total Returned', value: totalReturned, color: '#ca8a04' },
    { labelKey: 'Total Used', value: totalUsed, color: COLORS.ON_TRACK },
  ]

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {summaryItems.map(({ labelKey, value, color }) => (
          <div key={labelKey} className="bg-white rounded-lg shadow-sm overflow-hidden border" style={{ borderColor: COLORS.BORDER }}>
            <div className="h-[4px]" style={{ background: color }} />
            <div className="px-5 py-4">
              <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500">{t(labelKey)}</p>
              <p className="text-[1.5rem] font-bold leading-none mt-1" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</p>
              <p className="text-[13px] text-slate-500 mt-1 uppercase tracking-wide">{t('vials')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm" style={{ borderColor: COLORS.BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: COLORS.BORDER, background: '#FAF8F4' }}>
              <th className={thStatic}>{t('Facility')}</th>
              <th className={th} onClick={() => handleSort('vials_issued')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('vials_issued')}>{t('Issued')} <SortIcon k="vials_issued" /></th>
              <th className={th} onClick={() => handleSort('vials_returned')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('vials_returned')}>{t('Returned')} <SortIcon k="vials_returned" /></th>
              <th className={th} onClick={() => handleSort('vials_used')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('vials_used')}>{t('Used')} <SortIcon k="vials_used" /></th>
              <th className={th} onClick={() => handleSort('utilization')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('utilization')}>{t('Utilization')} <SortIcon k="utilization" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.facility_name} className={`border-b transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? 'bg-white' : ''}`} style={{ borderColor: '#F0EBE3' }}>
                <td className="px-4 py-3.5">
                  <div className="text-[15px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{r.facility_name}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{r.facility_id}</div>
                </td>
                <td className="px-4 py-3.5 text-[14px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{r.vials_issued.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-[14px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{r.vials_returned.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-[14px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{r.vials_used.toLocaleString()}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <CoverageBar pct={r.utilization} mode={mode} height="h-[4px]" />
                    </div>
                    <span className={`text-[13px] font-semibold ${vis.showStatusBadges ? (r.utilization >= 80 ? 'text-green-700' : r.utilization >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{r.utilization.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
