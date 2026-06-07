'use client'
import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'

const selectClass =
  'h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006EB6] disabled:opacity-40 disabled:cursor-not-allowed'

export function ActivityFilter() {
  const {
    data,
    selectedRegion, setSelectedRegion,
    selectedDistrict, setSelectedDistrict,
    selectedFacility, setSelectedFacility,
    selectedUser, setSelectedUser,
    t,
  } = useDashboard()

  const activity = data?.activity ?? []

  const regions = useMemo(() =>
    Array.from(new Set(activity.map(r => r.region).filter(Boolean))).sort() as string[]
  , [activity])

  const districts = useMemo(() =>
    Array.from(new Set(
      activity
        .filter(r => !selectedRegion || r.region === selectedRegion)
        .map(r => r.district)
        .filter(Boolean)
    )).sort() as string[]
  , [activity, selectedRegion])

  const facilities = useMemo(() =>
    Array.from(new Set(
      activity
        .filter(r => !selectedRegion   || r.region   === selectedRegion)
        .filter(r => !selectedDistrict || r.district === selectedDistrict)
        .map(r => r.facility_name)
        .filter(Boolean)
    )).sort() as string[]
  , [activity, selectedRegion, selectedDistrict])

  const users = useMemo(() =>
    Array.from(new Set(
      activity
        .filter(r => !selectedRegion   || r.region        === selectedRegion)
        .filter(r => !selectedDistrict || r.district      === selectedDistrict)
        .filter(r => !selectedFacility || r.facility_name === selectedFacility)
        .map(r => r.user_name)
        .filter(Boolean)
    )).sort() as string[]
  , [activity, selectedRegion, selectedDistrict, selectedFacility])

  const labelClass = 'text-[13px] font-bold tracking-wide uppercase text-slate-500'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className={labelClass}>{t('Region')}</span>
        <select
          className={selectClass}
          value={selectedRegion ?? ''}
          onChange={e => setSelectedRegion(e.target.value || null)}
        >
          <option value="">{t('All')}</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={labelClass}>{t('District')}</span>
        <select
          className={selectClass}
          value={selectedDistrict ?? ''}
          onChange={e => setSelectedDistrict(e.target.value || null)}
          disabled={districts.length === 0}
        >
          <option value="">{t('All')}</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={labelClass}>{t('Facility')}</span>
        <select
          className={selectClass}
          value={selectedFacility ?? ''}
          onChange={e => setSelectedFacility(e.target.value || null)}
          disabled={facilities.length === 0}
        >
          <option value="">{t('All')}</option>
          {facilities.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={labelClass}>{t('Team')}</span>
        <select
          className={selectClass}
          value={selectedUser ?? ''}
          onChange={e => setSelectedUser(e.target.value || null)}
          disabled={users.length === 0}
        >
          <option value="">{t('All')}</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {(selectedRegion || selectedDistrict || selectedFacility || selectedUser) && (
        <button
          className="text-[13px] text-slate-400 hover:text-slate-600 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#006EB6] rounded"
          onClick={() => { setSelectedRegion(null) }}
        >
          {t('Clear')}
        </button>
      )}
    </div>
  )
}
