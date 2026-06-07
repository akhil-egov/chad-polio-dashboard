'use client'
import { useState } from 'react'
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'
import { CoverageBar } from '@/components/ui/CoverageBar'
import { COLORS } from '@/lib/constants'

type SortKey = 'pct_complete' | 'gap' | 'achieved' | 'microplan_target'

function StatusBadge({ pct, t }: { pct: number; t: (k: string) => string }) {
  if (pct >= 80) return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-sm bg-green-50 border border-green-200" style={{ color: COLORS.ON_TRACK }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.ON_TRACK }} /> {t('On Track')}
    </span>
  )
  if (pct >= 50) return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-sm bg-amber-50 border border-amber-200" style={{ color: COLORS.ACTIVE }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.ACTIVE }} /> {t('At Risk')}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-sm bg-red-50 border border-red-200" style={{ color: COLORS.CRITICAL }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.CRITICAL }} /> {t('Behind')}
    </span>
  )
}

export function MicroplanTable() {
  const { data, mode, t } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('gap')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  const vis = getVisibility(mode)

  const rows = [...data.microplan].sort((a, b) =>
    asc ? (a[sortKey] as number) - (b[sortKey] as number) : (b[sortKey] as number) - (a[sortKey] as number)
  )

  const totalTarget = rows.reduce((s, r) => s + r.microplan_target, 0)
  const totalAchieved = rows.reduce((s, r) => s + r.achieved, 0)
  const overallPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc)
    else { setSortKey(k); setAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return asc ? <IconChevronUp size={12} className="inline ml-0.5 opacity-50" /> : <IconChevronDown size={12} className="inline ml-0.5 opacity-50" />
  }

  const th = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 cursor-pointer select-none hover:text-[#006EB6] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6]'
  const thStatic = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap'

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-white rounded-lg shadow-sm px-5 py-4 flex flex-wrap gap-6 items-center border" style={{ borderColor: COLORS.BORDER }}>
        <div>
          <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500">{t('Campaign Target')}</p>
          <p className="text-[1.5rem] font-bold leading-none mt-1" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{totalTarget.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500">{t('Achieved')}</p>
          <p className="text-[1.5rem] font-bold leading-none mt-1" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{totalAchieved.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500">{t('Gap')}</p>
          <p className={`text-[1.5rem] font-bold leading-none mt-1 ${vis.gapTextClass}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {(totalTarget - totalAchieved).toLocaleString()}
          </p>
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500 mb-2">{t('Overall Progress')}</p>
          <div className="w-full bg-slate-200 rounded-full h-[6px]">
            <div className="h-[6px] rounded-full transition-all" style={{ width: `${Math.min(overallPct, 100)}%`, background: COLORS.WHO_BLUE }} />
          </div>
          <p className="text-[13px] text-slate-500 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{overallPct.toFixed(1)}% {t('of microplan')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm" style={{ borderColor: COLORS.BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: COLORS.BORDER, background: '#FAF8F4' }}>
              <th className={thStatic}>{t('Facility')}</th>
              <th className={th} onClick={() => handleSort('microplan_target')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('microplan_target')}>{t('Target')} <SortIcon k="microplan_target" /></th>
              <th className={th} onClick={() => handleSort('achieved')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('achieved')}>{t('Achieved')} <SortIcon k="achieved" /></th>
              <th className={th} onClick={() => handleSort('pct_complete')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('pct_complete')}>{t('Progress')} <SortIcon k="pct_complete" /></th>
              <th className={th} onClick={() => handleSort('gap')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('gap')}>{t('Gap')} <SortIcon k="gap" /></th>
              {vis.showStatusBadges && <th className={thStatic}>{t('Status')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.facility_name} className={`border-b transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? 'bg-white' : ''}`} style={{ borderColor: '#F0EBE3' }}>
                <td className="px-4 py-3.5">
                  <div className="text-[15px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{r.facility_name}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{r.facility_id}</div>
                </td>
                <td className="px-4 py-3.5 text-[14px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{r.microplan_target.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-[14px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{r.achieved.toLocaleString()}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-24">
                      <CoverageBar pct={r.pct_complete} mode={mode} height="h-[4px]" />
                    </div>
                    <span className={`text-[13px] font-semibold ${vis.showStatusBadges ? (r.pct_complete >= 80 ? 'text-green-700' : r.pct_complete >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.pct_complete.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-[14px] font-semibold ${vis.showGapNumbers ? (r.gap > 0 ? 'text-red-600' : 'text-green-600') : 'text-slate-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.gap.toLocaleString()}
                  </span>
                </td>
                {vis.showStatusBadges && <td className="px-4 py-3.5"><StatusBadge pct={r.pct_complete} t={t} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
