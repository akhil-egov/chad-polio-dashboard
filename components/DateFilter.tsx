'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'

function formatLabel(isoDate: string, hasVacc: boolean) {
  const d = new Date(isoDate + 'T00:00:00')
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return hasVacc ? `${label} +Vacc` : label
}

export function DateFilter({ hideLabel }: { hideLabel?: boolean } = {}) {
  const { data, selectedDate, setSelectedDate } = useDashboard()

  const dates = data
    ? Array.from(
        data.coverage.reduce((map, row) => {
          if (!row.date) return map
          const prev = map.get(row.date) ?? false
          map.set(row.date, prev || row.vaccinated > 0)
          return map
        }, new Map<string, boolean>())
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, hasVacc]) => ({ value: date, label: formatLabel(date, hasVacc) }))
    : []

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!hideLabel && <span className="text-sm font-medium text-gray-500">Day:</span>}
      <Button variant={!selectedDate ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(null)}>All</Button>
      {dates.map(d => (
        <Button key={d.value} variant={selectedDate === d.value ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(d.value)}>
          {d.label}
        </Button>
      ))}
    </div>
  )
}
