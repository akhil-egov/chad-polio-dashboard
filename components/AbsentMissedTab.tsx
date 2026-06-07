'use client'
import { useCallback, useMemo, useState } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { getVisibility } from '@/lib/visibility'
import { COLORS, KPI_ACCENT } from '@/lib/constants'
import { RefusalsTable } from '@/components/RefusalsTable'
import { settlementBreakdown } from '@/lib/campaign-queries'

function SimpleCard({ title, value, sub, accentColor }: {
  title: string; value: string; sub: string; accentColor: string
}) {
  return (
    <div className="relative bg-white border rounded-lg overflow-hidden flex flex-col shadow-sm" style={{ borderColor: COLORS.BORDER }}>
      <div className="h-[4px] w-full flex-none" style={{ background: accentColor }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <div className="text-[3.5rem] font-bold leading-none" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        <p className="text-[13px] text-slate-500 mt-auto">{sub}</p>
      </div>
    </div>
  )
}

const SETTLEMENT_HIGHLIGHT = new Set(['NOMADS_PASTORALISTS', 'SLUMS'])

export function AbsentMissedTab() {
  const { data, mode, t } = useDashboard()
  const vis = getVisibility(mode)
  const [facilityFilter, setFacilityFilter] = useState<string>('')

  const totalMissed = useMemo(
    () => (data?.microplan ?? []).reduce((s, r) => s + r.gap, 0),
    [data?.microplan]
  )

  const totalRefusals = useMemo(
    () => (data?.refusals ?? []).reduce((s, r) => s + r.count, 0),
    [data?.refusals]
  )

  const zeroDoseUnvaccinated = useMemo(
    () => (data?.gps_zerodose ?? []).filter(r => r.administration_status !== 'ADMINISTRATION_SUCCESS').length,
    [data?.gps_zerodose]
  )

  const settlementMissed = useMemo(() => {
    if (!data) return []
    return settlementBreakdown(data)
      .map(r => ({
        type: r.settlement_type,
        missed: r.eligible_children - r.vaccinated_children,
      }))
      .sort((a, b) => b.missed - a.missed)
  }, [data])

  const maxMissed = useMemo(
    () => Math.max(...settlementMissed.map(r => r.missed), 1),
    [settlementMissed]
  )

  const zeroDoseFacilities = useMemo(() => {
    const names = Array.from(new Set((data?.gps_zerodose ?? []).map(r => r.facility_name).filter(Boolean)))
    return names.sort() as string[]
  }, [data?.gps_zerodose])

  const zeroDoseRows = useMemo(() => {
    const src = data?.gps_zerodose ?? []
    const filtered = facilityFilter
      ? src.filter(r => r.facility_name === facilityFilter)
      : src

    return [...filtered].sort((a, b) => {
      const aVax = a.administration_status === 'ADMINISTRATION_SUCCESS' ? 1 : 0
      const bVax = b.administration_status === 'ADMINISTRATION_SUCCESS' ? 1 : 0
      return aVax - bVax
    })
  }, [data?.gps_zerodose, facilityFilter])

  const handleExportCSV = useCallback(() => {
    const headers = [
      'record_id', 'facility_name', 'settlement_type',
      'age_months', 'gender', 'administration_status',
      ...(vis.showTeamActivity ? ['user_name'] : []),
    ]
    const rows = zeroDoseRows.map(r => [
      r.record_id ?? '',
      r.facility_name ?? '',
      r.settlement_type ?? '',
      r.age_months ?? '',
      r.gender ?? '',
      r.administration_status ?? '',
      ...(vis.showTeamActivity ? [r.user_name ?? ''] : []),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zero-dose-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [zeroDoseRows, vis.showTeamActivity])

  if (!data) return null

  const sectionHeading = 'text-[15px] font-bold tracking-wide uppercase mb-3 md:mb-4'

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SimpleCard title={t('Total Missed')} value={totalMissed.toLocaleString()} sub={t('missed children')} accentColor={KPI_ACCENT.missed} />
        <SimpleCard title={t('Total Refusals')} value={totalRefusals.toLocaleString()} sub={t('total refusals recorded')} accentColor={COLORS.REFUSAL} />
        <SimpleCard title={t('Zero-Dose Unvaccinated')} value={zeroDoseUnvaccinated.toLocaleString()} sub={t('still unvaccinated')} accentColor={COLORS.ZERODOSE} />
      </div>

      <div>
        <h2 className={sectionHeading} style={{ color: COLORS.WHO_BLUE }}>{t('Missed by Settlement Type')}</h2>
        <div className="bg-white rounded-lg shadow-sm border p-5 space-y-4" style={{ borderColor: COLORS.BORDER }}>
          {settlementMissed.map(({ type, missed }) => {
            const barColor = SETTLEMENT_HIGHLIGHT.has(type) ? COLORS.ACTIVE : '#94a3b8'
            const pct = (missed / maxMissed) * 100
            return (
              <div key={type} className="flex items-center gap-3">
                <div className="w-48 shrink-0 text-[13px] font-semibold" style={{ color: COLORS.TEXT_SECONDARY }}>{t(type)}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-[8px]">
                  <div className="h-[8px] rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className="w-20 text-right text-[13px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
                  {missed.toLocaleString()} <span className="font-normal text-slate-400">{t('missed')}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className={sectionHeading} style={{ color: COLORS.WHO_BLUE }}>{t('Refusals by Facility')}</h2>
        <RefusalsTable />
      </div>

      <div>
        <h2 className={sectionHeading} style={{ color: COLORS.WHO_BLUE }}>{t('Zero-Dose Children')}</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <select
            value={facilityFilter}
            onChange={e => setFacilityFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6]"
          >
            <option value="">{t('All Facilities')}</option>
            {zeroDoseFacilities.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button
            onClick={handleExportCSV}
            className="h-8 px-3 rounded-md border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006EB6] transition-colors"
          >
            {t('Export CSV')}
          </button>
          <span className="text-[13px] text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {zeroDoseRows.length.toLocaleString()} {t('rows')}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-[#FAF8F4]">
                <tr className="border-b" style={{ borderColor: COLORS.BORDER }}>
                  <th className="px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap">{t('Health Facility')}</th>
                  <th className="px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap">{t('Settlement Type')}</th>
                  <th className="px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap">{t('Age (months)')}</th>
                  <th className="px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap">{t('Gender')}</th>
                  <th className="px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap">{t('Status')}</th>
                  {vis.showTeamActivity && (
                    <th className="px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase text-slate-500 whitespace-nowrap">{t('Team')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {zeroDoseRows.map((r, i) => {
                  const vaccinated = r.administration_status === 'ADMINISTRATION_SUCCESS'
                  return (
                    <tr key={r.record_id ?? i} className={`border-b transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? 'bg-white' : ''}`} style={{ borderColor: '#F0EBE3' }}>
                      <td className="px-4 py-3"><span className="text-[14px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{r.facility_name ?? '—'}</span></td>
                      <td className="px-4 py-3"><span className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>{r.settlement_type ? t(r.settlement_type) : '—'}</span></td>
                      <td className="px-4 py-3"><span className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{r.age_months ?? '—'}</span></td>
                      <td className="px-4 py-3"><span className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY }}>{r.gender ? t(r.gender) : '—'}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-semibold" style={{ color: vaccinated ? COLORS.ON_TRACK : COLORS.CRITICAL }}>
                          {vaccinated ? `✓ ${t('Vaccinated')}` : `✗ ${t('Not vaccinated')}`}
                        </span>
                      </td>
                      {vis.showTeamActivity && (
                        <td className="px-4 py-3"><span className="text-[13px]" style={{ color: COLORS.WHO_BLUE }}>{r.user_name ?? '—'}</span></td>
                      )}
                    </tr>
                  )
                })}
                {zeroDoseRows.length === 0 && (
                  <tr>
                    <td colSpan={vis.showTeamActivity ? 6 : 5} className="px-4 py-8 text-center text-[13px] text-slate-400">
                      {t('No records for this facility.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
