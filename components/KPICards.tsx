'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '@/lib/dashboard-context'

function KPICard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

export function KPICards() {
  const { data, selectedDate } = useDashboard()
  if (!data) return null

  const rows = selectedDate ? data.dailySummary.filter(r => r.date === selectedDate) : data.dailySummary
  const t = rows.reduce((acc, r) => ({
    enumerated: acc.enumerated + r.total_eligible_children,
    vaccinated: acc.vaccinated + r.total_vaccinated,
    missed: acc.missed + r.total_missed,
    wastage: acc.wastage + (r.total_stock_issued - r.total_stock_returned),
  }), { enumerated: 0, vaccinated: 0, missed: 0, wastage: 0 })

  const pct = t.enumerated > 0 ? Math.round((t.vaccinated / t.enumerated) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard title="Children Enumerated" value={t.enumerated.toLocaleString()} sub="Eligible 0–59m found" color="border-blue-500" />
      <KPICard title="Vaccinated" value={`${t.vaccinated.toLocaleString()} (${pct}%)`} sub="Coverage vs enumerated" color="border-green-500" />
      <KPICard title="Missed Children" value={t.missed.toLocaleString()} sub="Enumerated but not vaccinated" color="border-red-500" />
      <KPICard title="Stock Wastage" value={t.wastage.toLocaleString()} sub="Doses issued minus returned" color="border-orange-500" />
    </div>
  )
}
