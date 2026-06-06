'use client'
import { useDashboard } from '@/lib/dashboard-context'

interface Delta { value: number; isGood: boolean }

function DeltaChip({ delta }: { delta: Delta | null }) {
  if (!delta) return <span className="font-data text-[10px] text-slate-300 tracking-wide">— no prior day</span>
  const sign = delta.value >= 0 ? '+' : ''
  return (
    <span className={`font-data text-[10px] font-medium tracking-wide ${delta.isGood ? 'text-green-600' : 'text-red-500'}`}>
      {delta.isGood ? '↑' : '↓'} {sign}{delta.value.toLocaleString()} vs yesterday
    </span>
  )
}

function KPICard({ title, value, sub, accentColor, valueColor, delta }: {
  title: string; value: string; sub: string; accentColor: string; valueColor?: string; delta?: Delta | null
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col shadow-sm">
      <div className="h-[3px] w-full flex-none" style={{ background: accentColor }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-slate-400">{title}</p>
        <div className={`font-data text-[2rem] font-bold leading-none tracking-tight ${valueColor ?? 'text-slate-800'}`}>{value}</div>
        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-[11px] text-slate-400">{sub}</p>
          <DeltaChip delta={delta ?? null} />
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
  const { data, selectedDate } = useDashboard()
  if (!data) return null

  // Enumerated: cumulative from enumeration sheet (no date)
  const enumerated = data.enumeration.reduce((s, r) => s + r.eligible_children, 0)

  // Vaccinated: from coverage, filtered by date
  const covRows = selectedDate
    ? data.coverage.filter(r => r.date === selectedDate)
    : data.coverage
  const vaccinated = covRows.reduce((s, r) => s + r.vaccinated, 0)
  const missed = Math.max(0, enumerated - vaccinated)
  const pct = enumerated > 0 ? Math.round((vaccinated / enumerated) * 100) : 0

  // Teams
  const allActivityDates = data.activity.map(r => r.date)
  const maxActivityDate = allActivityDates.length > 0
    ? allActivityDates.reduce((a, b) => (a > b ? a : b))
    : null
  const refDate = selectedDate ?? maxActivityDate

  const allTeams = new Set(data.activity.map(r => r.user_name))
  const todayTeams = new Set(data.activity.filter(r => r.date === refDate).map(r => r.user_name))
  const teamsPct = allTeams.size > 0 ? todayTeams.size / allTeams.size : 0
  const teamsColor = teamsPct < 0.6 ? 'text-red-600' : teamsPct < 0.8 ? 'text-amber-600' : 'text-slate-800'

  // Deltas
  let deltas: { vaccinated: Delta | null; teams: Delta | null } = { vaccinated: null, teams: null }
  if (selectedDate) {
    const pd = prevDate(selectedDate)
    const prevVacc = data.coverage.filter(r => r.date === pd).reduce((s, r) => s + r.vaccinated, 0)
    const prevTeams = new Set(data.activity.filter(r => r.date === pd).map(r => r.user_name))
    deltas = {
      vaccinated: { value: vaccinated - prevVacc, isGood: vaccinated >= prevVacc },
      teams: { value: todayTeams.size - prevTeams.size, isGood: todayTeams.size >= prevTeams.size },
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard title="Children Enumerated" value={enumerated.toLocaleString()} sub="Eligible 0–59m found" accentColor="#009FDB" />
      <KPICard
        title="Vaccinated"
        value={`${vaccinated.toLocaleString()} (${pct}%)`}
        sub="Coverage vs enumerated"
        accentColor="#16a34a"
        valueColor={pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-slate-800'}
        delta={deltas.vaccinated}
      />
      <KPICard
        title="Missed Children"
        value={missed.toLocaleString()}
        sub="Need revisit"
        accentColor="#dc2626"
        valueColor={missed > 0 ? 'text-red-600' : 'text-slate-800'}
      />
      <KPICard
        title="Teams Reporting"
        value={`${todayTeams.size} / ${allTeams.size}`}
        sub="Active today"
        accentColor="#7c3aed"
        valueColor={teamsColor}
        delta={deltas.teams}
      />
    </div>
  )
}
