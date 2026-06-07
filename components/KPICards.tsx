'use client'
import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { campaignKPIs } from '@/lib/campaign-queries'
import { getVisibility, type Visibility } from '@/lib/visibility'
import { KPI_ACCENT } from '@/lib/constants'

interface Delta { value: number; isGood: boolean }

function DeltaChip({ delta, vis, t }: { delta: Delta | null; vis: Visibility; t: (k: string) => string }) {
  if (!delta) return null
  const sign = delta.value >= 0 ? '+' : ''
  if (!vis.showStatusBadges) {
    return (
      <span className="text-[13px] font-medium text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {sign}{delta.value.toLocaleString()} {t('vs yesterday')}
      </span>
    )
  }
  return (
    <span className={`text-[13px] font-semibold ${delta.isGood ? 'text-[#15803D]' : 'text-[#DC2626]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {delta.isGood ? '↑' : '↓'} {sign}{delta.value.toLocaleString()} {t('vs yesterday')}
    </span>
  )
}

function KPICard({ title, value, sub, accentColor, valueColor, delta, vis, t }: {
  title: string; value: string; sub: string; accentColor: string; valueColor?: string; delta?: Delta | null; vis: Visibility; t: (k: string) => string
}) {
  return (
    <div className="relative bg-white border rounded-lg overflow-hidden flex flex-col shadow-sm" style={{ borderColor: '#E5E0D8' }}>
      <div className="h-[4px] w-full flex-none" style={{ background: accentColor }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <div
          className="text-[3.5rem] font-bold leading-none"
          style={{ color: valueColor ?? '#1A1F2E', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </div>
        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-[13px] text-slate-500">{sub}</p>
          {delta !== undefined && <DeltaChip delta={delta ?? null} vis={vis} t={t} />}
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

  const vis = getVisibility(mode)
  const kpis = campaignKPIs(data)

  const { vaccinated, pct } = useMemo(() => {
    const rows = selectedDate ? data.coverage.filter(r => r.date === selectedDate) : data.coverage
    const vacc = rows.reduce((s, r) => s + r.vaccinated, 0)
    return { vaccinated: vacc, pct: kpis.enumerated > 0 ? Math.round((vacc / kpis.enumerated) * 100) : 0 }
  }, [data.coverage, selectedDate, kpis.enumerated])

  const missed = Math.max(0, kpis.enumerated - vaccinated)

  const todayTeams = useMemo(() => {
    const allActivityDates = data.activity.map(r => r.date)
    const maxActivityDate = allActivityDates.length > 0
      ? allActivityDates.reduce((a, b) => (a > b ? a : b))
      : null
    const ref = selectedDate ?? maxActivityDate
    return new Set(data.activity.filter(r => r.date === ref).map(r => r.user_name))
  }, [data.activity, selectedDate])

  const teamsPct = kpis.totalTeams > 0 ? todayTeams.size / kpis.totalTeams : 0
  const teamsColor = teamsPct < 0.6 ? '#DC2626' : teamsPct < 0.8 ? '#D97706' : '#1A1F2E'

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

  const cols = vis.showMissedCard ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
  const vaccColor = vis.showStatusBadges ? (pct >= 70 ? '#15803D' : pct >= 40 ? '#D97706' : '#DC2626') : '#1A1F2E'

  return (
    <>
      <div className={`grid ${cols} gap-4`}>
        <KPICard
          title={t('Children Enumerated')}
          value={kpis.enumerated.toLocaleString()}
          sub={t('Eligible 0–59m found')}
          accentColor={KPI_ACCENT.enumerated}
          vis={vis} t={t}
        />
        <KPICard
          title={t('Vaccinated')}
          value={`${vaccinated.toLocaleString()} (${pct}%)`}
          sub={t('Coverage vs enumerated')}
          accentColor={KPI_ACCENT.vaccinated}
          valueColor={vaccColor}
          delta={deltas.vaccinated}
          vis={vis} t={t}
        />
        {vis.showMissedCard && (
          <KPICard
            title={t('Missed Children')}
            value={missed.toLocaleString()}
            sub={t('Need revisit')}
            accentColor={KPI_ACCENT.missed}
            valueColor={missed > 0 && vis.showStatusBadges ? '#C2410C' : '#1A1F2E'}
            vis={vis} t={t}
          />
        )}
        <KPICard
          title={t('Teams Reporting')}
          value={`${todayTeams.size} / ${kpis.totalTeams}`}
          sub={t('Active today')}
          accentColor={KPI_ACCENT.teams}
          valueColor={vis.showStatusBadges ? teamsColor : '#1A1F2E'}
          delta={deltas.teams}
          vis={vis} t={t}
        />
      </div>
      {!selectedDate && (
        <p className="text-[13px] text-slate-400 mt-1">{t('Trend comparison: prior-day data unavailable')}</p>
      )}
    </>
  )
}
