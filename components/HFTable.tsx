'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { IconAlertCircle } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

type SortKey = 'coverage_pct' | 'missed_children' | 'eligible' | 'reporting_pct'

function Bar({ pct }: { pct: number }) {
  const c = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-200 rounded-full h-2">
        <div className={`${c} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-sm font-medium">{pct}%</span>
    </div>
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

  // Reference date for "today"
  const allDates = data.userActivity.map(r => r.date)
  const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null
  const refDate = selectedDate ?? maxDate

  // Filter hfSummary by date if selected
  const summaryRows = selectedDate
    ? data.hfSummary.filter(r => r.date === selectedDate)
    : data.hfSummary

  // Group hfSummary by health_facility
  const facilityMap = new Map<string, { eligible: number; missed: number; vaccinated: number }>()
  for (const r of summaryRows) {
    const prev = facilityMap.get(r.health_facility) ?? { eligible: 0, missed: 0, vaccinated: 0 }
    facilityMap.set(r.health_facility, {
      eligible: prev.eligible + r.eligible_children_enumerated,
      missed: prev.missed + r.missed_children,
      vaccinated: prev.vaccinated + r.total_vaccinated,
    })
  }

  // Teams from userActivity
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

  // Build rows
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

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800"
      onClick={() => { if (sortKey === k) { setAsc(!asc) } else { setSortKey(k); setAsc(true) } }}
    >
      {label}{sortKey === k ? (asc ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
            <Th label="Coverage %" k="coverage_pct" />
            <Th label="Missed · revisit" k="missed_children" />
            <Th label="Teams reporting" k="reporting_pct" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => {
            const partial = r.reportingTeams < r.totalTeams
            return (
              <tr key={r.health_facility} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.health_facility}</div>
                  <div className="text-xs text-gray-400">{r.totalTeams} teams · {r.eligible.toLocaleString()} eligible</div>
                </td>
                <td className="px-4 py-3"><Bar pct={r.coverage_pct} /></td>
                <td className="px-4 py-3 text-red-600 font-medium">{r.missed_children.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 font-medium ${partial ? 'text-amber-500' : 'text-gray-700'}`}>
                    {partial && <IconAlertCircle size={14} />}
                    {r.reportingTeams}/{r.totalTeams}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={r.coverage_pct >= 80 ? 'default' : r.coverage_pct >= 50 ? 'secondary' : 'destructive'}>
                    {r.coverage_pct >= 80 ? 'On Track' : r.coverage_pct >= 50 ? 'At Risk' : 'Behind'}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
