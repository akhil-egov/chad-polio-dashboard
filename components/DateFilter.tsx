'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'

const DATES = [
  { label: 'Jun 3', value: '2026-06-03' },
  { label: 'Jun 4', value: '2026-06-04' },
  { label: 'Jun 5 +Vacc', value: '2026-06-05' },
  { label: 'Jun 6 +Vacc', value: '2026-06-06' },
  { label: 'Jun 7 +Vacc', value: '2026-06-07' },
]

export function DateFilter() {
  const { selectedDate, setSelectedDate } = useDashboard()
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-500">Day:</span>
      <Button variant={!selectedDate ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(null)}>All</Button>
      {DATES.map(d => (
        <Button key={d.value} variant={selectedDate === d.value ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(d.value)}>
          {d.label}
        </Button>
      ))}
    </div>
  )
}
