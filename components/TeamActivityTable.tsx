'use client'
import { useDashboard } from '@/lib/dashboard-context'

function parseSync(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}

export function TeamActivityTable() {
  const { data, selectedDate } = useDashboard()
  if (!data) return null

  const nowMs = Date.now()
  const SIX_HOURS = 6 * 60 * 60 * 1000

  const rows = data.userActivity
    .filter(r => !selectedDate || r.date === selectedDate)
    .sort((a, b) =>
      a.health_facility.localeCompare(b.health_facility) ||
      a.user_name.localeCompare(b.user_name)
    )

  const thClass =
    'px-4 py-3 text-left font-condensed text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500 whitespace-nowrap'

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={thClass}>Health Facility</th>
            <th className={thClass}>User</th>
            <th className={thClass}>Date</th>
            <th className={`${thClass} text-right`}>Enum. Records</th>
            <th className={`${thClass} text-right`}>Eligible Children</th>
            <th className={`${thClass} text-right`}>Vaccinated</th>
            <th className={thClass}>Last Sync</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const syncMs = parseSync(r.last_sync_time).getTime()
            const stale = nowMs - syncMs > SIX_HOURS
            const time = r.last_sync_time.split(' ')[1]?.slice(0, 5) ?? r.last_sync_time
            return (
              <tr
                key={i}
                className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <td className="px-4 py-3 font-medium text-[13px] text-slate-800">
                  {r.health_facility}
                </td>
                <td className="px-4 py-3 text-[13px] text-slate-600">{r.user_name}</td>
                <td className="px-4 py-3 font-data text-[11px] text-slate-400">{r.date}</td>
                <td className="px-4 py-3 text-right font-data text-[12px] text-slate-600">
                  {r.enumeration_records.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-data text-[12px] text-slate-600">
                  {r.eligible_children.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-data text-[12px] text-green-700 font-semibold">
                  {r.vaccinated.toLocaleString()}
                </td>
                <td className={`px-4 py-3 font-data text-[11px] ${stale ? 'text-red-600' : 'text-slate-500'}`}>
                  {time}
                  {stale && (
                    <span className="ml-1.5 text-[9px] font-bold tracking-[0.1em] uppercase text-red-500 align-middle">
                      stale
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
