'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'

function formatLabel(isoDate: string, hasVacc: boolean, lang: string) {
  const d = new Date(isoDate + 'T00:00:00')
  const label = d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' })
  return hasVacc ? `${label} +Vacc` : label
}

export function DateFilter({ hideLabel, dark }: { hideLabel?: boolean; dark?: boolean } = {}) {
  const { data, selectedDate, setSelectedDate, lang, t } = useDashboard()

  const dates = data
    ? (() => {
        const map = new Map<string, boolean>()
        // Vaccination dates — mark hasVacc true
        for (const row of data.coverage) {
          if (!row.date) continue
          map.set(row.date, (map.get(row.date) ?? false) || row.vaccinated > 0)
        }
        // Enumeration-only dates (Jun 3–4 etc) — add without overwriting vacc flag
        for (const row of data.enumeration_daily ?? []) {
          if (!row.date) continue
          if (!map.has(row.date)) map.set(row.date, false)
        }
        return Array.from(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, hasVacc]) => ({ value: date, label: formatLabel(date, hasVacc, lang) }))
      })()
    : []

  if (dark) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-xs">{t('Day:')}</span>
        <button
          onClick={() => setSelectedDate(null)}
          className={`text-xs rounded-full px-3 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${!selectedDate ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
        >
          {t('All')}
        </button>
        {dates.map(d => (
          <button
            key={d.value}
            onClick={() => setSelectedDate(d.value)}
            className={`text-xs rounded-full px-3 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${selectedDate === d.value ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
          >
            {d.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!hideLabel && <span className="text-sm font-medium text-gray-500">{t('Day:')}</span>}
      <Button variant={!selectedDate ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(null)} className="focus-visible:ring-2 focus-visible:ring-[#006EB6]">{t('All')}</Button>
      {dates.map(d => (
        <Button key={d.value} variant={selectedDate === d.value ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(d.value)} className="focus-visible:ring-2 focus-visible:ring-[#006EB6]">
          {d.label}
        </Button>
      ))}
    </div>
  )
}
