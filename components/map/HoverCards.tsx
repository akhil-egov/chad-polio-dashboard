import type { GpsRow, GpsRefusalRow, GpsZeroDoseRow } from '@/lib/types'
import { REFUSAL_LABEL } from '@/lib/constants'

export function HouseholdCard({ loc, showTeam }: { loc: GpsRow; showTeam: boolean }) {
  const hasVaccData = loc.vaccinated_count != null
  const vaccinated = loc.vaccinated_count ?? 0
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#003F72', marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 11, color: '#009FDB', fontWeight: 600, marginBottom: 4 }}>
          {loc.user_name}
        </div>
      )}
      {loc.member_count != null && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: hasVaccData ? 5 : 0 }}>
          {loc.member_count} {loc.member_count === 1 ? 'member' : 'members'}
        </div>
      )}
      {hasVaccData && (
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: vaccinated > 0 ? '#16a34a' : '#C62828',
          borderTop: '1px solid #f1f5f9', paddingTop: 5,
        }}>
          {vaccinated > 0 ? `✓ ${vaccinated} children vaccinated` : '✗ None vaccinated'}
        </div>
      )}
    </>
  )
}

export function RefusalCard({ loc, showTeam }: { loc: GpsRefusalRow; showTeam: boolean }) {
  const reasonLabel = loc.reason_for_refusal
    ? (REFUSAL_LABEL[loc.reason_for_refusal] ?? loc.reason_for_refusal)
    : null
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#003F72', marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 11, color: '#009FDB', fontWeight: 600, marginBottom: 4 }}>
          {loc.user_name}
        </div>
      )}
      {loc.member_count != null && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: reasonLabel ? 5 : 0 }}>
          {loc.member_count} {loc.member_count === 1 ? 'member' : 'members'}
        </div>
      )}
      {reasonLabel && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#C62828',
          borderTop: '1px solid #fee2e2', paddingTop: 5,
          whiteSpace: 'normal', lineHeight: 1.35,
        }}>
          {reasonLabel}
        </div>
      )}
    </>
  )
}

export function ZeroDoseCard({ loc, showTeam }: { loc: GpsZeroDoseRow; showTeam: boolean }) {
  const vaccinated = loc.administration_status === 'ADMINISTRATION_SUCCESS'
  const ageLabel = loc.age_months != null ? `${Math.round(loc.age_months)} months` : null
  const genderLabel = loc.gender
    ? loc.gender.charAt(0).toUpperCase() + loc.gender.slice(1).toLowerCase()
    : null
  const ageLine = [ageLabel, genderLabel].filter(Boolean).join(' · ')
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#003F72', marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 11, color: '#009FDB', fontWeight: 600, marginBottom: 4 }}>
          {loc.user_name}
        </div>
      )}
      {ageLine && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>{ageLine}</div>
      )}
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: vaccinated ? '#16a34a' : '#C62828',
        borderTop: '1px solid #f1f5f9', paddingTop: 5,
      }}>
        {vaccinated ? '✓ Vaccinated' : '✗ Not yet vaccinated'}
      </div>
    </>
  )
}
