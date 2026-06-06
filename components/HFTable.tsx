'use client'
import { useState } from 'react'
import { IconAlertCircle, IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

type SortKey = 'coverage_pct' | 'missed_children' | 'eligible' | 'reporting_pct'

function CoverageBar({ pct }: { pct: number }) {
  const barColor =
    pct >= 80 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'
  const textColor =
    pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-20 bg-slate-200 rounded-full h-[4px]">
        <div
          className="h-[4px] rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>
      <span className={`font-data text-[12px] font-semibold ${textColor}`}>{pct}%</span>
    </div>
  )
}

function StatusBadge({ pct }: { pct: number }) {
  if (pct >= 80) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        On Track
      </span>
    )
  }
  if (pct >= 50) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        At Risk
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Behind
    </span>
  )
}

interface FacilityRow {
  health_facility: string
  eligible: number
  missed_children: number
  coverage_pct: number
  totalTeams: number
  reportingTeams: number
  reporting_pct: number
}

export function HFTable() {
  const { data, selectedDate } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('missed_children')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  const allDates = data.userActivity.map(r => r.date)
  const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null
  const refDate = selectedDate ?? maxDate

  // hfSummary is campaign-level cumulative; always show all rows regardless of date filter
  const summaryRows = data.hfSummary

  const facilityMap = new Map<string, { eligible: number; missed: number; vaccinated: number }>()
  for (const r of summaryRows) {
    const prev = facilityMap.get(r.health_facility) ?? { eligible: 0, missed: 0, vaccinated: 0 }
    facilityMap.set(r.health_facility, {
      eligible: prev.eligible + r.eligible_children_enumerated,
      missed: prev.missed + r.missed_children,
      vaccinated: prev.vaccinated + r.total_vaccinated,
    })
  }

  const totalTeamsByHF = new Map<string, Set<string>>()
  const reportingTeamsByHF = new Map<string, Set<string>>()
  for (const r of data.userActivity) {
    if (!totalTeamsByHF.has(r.health_facility)) totalTeamsByHF.set(r.health_facility, new Set())
    totalTeamsByHF.get(r.health_facility)!.add(r.user_name)
    if (r.date === refDate) {
      if (!reportingTeamsByHF.has(r.health_facility)) reportingTeamsByHF.set(r.health_facility, new Set())
      reportingTeamsByHF.get(r.health_facility)!.add(r.user_name)
    }
  }

  const rows: FacilityRow[] = Array.from(facilityMap.entries()).map(([hf, vals]) => {
    const coverage_pct = vals.eligible > 0 ? Math.round((vals.vaccinated / vals.eligible) * 100) : 0
    const totalTeams = totalTeamsByHF.get(hf)?.size ?? 0
    const reportingTeams = reportingTeamsByHF.get(hf)?.size ?? 0
    const reporting_pct = totalTeams > 0 ? reportingTeams / totalTeams : 0
    return {
      health_facility: hf,
      eligible: vals.eligible,
      missed_children: vals.missed,
      coverage_pct,
      totalTeams,
      reportingTeams,
      reporting_pct,
    }
  }).sort((a, b) =>
    asc
      ? (a[sortKey] as number) - (b[sortKey] as number)
      : (b[sortKey] as number) - (a[sortKey] as number)
  )

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return asc
      ? <IconChevronUp size={12} className="inline ml-0.5 opacity-50" />
      : <IconChevronDown size={12} className="inline ml-0.5 opacity-50" />
  }

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc)
    else { setSortKey(k); setAsc(true) }
  }

  const thBase =
    'px-4 py-3 text-left font-condensed text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500 cursor-pointer select-none hover:text-[#009FDB] transition-colors whitespace-nowrap'
  const thStatic =
    'px-4 py-3 text-left font-condensed text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500'

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={thStatic}>Facility</th>
            <th className={thBase} onClick={() => handleSort('coverage_pct')}>
              Coverage % <SortIcon k="coverage_pct" />
            </th>
            <th className={thBase} onClick={() => handleSort('missed_children')}>
              Missed · Revisit <SortIcon k="missed_children" />
            </th>
            <th className={thBase} onClick={() => handleSort('reporting_pct')}>
              Teams Reporting <SortIcon k="reporting_pct" />
            </th>
            <th className={thStatic}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const partial = r.reportingTeams < r.totalTeams
            return (
              <tr
                key={r.health_facility}
                className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[13px] text-slate-800">{r.health_facility}</div>
                  <div className="font-data text-[10px] text-slate-400 mt-0.5">
                    {r.totalTeams} teams · {r.eligible.toLocaleString()} eligible
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CoverageBar pct={r.coverage_pct} />
                </td>
                <td className="px-4 py-3">
                  <span className={`font-data text-[13px] font-semibold ${r.missed_children > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {r.missed_children.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-data text-[12px] font-medium flex items-center gap-1.5 ${
                      partial ? 'text-amber-600' : 'text-slate-500'
                    }`}
                  >
                    {partial && <IconAlertCircle size={12} className="shrink-0" />}
                    {r.reportingTeams}/{r.totalTeams}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge pct={r.coverage_pct} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
