'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '@/lib/dashboard-context'

interface Delta {
  value: number
  isGood: boolean
}

function DeltaRow({ delta }: { delta: Delta | null }) {
  if (!delta) return <p className="text-xs text-gray-300 mt-1">—</p>
  const sign = delta.value >= 0 ? '+' : ''
  const color = delta.isGood ? 'text-green-600' : 'text-red-500'
  const arrow = delta.isGood ? '↑' : '↓'
  return (
    <p className={`text-xs mt-1 font-medium ${color}`}>
      {arrow} {sign}{delta.value.toLocaleString()} vs yesterday
    </p>
  )
}

function KPICard({
  title, value, sub, color, valueColor, delta,
}: {
  title: string
  value: string
  sub: string
  color: string
  valueColor?: string
  delta?: Delta | null
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueColor ?? ''}`}>{value}</div>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
        <DeltaRow delta={delta ?? null} />
      </CardContent>
    </Card>
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

  // Reference date for "today" in Teams Reporting
  const allActivityDates = data.userActivity.map(r => r.date)
  const maxActivityDate = allActivityDates.length > 0
    ? allActivityDates.reduce((a, b) => (a > b ? a : b))
    : null
  const refDate = selectedDate ?? maxActivityDate

  // Daily summary aggregates
  const rows = selectedDate
    ? data.dailySummary.filter(r => r.date === selectedDate)
    : data.dailySummary
  const t = rows.reduce((acc, r) => ({
    enumerated: acc.enumerated + r.total_eligible_children,
    vaccinated: acc.vaccinated + r.total_vaccinated,
    missed: acc.missed + r.total_missed,
    wastage: acc.wastage + (r.total_stock_issued - r.total_stock_returned),
  }), { enumerated: 0, vaccinated: 0, missed: 0, wastage: 0 })

  const pct = t.enumerated > 0 ? Math.round((t.vaccinated / t.enumerated) * 100) : 0

  // Teams reporting
  const allTeams = new Set(data.userActivity.map(r => r.user_name))
  const todayTeams = new Set(
    data.userActivity.filter(r => r.date === refDate).map(r => r.user_name)
  )
  const teamsPct = allTeams.size > 0 ? todayTeams.size / allTeams.size : 0
  const teamsColor = teamsPct < 0.6 ? 'text-red-600' : teamsPct < 0.8 ? 'text-amber-500' : ''

  // Delta computation (only when selectedDate is set)
  let deltas: { enumerated: Delta | null; vaccinated: Delta | null; missed: Delta | null; teams: Delta | null } = {
    enumerated: null, vaccinated: null, missed: null, teams: null,
  }
  if (selectedDate) {
    const pd = prevDate(selectedDate)
    const prevRows = data.dailySummary.filter(r => r.date === pd)
    if (prevRows.length > 0) {
      const p = prevRows.reduce((acc, r) => ({
        enumerated: acc.enumerated + r.total_eligible_children,
        vaccinated: acc.vaccinated + r.total_vaccinated,
        missed: acc.missed + r.total_missed,
      }), { enumerated: 0, vaccinated: 0, missed: 0 })

      const prevTeams = new Set(data.userActivity.filter(r => r.date === pd).map(r => r.user_name))

      deltas = {
        enumerated: { value: t.enumerated - p.enumerated, isGood: t.enumerated >= p.enumerated },
        vaccinated: { value: t.vaccinated - p.vaccinated, isGood: t.vaccinated >= p.vaccinated },
        missed: { value: t.missed - p.missed, isGood: t.missed <= p.missed },
        teams: { value: todayTeams.size - prevTeams.size, isGood: todayTeams.size >= prevTeams.size },
      }
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Children Enumerated"
        value={t.enumerated.toLocaleString()}
        sub="Eligible 0–59m found"
        color="border-blue-500"
        delta={deltas.enumerated}
      />
      <KPICard
        title="Vaccinated"
        value={`${t.vaccinated.toLocaleString()} (${pct}%)`}
        sub="Coverage vs enumerated"
        color="border-green-500"
        delta={deltas.vaccinated}
      />
      <KPICard
        title="Missed Children"
        value={t.missed.toLocaleString()}
        sub="Enumerated but not vaccinated"
        color="border-red-500"
        delta={deltas.missed}
      />
      <KPICard
        title="Teams Reporting"
        value={`${todayTeams.size} / ${allTeams.size}`}
        sub="teams active today"
        color="border-purple-500"
        valueColor={teamsColor}
        delta={deltas.teams}
      />
    </div>
  )
}
