'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useDashboard } from '@/lib/dashboard-context'

type SortKey = 'coverage_pct' | 'missed_children' | 'eligible_children_enumerated' | 'active_users'

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

export function HFTable() {
  const { data, selectedDate } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('coverage_pct')
  const [asc, setAsc] = useState(true)
  if (!data) return null

  const rows = (selectedDate ? data.hfSummary.filter(r => r.date === selectedDate) : data.hfSummary)
    .map(r => ({ ...r, coverage_pct: r.eligible_children_enumerated > 0 ? Math.round((r.total_vaccinated / r.eligible_children_enumerated) * 100) : 0 }))
    .sort((a, b) => asc ? (a[sortKey] as number) - (b[sortKey] as number) : (b[sortKey] as number) - (a[sortKey] as number))

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800"
      onClick={() => { if (sortKey === k) { setAsc(!asc) } else { setSortKey(k); setAsc(true) } }}>
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
            <Th label="Eligible" k="eligible_children_enumerated" />
            <Th label="Missed" k="missed_children" />
            <Th label="Active Users" k="active_users" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => (
            <tr key={r.health_facility} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{r.health_facility}</td>
              <td className="px-4 py-3"><Bar pct={r.coverage_pct} /></td>
              <td className="px-4 py-3">{r.eligible_children_enumerated.toLocaleString()}</td>
              <td className="px-4 py-3 text-red-600 font-medium">{r.missed_children.toLocaleString()}</td>
              <td className="px-4 py-3">{r.active_users}/{r.total_users}</td>
              <td className="px-4 py-3">
                <Badge variant={r.coverage_pct >= 80 ? 'default' : r.coverage_pct >= 50 ? 'secondary' : 'destructive'}>
                  {r.coverage_pct >= 80 ? 'On Track' : r.coverage_pct >= 50 ? 'At Risk' : 'Behind'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
