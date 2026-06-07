'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { COLORS } from '@/lib/constants'

export function TeamActivityTable() {
  const { data, selectedDate, selectedRegion, selectedDistrict, selectedFacility, selectedUser, t } = useDashboard()
  if (!data) return null

  const rows = data.activity
    .filter(r => !selectedDate     || r.date          === selectedDate)
    .filter(r => !selectedRegion   || r.region        === selectedRegion)
    .filter(r => !selectedDistrict || r.district      === selectedDistrict)
    .filter(r => !selectedFacility || r.facility_name === selectedFacility)
    .filter(r => !selectedUser     || r.user_name     === selectedUser)
    .sort((a, b) =>
      (a.facility_name ?? '').localeCompare(b.facility_name ?? '') ||
      (a.user_name ?? '').localeCompare(b.user_name ?? '')
    )

  const thClass = 'px-4 py-3 text-left text-[13px] font-bold tracking-wide uppercase whitespace-nowrap'

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm" style={{ borderColor: COLORS.BORDER }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: COLORS.BORDER, background: '#FAF8F4' }}>
            <th className={`${thClass} text-slate-500`}>{t('Health Facility')}</th>
            <th className={`${thClass} text-slate-500`}>{t('User')}</th>
            <th className={`${thClass} text-slate-500`}>{t('Date')}</th>
            <th className={`${thClass} text-right text-slate-500`}>{t('Tasks')}</th>
            <th className={`${thClass} text-slate-500`}>{t('Last Sync')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? 'bg-white' : ''}`}
              style={{ borderColor: '#F0EBE3' }}
            >
              <td className="px-4 py-3.5">
                <span className="text-[15px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                  {r.facility_name}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-[14px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                  {r.user_name}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>
                  {r.date}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right">
                <span className="text-[14px] font-semibold" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
                  {r.task_count.toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className="text-[13px] flex items-center gap-2"
                  style={{ color: r.is_inactive ? COLORS.CRITICAL : COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}
                >
                  {r.last_sync ? r.last_sync.slice(11, 16) : '—'}
                  {r.is_inactive && (
                    <span
                      className="inline-flex items-center text-[12px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm"
                      style={{ background: '#FEE2E2', color: COLORS.CRITICAL, border: '1px solid #FECACA' }}
                    >
                      {t('stale')}
                    </span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
