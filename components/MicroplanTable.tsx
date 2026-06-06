'use client'
import { useState } from 'react'
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'
import { CoverageBar } from '@/components/ui/CoverageBar'

type SortKey = 'pct_complete' | 'gap' | 'achieved' | 'microplan_target'

function StatusBadge({ pct, t }: { pct: number; t: (k: string) => string }) {
  if (pct >= 80) return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {t('On Track')}
    </span>
  )
  if (pct >= 50) return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t('At Risk')}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {t('Behind')}
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

  const th = 'px-4 py-3 text-left font-condensed text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 cursor-pointer select-none hover:text-[#009FDB] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009FDB]'
  const thStatic = 'px-4 py-3 text-left font-condensed text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 whitespace-nowrap'

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-5 py-4 flex flex-wrap gap-6 items-center">
        <div>
          <p className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">{t('Campaign Target')}</p>
          <p className="font-data text-[1.5rem] font-bold text-slate-800 leading-none mt-1">{totalTarget.toLocaleString()}</p>
        </div>
        <div>
          <p className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">{t('Achieved')}</p>
          <p className="font-data text-[1.5rem] font-bold text-slate-800 leading-none mt-1">{totalAchieved.toLocaleString()}</p>
        </div>
        <div>
          <p className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">{t('Gap')}</p>
          <p className={`font-data text-[1.5rem] font-bold leading-none mt-1 ${vis.gapTextClass}`}>
            {(totalTarget - totalAchieved).toLocaleString()}
          </p>
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-2">{t('Overall Progress')}</p>
          <div className="w-full bg-slate-200 rounded-full h-[6px]">
            <div className="h-[6px] rounded-full bg-[#009FDB] transition-all" style={{ width: `${Math.min(overallPct, 100)}%` }} />
          </div>
          <p className="font-data text-[11px] text-slate-500 mt-1">{overallPct.toFixed(1)}% {t('of microplan')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className={thStatic}>{t('Facility')}</th>
              <th className={th} onClick={() => handleSort('microplan_target')}>{t('Target')} <SortIcon k="microplan_target" /></th>
              <th className={th} onClick={() => handleSort('achieved')}>{t('Achieved')} <SortIcon k="achieved" /></th>
              <th className={th} onClick={() => handleSort('pct_complete')}>{t('Progress')} <SortIcon k="pct_complete" /></th>
              <th className={th} onClick={() => handleSort('gap')}>{t('Gap')} <SortIcon k="gap" /></th>
              {vis.showStatusBadges && <th className={thStatic}>{t('Status')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.facility_name} className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[13px] text-slate-800">{r.facility_name}</div>
                  <div className="font-data text-[10px] text-slate-500 mt-0.5">{r.facility_id}</div>
                </td>
                <td className="px-4 py-3 font-data text-[13px] text-slate-600">{r.microplan_target.toLocaleString()}</td>
                <td className="px-4 py-3 font-data text-[13px] font-semibold text-slate-800">{r.achieved.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-24">
                      <CoverageBar pct={r.pct_complete} mode={mode} height="h-[4px]" />
                    </div>
                    <span className={`font-data text-[12px] font-semibold ${vis.showStatusBadges ? (r.pct_complete >= 80 ? 'text-green-700' : r.pct_complete >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-700'}`}>
                      {r.pct_complete.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-data text-[13px] font-semibold ${vis.showGapNumbers ? (r.gap > 0 ? 'text-red-600' : 'text-green-600') : 'text-slate-700'}`}>
                    {r.gap.toLocaleString()}
                  </span>
                </td>
                {vis.showStatusBadges && <td className="px-4 py-3"><StatusBadge pct={r.pct_complete} t={t} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
