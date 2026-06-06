'use client'
import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'

interface Delta { value: number; isGood: boolean }

function DeltaChip({ delta, isPublic, t }: { delta: Delta | null; isPublic: boolean; t: (k: string) => string }) {
  if (!delta) return <span className="font-data text-[10px] text-slate-400 tracking-wide">— {t('no prior day')}</span>
  const sign = delta.value >= 0 ? '+' : ''
  if (isPublic) {
    return (
      <span className="font-data text-[10px] font-medium tracking-wide text-slate-500">
        {sign}{delta.value.toLocaleString()} {t('vs yesterday')}
      </span>
    )
  }
  return (
    <span className={`font-data text-[10px] font-medium tracking-wide ${delta.isGood ? 'text-green-600' : 'text-red-500'}`}>
      {delta.isGood ? '↑' : '↓'} {sign}{delta.value.toLocaleString()} {t('vs yesterday')}
    </span>
  )
}

function KPICard({ title, value, sub, accentColor, valueColor, delta, isPublic, t }: {
  title: string; value: string; sub: string; accentColor: string; valueColor?: string; delta?: Delta | null; isPublic: boolean; t: (k: string) => string
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col shadow-sm">
      <div className="h-[3px] w-full flex-none" style={{ background: accentColor }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-slate-500">{title}</p>
        <div className={`font-data text-[2rem] font-bold leading-none tracking-tight ${isPublic ? 'text-slate-800' : (valueColor ?? 'text-slate-800')}`}>{value}</div>
        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-[11px] text-slate-500">{sub}</p>
          <DeltaChip delta={delta ?? null} isPublic={isPublic} t={t} />
        </div>
      </div>
    </div>
  )
}

function prevDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() - 1)
  return dt.toISOString().slice(0, 10)
}

export function KPICards() {
  const { data, selectedDate, mode, t } = useDashboard()
  if (!data) return null

  const isPublic = mode === 'public'

  const enumerated = useMemo(
    () => data.enumeration.reduce((s, r) => s + r.eligible_children, 0),
    [data.enumeration]
  )

  const { vaccinated, pct } = useMemo(() => {
    const rows = selectedDate ? data.coverage.filter(r => r.date === selectedDate) : data.coverage
    const vacc = rows.reduce((s, r) => s + r.vaccinated, 0)
    return { vaccinated: vacc, pct: enumerated > 0 ? Math.round((vacc / enumerated) * 100) : 0 }
  }, [data.coverage, selectedDate, enumerated])

  const missed = Math.max(0, enumerated - vaccinated)

  const { allTeams, todayTeams, refDate } = useMemo(() => {
    const allActivityDates = data.activity.map(r => r.date)
    const maxActivityDate = allActivityDates.length > 0
      ? allActivityDates.reduce((a, b) => (a > b ? a : b))
      : null
    const ref = selectedDate ?? maxActivityDate
    const all = new Set(data.activity.map(r => r.user_name))
    const today = new Set(data.activity.filter(r => r.date === ref).map(r => r.user_name))
    return { allTeams: all, todayTeams: today, refDate: ref }
  }, [data.activity, selectedDate])

  const teamsPct = allTeams.size > 0 ? todayTeams.size / allTeams.size : 0
  const teamsColor = teamsPct < 0.6 ? 'text-red-600' : teamsPct < 0.8 ? 'text-amber-600' : 'text-slate-800'

  const deltas = useMemo((): { vaccinated: Delta | null; teams: Delta | null } => {
    if (!selectedDate) return { vaccinated: null, teams: null }
    const pd = prevDate(selectedDate)
    const prevVacc = data.coverage.filter(r => r.date === pd).reduce((s, r) => s + r.vaccinated, 0)
    const prevTeams = new Set(data.activity.filter(r => r.date === pd).map(r => r.user_name))
    return {
      vaccinated: { value: vaccinated - prevVacc, isGood: vaccinated >= prevVacc },
      teams: { value: todayTeams.size - prevTeams.size, isGood: todayTeams.size >= prevTeams.size },
    }
  }, [data.coverage, data.activity, selectedDate, vaccinated, todayTeams])

  const cols = isPublic ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'

  return (
    <div className={`grid ${cols} gap-4`}>
      <KPICard title={t('Children Enumerated')} value={enumerated.toLocaleString()} sub={t('Eligible 0–59m found')} accentColor="#009FDB" isPublic={isPublic} t={t} />
      <KPICard
        title={t('Vaccinated')}
        value={`${vaccinated.toLocaleString()} (${pct}%)`}
        sub={t('Coverage vs enumerated')}
        accentColor="#16a34a"
        valueColor={pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-slate-800'}
        delta={deltas.vaccinated}
        isPublic={isPublic}
        t={t}
      />
      {!isPublic && (
        <KPICard
          title={t('Missed Children')}
          value={missed.toLocaleString()}
          sub={t('Need revisit')}
          accentColor="#dc2626"
          valueColor={missed > 0 ? 'text-red-600' : 'text-slate-800'}
          isPublic={isPublic}
          t={t}
        />
      )}
      <KPICard
        title={t('Teams Reporting')}
        value={`${todayTeams.size} / ${allTeams.size}`}
        sub={t('Active today')}
        accentColor="#7c3aed"
        valueColor={teamsColor}
        delta={deltas.teams}
        isPublic={isPublic}
        t={t}
      />
    </div>
  )
}
