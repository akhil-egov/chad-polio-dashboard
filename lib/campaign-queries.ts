import type { DashboardData } from './types'

export function campaignKPIs(data: DashboardData): {
  enumerated: number
  vaccinated: number
  missed: number
  coveragePct: number
  activeTeams: number
  totalTeams: number
} {
  const enumerated = data.enumeration.reduce((s, r) => s + r.eligible_children, 0)
  const vaccinated = data.enumeration.reduce((s, r) => s + r.vaccinated_children, 0)
  const missed = Math.max(0, enumerated - vaccinated)
  const coveragePct = enumerated > 0 ? (vaccinated / enumerated) * 100 : 0

  const allUsers = new Set(data.activity.map(r => r.user_name))
  const usersWithTasks = new Set(
    data.activity.filter(r => r.task_count > 0).map(r => r.user_name)
  )

  return {
    enumerated,
    vaccinated,
    missed,
    coveragePct,
    activeTeams: usersWithTasks.size,
    totalTeams: allUsers.size,
  }
}

export function coverageByFacility(data: DashboardData): Array<{
  facility_name: string
  pct_complete: number
  households_registered: number
  vaccinated_children: number
  eligible_children: number
}> {
  return data.enumeration.map(r => ({
    facility_name: r.facility_name,
    pct_complete: r.eligible_children > 0
      ? (r.vaccinated_children / r.eligible_children) * 100
      : 0,
    households_registered: r.households_registered,
    vaccinated_children: r.vaccinated_children,
    eligible_children: r.eligible_children,
  }))
}

export function teamActivityByFacility(data: DashboardData): Array<{
  facility_name: string
  active_users: number
  total_users: number
  reporting_pct: number
}> {
  const totalByFacility = new Map<string, Set<string>>()
  const activeByFacility = new Map<string, Set<string>>()

  for (const r of data.activity) {
    if (!totalByFacility.has(r.facility_name)) {
      totalByFacility.set(r.facility_name, new Set())
    }
    totalByFacility.get(r.facility_name)!.add(r.user_name)

    if (r.task_count > 0) {
      if (!activeByFacility.has(r.facility_name)) {
        activeByFacility.set(r.facility_name, new Set())
      }
      activeByFacility.get(r.facility_name)!.add(r.user_name)
    }
  }

  return [...totalByFacility.entries()].map(([facility_name, totalUsers]) => {
    const activeUsers = activeByFacility.get(facility_name) ?? new Set<string>()
    const total_users = totalUsers.size
    const active_users = activeUsers.size
    return {
      facility_name,
      active_users,
      total_users,
      reporting_pct: total_users > 0 ? (active_users / total_users) * 100 : 0,
    }
  })
}

export function refusalsByReason(data: DashboardData): Array<{
  reason: string
  count: number
  facilities: string[]
}> {
  const byReason = new Map<string, { count: number; facilities: Set<string> }>()

  for (const r of data.refusals) {
    if (!byReason.has(r.reason_code)) {
      byReason.set(r.reason_code, { count: 0, facilities: new Set() })
    }
    const entry = byReason.get(r.reason_code)!
    entry.count += r.count
    entry.facilities.add(r.facility_name)
  }

  return [...byReason.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([reason, { count, facilities }]) => ({
      reason,
      count,
      facilities: [...facilities],
    }))
}

export function zeroDoseSummary(data: DashboardData): {
  total: number
  vaccinated: number
  not_vaccinated: number
} {
  const total = data.gps_zerodose.length
  const vaccinated = data.gps_zerodose.filter(
    r => r.administration_status === 'ADMINISTRATION_SUCCESS'
  ).length
  return {
    total,
    vaccinated,
    not_vaccinated: total - vaccinated,
  }
}

export function settlementBreakdown(data: DashboardData): Array<{
  settlement_type: string
  households: number
  eligible_children: number
  vaccinated_children: number
}> {
  return data.settlement.map(r => ({
    settlement_type: r.settlement_type,
    households: r.household_count,
    eligible_children: r.eligible_children,
    vaccinated_children: r.vaccinated,
  }))
}
