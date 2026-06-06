import { useState, useMemo } from 'react'
import type { DashboardData, GpsRow, GpsRefusalRow, GpsZeroDoseRow } from '@/lib/types'

export type AnyDot =
  | { type: 'household'; row: GpsRow }
  | { type: 'refusal'; row: GpsRefusalRow }
  | { type: 'zerodose'; row: GpsZeroDoseRow }

export function useMapState(data: DashboardData | null) {
  const [selectedFac, setSelectedFac] = useState<string | null>(null)
  const [showHouseholds, setShowHouseholds] = useState(true)
  const [showRefusals, setShowRefusals] = useState(false)
  const [showZerodose, setShowZerodose] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<Set<string> | null>(null)
  const [selectedZdStatuses, setSelectedZdStatuses] = useState<Set<string> | null>(null)

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

  const visibleHouseholds = useMemo((): GpsRow[] => {
    if (!data || !showHouseholds) return []
    let locs = data.gps
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    return locs
  }, [data, selectedFac, showHouseholds])

  const visibleRefusals = useMemo((): GpsRefusalRow[] => {
    if (!data || !showRefusals) return []
    let locs = data.gps_refusals ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedReasons !== null) locs = locs.filter(l => selectedReasons.has(l.reason_for_refusal ?? 'UNKNOWN'))
    return locs
  }, [data, selectedFac, showRefusals, selectedReasons])

  const visibleZerodose = useMemo((): GpsZeroDoseRow[] => {
    if (!data || !showZerodose) return []
    let locs = data.gps_zerodose ?? []
    if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
    if (selectedZdStatuses !== null) {
      locs = locs.filter(l => {
        const key = l.administration_status === 'ADMINISTRATION_SUCCESS' ? 'vaccinated' : 'not_vaccinated'
        return selectedZdStatuses.has(key)
      })
    }
    return locs
  }, [data, selectedFac, showZerodose, selectedZdStatuses])

  const allDots = useMemo<AnyDot[]>(() => [
    ...visibleHouseholds.map(row => ({ type: 'household' as const, row })),
    ...visibleZerodose.map(row => ({ type: 'zerodose' as const, row })),
    ...visibleRefusals.map(row => ({ type: 'refusal' as const, row })),
  ], [visibleHouseholds, visibleZerodose, visibleRefusals])

  const totalVisible = visibleHouseholds.length + visibleRefusals.length + visibleZerodose.length

  function handleSelect(name: string) {
    setSelectedFac(prev => (prev === name ? null : name))
  }

  function handleClear() {
    setSelectedFac(null)
  }

  function toggleHouseholds() { setShowHouseholds(v => !v) }
  function toggleRefusals() { setShowRefusals(v => !v) }
  function toggleZerodose() { setShowZerodose(v => !v) }

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

  return {
    selectedFac,
    handleSelect,
    handleClear,
    showHouseholds,
    toggleHouseholds,
    showRefusals,
    toggleRefusals,
    showZerodose,
    toggleZerodose,
    selectedReasons,
    toggleReason,
    isReasonChecked,
    selectAllReasons,
    selectedZdStatuses,
    toggleZdStatus,
    isZdStatusChecked,
    selectAllZdStatuses,
    visibleHouseholds,
    visibleRefusals,
    visibleZerodose,
    allDots,
    refusalReasonCounts,
    allReasonKeys,
    zeroDoseStatusCounts,
    totalVisible,
  }
}
