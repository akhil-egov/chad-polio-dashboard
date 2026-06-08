'use client'
import { useState, useMemo } from 'react'
import { IconAlertCircle, IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'
import { coverageByFacility, teamActivityByFacility } from '@/lib/campaign-queries'
import { getVisibility } from '@/lib/visibility'
import { CoverageBar } from '@/components/ui/CoverageBar'
import { COLORS } from '@/lib/constants'

type SortKey = 'pct_complete' | 'missed' | 'eligible' | 'reporting_pct'

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

interface FacilityRow {
  facility_name: string
  eligible: number
  missed: number
  pct_complete: number
  totalTeams: number
  reportingTeams: number
  reporting_pct: number
}

export function HFTable() {
  const { data, selectedDate, mode, t } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('missed')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  const vis = getVisibility(mode)

  const refDate = useMemo(() => {
    const allActivityDates = data.activity.map(r => r.date)
    const maxDate = allActivityDates.length > 0 ? allActivityDates.reduce((a, b) => (a > b ? a : b)) : null
    return selectedDate ?? maxDate
  }, [data.activity, selectedDate])

  const reportingTeamsByHF = useMemo(() => {
    const reporting = new Map<string, Set<string>>()
    for (const r of data.activity) {
      if (r.date === refDate) {
        if (!reporting.has(r.facility_name)) reporting.set(r.facility_name, new Set())
        reporting.get(r.facility_name)!.add(r.user_name)
      }
    }
    return reporting
  }, [data.activity, refDate])

  const rows: FacilityRow[] = useMemo(() => {
    const coverage = coverageByFacility(data)
    const teams = teamActivityByFacility(data)
    const teamsByFacility = new Map(teams.map(t => [t.facility_name, t]))

    return coverage.map(r => {
      const missed = Math.max(0, r.eligible_children - r.vaccinated_children)
      const teamRow = teamsByFacility.get(r.facility_name)
      const totalTeams = teamRow?.total_users ?? 0
      const reportingTeams = reportingTeamsByHF.get(r.facility_name)?.size ?? 0
      return {
        facility_name: r.facility_name,
        eligible: r.eligible_children,
        missed,
        pct_complete: r.pct_complete,
        totalTeams,
        reportingTeams,
        reporting_pct: totalTeams > 0 ? reportingTeams / totalTeams : 0,
      }
    }).sort((a, b) =>
      asc
        ? (a[sortKey] as number) - (b[sortKey] as number)
        : (b[sortKey] as number) - (a[sortKey] as number)
    )
  }, [data, reportingTeamsByHF, sortKey, asc])

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return asc ? <IconChevronUp size={13} className="inline ml-0.5 opacity-60" /> : <IconChevronDown size={13} className="inline ml-0.5 opacity-60" />
  }

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc)
    else { setSortKey(k); setAsc(true) }
  }

  const thBase = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase cursor-pointer select-none hover:text-[#006EB6] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006EB6]'
  const thStatic = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase whitespace-nowrap'

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm" style={{ borderColor: '#E5E0D8' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: '#E5E0D8', background: '#FAF8F4' }}>
            <th className={`${thStatic} text-slate-500`}>{t('Facility')}</th>
            <th className={`${thBase} text-slate-500`} onClick={() => handleSort('pct_complete')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('pct_complete')}>{t('Coverage %')} <SortIcon k="pct_complete" /></th>
            <th className={`${thBase} text-slate-500`} onClick={() => handleSort('missed')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('missed')}>{t('Missed · Revisit')} <SortIcon k="missed" /></th>
            <th className={`${thBase} text-slate-500`} onClick={() => handleSort('reporting_pct')} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('reporting_pct')}>{t('Teams Reporting')} <SortIcon k="reporting_pct" /></th>
            {vis.showStatusBadges && <th className={`${thStatic} text-slate-500`}>{t('Status')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const partial = r.reportingTeams < r.totalTeams
            const covColor = vis.showStatusBadges
              ? (r.pct_complete >= 80 ? COLORS.ON_TRACK : r.pct_complete >= 50 ? COLORS.ACTIVE : COLORS.CRITICAL)
              : COLORS.WHO_BLUE
            return (
              <tr key={r.facility_name} className={`border-b transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? 'bg-white' : ''}`} style={{ borderColor: '#F0EBE3' }}>
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-[16px]" style={{ color: COLORS.TEXT_PRIMARY }}>{r.facility_name}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>{r.totalTeams} {t('teams')} · {r.eligible.toLocaleString()} {t('eligible')}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <CoverageBar pct={r.pct_complete} mode={mode} height="h-[5px]" />
                    </div>
                    <span className="text-[17px] font-bold" style={{ color: covColor, fontVariantNumeric: 'tabular-nums' }}>
                      {r.pct_complete.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[16px] font-semibold" style={{ color: r.missed > 0 ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>
                    {r.missed.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[15px] font-medium flex items-center gap-1.5" style={{ color: partial ? COLORS.ACTIVE : COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>
                    {partial && <IconAlertCircle size={14} className="shrink-0" />}
                    <span>{r.reportingTeams}/{r.totalTeams}</span>
                  </span>
                </td>
                {vis.showStatusBadges && <td className="px-4 py-3.5"><StatusBadge pct={r.pct_complete} t={t} /></td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
