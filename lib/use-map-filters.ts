import { useState, useMemo } from 'react'
import type { DashboardData } from '@/lib/types'

const DATE_RE = /(\d{4}-\d{2}-\d{2})/

function extractDate(recordId: string): string | null {
  const m = DATE_RE.exec(recordId)
  return m ? m[1] : null
}

export function useMapFilters(data: DashboardData | null) {
  const [selectedReasons, setSelectedReasons] = useState<Set<string> | null>(null)
  const [selectedZdStatuses, setSelectedZdStatuses] = useState<Set<string> | null>(null)
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null)
  const [selectedTeams, setSelectedTeams] = useState<Set<string> | null>(null)
  const [selectedDates, setSelectedDates] = useState<Set<string> | null>(null)
  const [teamSearch, setTeamSearch] = useState('')

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

  const allTeams = useMemo((): string[] => {
    if (!data) return []
    const s = new Set<string>()
    for (const r of data.gps) { if (r.user_name) s.add(r.user_name) }
    for (const r of data.gps_refusals ?? []) { if (r.user_name) s.add(r.user_name) }
    for (const r of data.gps_zerodose ?? []) { if (r.user_name) s.add(r.user_name) }
    for (const r of data.gps_closed_household ?? []) { if (r.user_name) s.add(r.user_name) }
    return [...s].sort()
  }, [data])

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

  // Refusal reason helpers
  function toggleReason(reason: string) {
    setSelectedReasons(prev => {
      const current = prev ?? new Set(allReasonKeys)
      const next = new Set(current)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next.size === allReasonKeys.length ? null : next
    })
  }
  function isReasonChecked(reason: string) { return selectedReasons === null || selectedReasons.has(reason) }
  function selectAllReasons() { setSelectedReasons(null) }

  // Zero-dose status helpers
  function toggleZdStatus(key: string) {
    setSelectedZdStatuses(prev => {
      const current = prev ?? new Set(['vaccinated', 'not_vaccinated'])
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next.size === 2 ? null : next
    })
  }
  function isZdStatusChecked(key: string) { return selectedZdStatuses === null || selectedZdStatuses.has(key) }
  function selectAllZdStatuses() { setSelectedZdStatuses(null) }

  // Team helpers
  function toggleTeam(team: string) {
    setSelectedTeams(prev => {
      const current = prev ?? new Set(allTeams)
      const next = new Set(current)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next.size === allTeams.length ? null : next
    })
  }
  function isTeamChecked(team: string) { return selectedTeams === null || selectedTeams.has(team) }
  function selectAllTeams() { setSelectedTeams(null) }
  function soloTeam(team: string) { setSelectedTeams(new Set([team])) }

  // Date helpers
  function toggleDate(date: string) {
    setSelectedDates(prev => {
      const current = prev ?? new Set(allDates)
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next.size === allDates.length ? null : next
    })
  }
  function isDateChecked(date: string) { return selectedDates === null || selectedDates.has(date) }
  function selectAllDates() { setSelectedDates(null) }

  return {
    // Refusal reasons
    refusalReasonCounts,
    selectedReasons,
    toggleReason,
    isReasonChecked,
    selectAllReasons,
    // Zero-dose statuses
    zeroDoseStatusCounts,
    selectedZdStatuses,
    toggleZdStatus,
    isZdStatusChecked,
    selectAllZdStatuses,
    // Settlement
    selectedSettlement,
    setSelectedSettlement,
    // Teams
    allTeams,
    teamSearch,
    setTeamSearch,
    selectedTeams,
    toggleTeam,
    isTeamChecked,
    selectAllTeams,
    soloTeam,
    // Dates
    allDates,
    selectedDates,
    toggleDate,
    isDateChecked,
    selectAllDates,
    // Active flags (consumed by compositor for filterCount and facilityStatsOverride)
    teamFilterActive: selectedTeams !== null,
    dateFilterActive: selectedDates !== null,
  }
}

export type MapFilters = ReturnType<typeof useMapFilters>
