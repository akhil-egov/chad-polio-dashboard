import { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { DashboardData, GpsRow, GpsRefusalRow, GpsZeroDoseRow, GpsClosedHouseholdRow } from '@/lib/types'

export type AnyDot =
  | { type: 'household'; row: GpsRow }
  | { type: 'refusal'; row: GpsRefusalRow }
  | { type: 'zerodose'; row: GpsZeroDoseRow }
  | { type: 'closed_household'; row: GpsClosedHouseholdRow }

const DATE_RE = /(\d{4}-\d{2}-\d{2})/

function extractDate(recordId: string): string | null {
  const m = DATE_RE.exec(recordId)
  return m ? m[1] : null
}

export function useMapState(data: DashboardData | null) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedFac, setSelectedFac] = useState<string | null>(null)
  const [showHouseholds, setShowHouseholds] = useState(true)
  const [showRefusals, setShowRefusals] = useState(false)
  const [showZerodose, setShowZerodose] = useState(false)
  const [showClosedHousehold, setShowClosedHousehold] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<Set<string> | null>(null)
  const [selectedZdStatuses, setSelectedZdStatuses] = useState<Set<string> | null>(null)
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null)
  const [facilitySearch, setFacilitySearch] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Set<string> | null>(null)
  const [selectedDates, setSelectedDates] = useState<Set<string> | null>(null)
  const [teamSearch, setTeamSearch] = useState('')

  // On mount, restore facility selection from URL ?facility= param
  useEffect(() => {
    const facilityId = searchParams.get('facility')
    if (!facilityId || !data) return
    const match = data.enumeration.find(r => r.facility_id === facilityId)
    if (match) setSelectedFac(match.facility_name)
  }, [data, searchParams])

  const refusalReasonCounts = useMemo(() => {
    if (!data?.gps_refusals) return {} as Record<string, number>
    const counts: Record<string, number> = {}
    for (const r of data.gps_refusals) {
      const k = r.reason_for_refusal ?? 'UNKNOWN'
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }, [data])

  const allReasonKeys = useMemo(() => Object.keys(refusalReasonCounts), [refusalReasonCounts])

  const zeroDoseStatusCounts = useMemo(() => {
    if (!data?.gps_zerodose) return { vaccinated: 0, not_vaccinated: 0 }
    const c = { vaccinated: 0, not_vaccinated: 0 }
    for (const z of data.gps_zerodose) {
      if (z.administration_status === 'ADMINISTRATION_SUCCESS') c.vaccinated++
      else c.not_vaccinated++
    }
    return c
  }, [data])

  // All distinct team codes across all GPS layers, sorted
  const allTeams = useMemo((): string[] => {
    if (!data) return []
    const s = new Set<string>()
    for (const r of data.gps) { if (r.user_name) s.add(r.user_name) }
    for (const r of data.gps_refusals ?? []) { if (r.user_name) s.add(r.user_name) }
    for (const r of data.gps_zerodose ?? []) { if (r.user_name) s.add(r.user_name) }
    for (const r of data.gps_closed_household ?? []) { if (r.user_name) s.add(r.user_name) }
    return [...s].sort()
  }, [data])

  // All distinct dates parseable from record_ids (household + refusal layers only)
  const allDates = useMemo((): string[] => {
    if (!data) return []
    const s = new Set<string>()
    for (const r of data.gps) {
      const d = extractDate(r.record_id)
      if (d) s.add(d)
    }
    for (const r of data.gps_refusals ?? []) {
      const d = extractDate(r.record_id)
      if (d) s.add(d)
    }
    return [...s].sort()
  }, [data])

  const visibleHouseholds = useMemo((): GpsRow[] => {
    if (!data || !showHouseholds) return []
    let locs = data.gps
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedSettlement) locs = locs.filter(l => l.settlement_type === selectedSettlement)
    if (selectedTeams !== null) locs = locs.filter(l => l.user_name != null && selectedTeams.has(l.user_name))
    if (selectedDates !== null) {
      locs = locs.filter(l => {
        const d = extractDate(l.record_id)
        return d != null && selectedDates.has(d)
      })
    }
    return locs
  }, [data, selectedFac, showHouseholds, selectedSettlement, selectedTeams, selectedDates])

  const visibleRefusals = useMemo((): GpsRefusalRow[] => {
    if (!data || !showRefusals) return []
    let locs = data.gps_refusals ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedSettlement) locs = locs.filter(l => l.settlement_type === selectedSettlement)
    if (selectedReasons !== null) locs = locs.filter(l => selectedReasons.has(l.reason_for_refusal ?? 'UNKNOWN'))
    if (selectedTeams !== null) locs = locs.filter(l => l.user_name != null && selectedTeams.has(l.user_name))
    if (selectedDates !== null) {
      locs = locs.filter(l => {
        const d = extractDate(l.record_id)
        return d != null && selectedDates.has(d)
      })
    }
    return locs
  }, [data, selectedFac, showRefusals, selectedReasons, selectedSettlement, selectedTeams, selectedDates])

  const visibleZerodose = useMemo((): GpsZeroDoseRow[] => {
    if (!data || !showZerodose) return []
    let locs = data.gps_zerodose ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedSettlement) locs = locs.filter(l => l.settlement_type === selectedSettlement)
    if (selectedZdStatuses !== null) {
      locs = locs.filter(l => {
        const key = l.administration_status === 'ADMINISTRATION_SUCCESS' ? 'vaccinated' : 'not_vaccinated'
        return selectedZdStatuses.has(key)
      })
    }
    if (selectedTeams !== null) locs = locs.filter(l => l.user_name != null && selectedTeams.has(l.user_name))
    // Date filter not applicable to zerodose (UUID record_ids)
    return locs
  }, [data, selectedFac, showZerodose, selectedZdStatuses, selectedSettlement, selectedTeams])

  const visibleClosedHousehold = useMemo((): GpsClosedHouseholdRow[] => {
    if (!data || !showClosedHousehold) return []
    let locs = data.gps_closed_household ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedSettlement) locs = locs.filter(l => l.settlement_type === selectedSettlement)
    if (selectedTeams !== null) locs = locs.filter(l => l.user_name != null && selectedTeams.has(l.user_name))
    // Date filter not applicable to closed households (UUID record_ids)
    return locs
  }, [data, selectedFac, showClosedHousehold, selectedSettlement, selectedTeams])

  const allDots = useMemo<AnyDot[]>(() => [
    ...visibleHouseholds.map(row => ({ type: 'household' as const, row })),
    ...visibleZerodose.map(row => ({ type: 'zerodose' as const, row })),
    ...visibleClosedHousehold.map(row => ({ type: 'closed_household' as const, row })),
    ...visibleRefusals.map(row => ({ type: 'refusal' as const, row })),
  ], [visibleHouseholds, visibleZerodose, visibleClosedHousehold, visibleRefusals])

  const totalVisible = visibleHouseholds.length + visibleRefusals.length + visibleZerodose.length + visibleClosedHousehold.length

  const teamFilterActive = selectedTeams !== null
  const dateFilterActive = selectedDates !== null
  const filterCount = (selectedFac ? 1 : 0) + (showRefusals ? 1 : 0) + (showZerodose ? 1 : 0) + (showClosedHousehold ? 1 : 0) + (selectedSettlement ? 1 : 0) + (teamFilterActive ? 1 : 0) + (dateFilterActive ? 1 : 0)

  // Cascaded HF stats: when team/date filters active, recompute from GPS dots
  const facilityStatsOverride = useMemo((): Map<string, { records: number; vaccinated: number }> | null => {
    if (!data || (!teamFilterActive && !dateFilterActive)) return null
    const byFac = new Map<string, { records: number; vaccinated: number }>()
    for (const loc of visibleHouseholds) {
      const cur = byFac.get(loc.facility_name) ?? { records: 0, vaccinated: 0 }
      cur.records++
      cur.vaccinated += loc.vaccinated_count ?? 0
      byFac.set(loc.facility_name, cur)
    }
    return byFac
  }, [data, visibleHouseholds, teamFilterActive, dateFilterActive])

  function handleSelect(name: string) {
    const isDeselect = name === selectedFac
    const next = isDeselect ? null : name
    setSelectedFac(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      const match = data?.enumeration.find(r => r.facility_name === name)
      if (match) params.set('facility', match.facility_id)
      else params.delete('facility')
    } else {
      params.delete('facility')
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleClear() {
    setSelectedFac(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('facility')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function toggleHouseholds() { setShowHouseholds(v => !v) }
  function toggleRefusals() { setShowRefusals(v => !v) }
  function toggleZerodose() { setShowZerodose(v => !v) }
  function toggleClosedHousehold() { setShowClosedHousehold(v => !v) }

  function toggleReason(reason: string) {
    setSelectedReasons(prev => {
      const current = prev ?? new Set(allReasonKeys)
      const next = new Set(current)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next.size === allReasonKeys.length ? null : next
    })
  }

  function isReasonChecked(reason: string) {
    return selectedReasons === null || selectedReasons.has(reason)
  }

  function selectAllReasons() { setSelectedReasons(null) }

  function toggleZdStatus(key: string) {
    setSelectedZdStatuses(prev => {
      const current = prev ?? new Set(['vaccinated', 'not_vaccinated'])
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next.size === 2 ? null : next
    })
  }

  function isZdStatusChecked(key: string) {
    return selectedZdStatuses === null || selectedZdStatuses.has(key)
  }

  function selectAllZdStatuses() { setSelectedZdStatuses(null) }

  function toggleTeam(team: string) {
    setSelectedTeams(prev => {
      const current = prev ?? new Set(allTeams)
      const next = new Set(current)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next.size === allTeams.length ? null : next
    })
  }

  function isTeamChecked(team: string) {
    return selectedTeams === null || selectedTeams.has(team)
  }

  function selectAllTeams() { setSelectedTeams(null) }

  function toggleDate(date: string) {
    setSelectedDates(prev => {
      const current = prev ?? new Set(allDates)
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next.size === allDates.length ? null : next
    })
  }

  function isDateChecked(date: string) {
    return selectedDates === null || selectedDates.has(date)
  }

  function selectAllDates() { setSelectedDates(null) }

  return {
    selectedFac,
    handleSelect,
    handleClear,
    showHouseholds,
    toggleHouseholds,
    showRefusals,
    setShowRefusals,
    toggleRefusals,
    showZerodose,
    setShowZerodose,
    toggleZerodose,
    showClosedHousehold,
    setShowClosedHousehold,
    toggleClosedHousehold,
    visibleClosedHousehold,
    selectedReasons,
    toggleReason,
    isReasonChecked,
    selectAllReasons,
    selectedZdStatuses,
    toggleZdStatus,
    isZdStatusChecked,
    selectAllZdStatuses,
    selectedSettlement,
    setSelectedSettlement,
    visibleHouseholds,
    visibleRefusals,
    visibleZerodose,
    allDots,
    refusalReasonCounts,
    allReasonKeys,
    zeroDoseStatusCounts,
    totalVisible,
    facilitySearch,
    setFacilitySearch,
    filterCount,
    // Team filter
    allTeams,
    selectedTeams,
    toggleTeam,
    isTeamChecked,
    selectAllTeams,
    teamSearch,
    setTeamSearch,
    // Date filter
    allDates,
    selectedDates,
    toggleDate,
    isDateChecked,
    selectAllDates,
    // Cascaded HF stats
    facilityStatsOverride,
    teamFilterActive,
    dateFilterActive,
  }
}
