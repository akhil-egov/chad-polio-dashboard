'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { COLORS } from '@/lib/constants'

const AGE_ORDER = ['0-11m', '12-23m', '24-35m', '36-47m', '48-59m']

export function DemographicsPanel() {
  const { data, t } = useDashboard()
  if (!data) return null

  const matrix: Record<string, { MALE: number; FEMALE: number; total: number }> = {}
  for (const age of AGE_ORDER) {
    matrix[age] = { MALE: 0, FEMALE: 0, total: 0 }
  }
  for (const r of data.demographics) {
    const key = r.gender.toUpperCase() === 'MALE' || r.gender.toUpperCase() === 'M' ? 'MALE' : 'FEMALE'
    if (matrix[r.age_group]) {
      matrix[r.age_group][key] += r.vaccinated_count
      matrix[r.age_group].total += r.vaccinated_count
    }
  }

  const grandTotal = Object.values(matrix).reduce((s, r) => s + r.total, 0)
  const maxTotal = Math.max(...Object.values(matrix).map(r => r.total), 1)
  const totalMale = Object.values(matrix).reduce((s, r) => s + r.MALE, 0)
  const totalFemale = Object.values(matrix).reduce((s, r) => s + r.FEMALE, 0)

  const summaryItems = [
    { labelKey: 'Total Vaccinated', value: grandTotal, color: COLORS.WHO_BLUE },
    { labelKey: 'Male', value: totalMale, color: '#3b82f6' },
    { labelKey: 'Female', value: totalFemale, color: '#ec4899' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {summaryItems.map(({ labelKey, value, color }) => (
          <div key={labelKey} className="bg-white rounded-lg shadow-sm overflow-hidden border" style={{ borderColor: COLORS.BORDER }}>
            <div className="h-[4px]" style={{ background: color }} />
            <div className="px-5 py-4">
              <p className="text-[13px] font-bold tracking-wide uppercase text-slate-500">{t(labelKey)}</p>
              <p className="text-[1.5rem] font-bold leading-none mt-1" style={{ color: COLORS.TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</p>
              {grandTotal > 0 && labelKey !== 'Total Vaccinated' && (
                <p className="text-[13px] text-slate-500 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{((value / grandTotal) * 100).toFixed(1)}%</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border" style={{ borderColor: COLORS.BORDER }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold tracking-wide uppercase" style={{ color: COLORS.WHO_BLUE }}>
            {t('Vaccinated by Age Group')}
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
              <span className="text-[13px] text-slate-500">{t('Male')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#ec4899]" />
              <span className="text-[13px] text-slate-500">{t('Female')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {AGE_ORDER.map(age => {
            const row = matrix[age]
            const mPct = (row.MALE / maxTotal) * 100
            const fPct = (row.FEMALE / maxTotal) * 100
            return (
              <div key={age} className="flex items-center gap-4">
                <div className="w-16 shrink-0 text-[13px] font-bold text-slate-500 uppercase tracking-wide">{age}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-r-full h-[8px]">
                      <div className="h-[8px] rounded-r-full bg-[#3b82f6] transition-all" style={{ width: `${mPct}%` }} />
                    </div>
                    <span className="w-16 text-right text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{row.MALE.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-r-full h-[8px]">
                      <div className="h-[8px] rounded-r-full bg-[#ec4899] transition-all" style={{ width: `${fPct}%` }} />
                    </div>
                    <span className="w-16 text-right text-[13px]" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{row.FEMALE.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-16 text-right text-[13px] font-semibold" style={{ color: COLORS.TEXT_SECONDARY, fontVariantNumeric: 'tabular-nums' }}>{row.total.toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
