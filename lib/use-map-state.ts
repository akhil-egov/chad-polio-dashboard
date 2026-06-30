import { useMemo } from 'react'
import type { DashboardData, GpsRow, GpsRefusalRow, GpsZeroDoseRow, GpsClosedHouseholdRow, FacilityLocationRow } from '@/lib/types'
import { useMapLayers } from './use-map-layers'
import { useMapFilters } from './use-map-filters'
import { useMapNavigation } from './use-map-navigation'

export type AnyDot =
  | { type: 'household'; row: GpsRow }
  | { type: 'refusal'; row: GpsRefusalRow }
  | { type: 'zerodose'; row: GpsZeroDoseRow }
  | { type: 'closed_household'; row: GpsClosedHouseholdRow }
  | { type: 'facility'; row: FacilityLocationRow }

const DATE_RE = /(\d{4}-\d{2}-\d{2})/

function extractDate(recordId: string): string | null {
  const m = DATE_RE.exec(recordId)
  return m ? m[1] : null
}

export function useMapState(data: DashboardData | null) {
  const layers = useMapLayers()
  const filters = useMapFilters(data)
  const nav = useMapNavigation(data)

  const { showHouseholds, showRefusals, showZerodose, showClosedHousehold } = layers
  const {
    selectedReasons, selectedZdStatuses, selectedSettlement,
    selectedTeams, selectedDates, teamFilterActive, dateFilterActive,
  } = filters
  const { selectedFac } = nav

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

  const filterCount = (selectedFac ? 1 : 0)
    + (layers.showRefusals ? 1 : 0)
    + (layers.showZerodose ? 1 : 0)
    + (layers.showClosedHousehold ? 1 : 0)
    + (filters.selectedSettlement ? 1 : 0)
    + (teamFilterActive ? 1 : 0)
    + (dateFilterActive ? 1 : 0)

  // When team/date filters are active, recompute facility stats from visible GPS dots
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

  return {
    // Navigation
    ...nav,
    // Layer toggles
    ...layers,
    // Filters
    ...filters,
    // Derived (cross-cutting)
    visibleHouseholds,
    visibleRefusals,
    visibleZerodose,
    visibleClosedHousehold,
    allDots,
    totalVisible,
    filterCount,
    facilityStatsOverride,
  }
}
