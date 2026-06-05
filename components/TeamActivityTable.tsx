'use client'
import { useDashboard } from '@/lib/dashboard-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function parseSync(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}

export function TeamActivityTable() {
  const { data, selectedDate } = useDashboard()
  if (!data) return null

  const allTimes = data.userActivity.map(r => parseSync(r.last_sync_time).getTime())
  const nowMs = Math.max(...allTimes)
  const SIX_HOURS = 6 * 60 * 60 * 1000

  const rows = data.userActivity
    .filter(r => !selectedDate || r.date === selectedDate)
    .sort((a, b) =>
      a.health_facility.localeCompare(b.health_facility) ||
      a.user_name.localeCompare(b.user_name)
    )

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Health Facility</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Enum. Records</TableHead>
            <TableHead className="text-right">Eligible Children</TableHead>
            <TableHead className="text-right">Vaccinated</TableHead>
            <TableHead>Last Sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const syncMs = parseSync(r.last_sync_time).getTime()
            const stale = nowMs - syncMs > SIX_HOURS
            const time = r.last_sync_time.split(' ')[1]?.slice(0, 5) ?? r.last_sync_time
            return (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.health_facility}</TableCell>
                <TableCell>{r.user_name}</TableCell>
                <TableCell className="text-gray-500">{r.date}</TableCell>
                <TableCell className="text-right">{r.enumeration_records.toLocaleString()}</TableCell>
                <TableCell className="text-right">{r.eligible_children.toLocaleString()}</TableCell>
                <TableCell className="text-right">{r.vaccinated.toLocaleString()}</TableCell>
                <TableCell className={stale ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  {time}
                  {stale && ' ⚠'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
