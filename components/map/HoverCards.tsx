import type { GpsRow, GpsRefusalRow, GpsZeroDoseRow, GpsClosedHouseholdRow, FacilityLocationRow } from '@/lib/types'
import { REFUSAL_LABEL, COLORS } from '@/lib/constants'

const PROGRAMME = 'Polio OPV'

function formatDay(recordId: string): string | null {
  const m = /(\d{4}-(\d{2})-(\d{2}))/.exec(recordId)
  if (!m) return null
  const mo = parseInt(m[2], 10)
  const d = parseInt(m[3], 10)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mo - 1]} ${d}`
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 12, color: COLORS.TEXT_SECONDARY, marginBottom: 2 }}>
      <span style={{ fontWeight: 600 }}>{label}:</span> {value}
    </div>
  )
}

export function HouseholdCard({ loc, showTeam }: { loc: GpsRow; showTeam: boolean }) {
  const hasVaccData = loc.vaccinated_count != null
  const vaccinated = loc.vaccinated_count ?? 0
  const header = loc.head_of_household || loc.facility_name
  const day = formatDay(loc.record_id)
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.TEXT_PRIMARY, marginBottom: 2 }}>
        {header}
      </div>
      {loc.head_of_household && (
        <div style={{ fontSize: 12, color: COLORS.TEXT_SECONDARY, marginBottom: 4 }}>
          {loc.facility_name}
        </div>
      )}
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 13, color: COLORS.WHO_BLUE, fontWeight: 600, marginBottom: 3 }}>
          {loc.user_name}
        </div>
      )}
      <MetaRow label="Programme" value={PROGRAMME} />
      {day && <MetaRow label="Day" value={day} />}
      {loc.member_count != null && (
        <div style={{ fontSize: 13, color: COLORS.TEXT_SECONDARY, marginBottom: hasVaccData ? 5 : 0 }}>
          {loc.member_count} {loc.member_count === 1 ? 'member' : 'members'}
        </div>
      )}
      {hasVaccData && vaccinated > 0 && (
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: COLORS.ON_TRACK,
          borderTop: '1px solid #f1f5f9', paddingTop: 5,
        }}>
          ✓ {vaccinated} children vaccinated nearby
        </div>
      )}
    </>
  )
}

export function RefusalCard({ loc, showTeam }: { loc: GpsRefusalRow; showTeam: boolean }) {
  const reasonLabel = loc.reason_for_refusal
    ? (REFUSAL_LABEL[loc.reason_for_refusal] ?? loc.reason_for_refusal)
    : null
  const day = formatDay(loc.record_id)
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.TEXT_PRIMARY, marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 13, color: COLORS.WHO_BLUE, fontWeight: 600, marginBottom: 3 }}>
          {loc.user_name}
        </div>
      )}
      <MetaRow label="Programme" value={PROGRAMME} />
      {day && <MetaRow label="Day" value={day} />}
      {loc.member_count != null && (
        <div style={{ fontSize: 13, color: COLORS.TEXT_SECONDARY, marginBottom: reasonLabel ? 5 : 0, marginTop: 3 }}>
          {loc.member_count} {loc.member_count === 1 ? 'member' : 'members'}
        </div>
      )}
      {reasonLabel && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: COLORS.REFUSAL,
          borderTop: '1px solid #fee2e2', paddingTop: 5,
          whiteSpace: 'normal', lineHeight: 1.35,
        }}>
          {reasonLabel}
        </div>
      )}
    </>
  )
}

export function ClosedHouseholdCard({ loc, showTeam }: { loc: GpsClosedHouseholdRow; showTeam: boolean }) {
  const day = formatDay(loc.record_id)
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.TEXT_PRIMARY, marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 13, color: COLORS.WHO_BLUE, fontWeight: 600, marginBottom: 3 }}>
          {loc.user_name}
        </div>
      )}
      <MetaRow label="Programme" value={PROGRAMME} />
      {day && <MetaRow label="Day" value={day} />}
      <div style={{
        fontSize: 13, fontWeight: 600, color: '#7C3AED',
        borderTop: '1px solid #ede9fe', paddingTop: 5, marginTop: 4,
      }}>
        🚪 Closed — no one home
      </div>
    </>
  )
}

export function FacilityCard({ loc }: { loc: FacilityLocationRow }) {
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.TEXT_PRIMARY, marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      <div style={{ fontSize: 12, color: '#0D9488', fontWeight: 600 }}>
        📍 Health facility
      </div>
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
      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.TEXT_PRIMARY, marginBottom: 4 }}>
        {loc.facility_name}
      </div>
      {showTeam && loc.user_name && (
        <div style={{ fontSize: 13, color: COLORS.WHO_BLUE, fontWeight: 600, marginBottom: 3 }}>
          {loc.user_name}
        </div>
      )}
      <MetaRow label="Programme" value={PROGRAMME} />
      {ageLine && (
        <div style={{ fontSize: 13, color: COLORS.TEXT_SECONDARY, marginBottom: 5, marginTop: 3 }}>{ageLine}</div>
      )}
      <div style={{
        fontSize: 13, fontWeight: 700,
        color: vaccinated ? COLORS.ON_TRACK : COLORS.CRITICAL,
        borderTop: '1px solid #f1f5f9', paddingTop: 5,
      }}>
        {vaccinated ? '✓ Vaccinated' : '✗ Not yet vaccinated'}
      </div>
    </>
  )
}
