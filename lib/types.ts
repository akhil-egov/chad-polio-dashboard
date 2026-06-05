export interface HFSummaryRow {
  health_facility: string
  target_enumeration: number
  target_vaccination: number
  total_enumeration_records: number
  eligible_children_enumerated: number
  total_vaccinated: number
  missed_children: number
  guest_member_count: number
  absent_household_count: number
  total_users: number
  active_users: number
  stock_issued: number
  stock_returned: number
  date: string
}

export interface UserActivityRow {
  health_facility: string
  user_name: string
  date: string
  enumeration_records: number
  eligible_children: number
  vaccinated: number
  last_sync_time: string
}

export interface HouseholdLocationRow {
  health_facility: string
  user_name: string
  household_id: string
  latitude: number
  longitude: number
  status: 'enumerated' | 'vaccinated'
  date: string
}

export interface DailySummaryRow {
  date: string
  total_enumeration_records: number
  total_eligible_children: number
  total_vaccinated: number
  total_missed: number
  total_stock_issued: number
  total_stock_returned: number
}

export interface DashboardData {
  hfSummary: HFSummaryRow[]
  userActivity: UserActivityRow[]
  householdLocations: HouseholdLocationRow[]
  dailySummary: DailySummaryRow[]
}
