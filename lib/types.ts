export interface Metadata {
  run_timestamp: string
  campaign_id: string
  country: string
  records_per_sheet: string
  extraction_duration_s: number
}

export interface CoverageRow {
  facility_name: string
  facility_id: string
  date: string
  vaccinated: number
  target: number
  cumulative_vaccinated: number
  pct_complete: number
}

export interface ActivityRow {
  user_id: string
  user_name: string
  facility_name: string
  facility_id: string
  region: string | null
  district: string | null
  team_name: string | null
  date: string
  day_number: number | null
  task_count: number
  last_sync: string
  is_inactive: boolean
}

export interface EnumerationRow {
  facility_name: string
  facility_id: string
  households_registered: number
  eligible_children: number
  vaccinated_children: number
  pct_complete: number
}

export interface StockRow {
  facility_name: string
  facility_id: string
  vials_issued: number
  vials_returned: number
  vials_used: number
}

export interface StockDailyRow {
  user_name: string | null
  name_of_user: string | null
  facility_name: string | null
  facility_id: string | null
  district: string | null
  region: string | null
  date: string | null
  vials_received: number
}

export interface GpsRow {
  record_id: string
  record_type: 'household' | 'task'
  lat: number
  lng: number
  facility_name: string
  facility_id: string
  vaccinated: boolean
  settlement_type: string | null
  settlement_name: string | null
  user_name: string | null
  member_count: number | null
  vaccinated_count: number | null  // children vaccinated at this household (from task index)
}

export interface GpsRefusalRow {
  record_id: string
  lat: number
  lng: number
  facility_name: string
  facility_id: string
  settlement_name: string | null
  settlement_type: string | null
  user_name: string | null
  member_count: number | null
  reason_for_refusal: string | null
  reason_not_vaccinated: string | null
}

export interface GpsZeroDoseRow {
  record_id: string
  lat: number
  lng: number
  facility_name: string
  facility_id: string
  settlement_name: string | null
  settlement_type: string | null
  user_name: string | null
  age_months: number | null
  gender: string | null
  administration_status: string | null
}

export interface MicroplanRow {
  facility_name: string
  facility_id: string
  microplan_target: number
  achieved: number
  pct_complete: number
  gap: number
}

export interface SettlementRow {
  settlement_type: string
  household_count: number
  eligible_children: number
  vaccinated: number
  pct_complete: number
}

export interface DemographicsRow {
  age_group: string
  gender: string
  vaccinated_count: number
}

export interface InactiveUserRow {
  user_id: string
  user_name: string
  facility_name: string
  facility_id: string
  last_sync: string | null
  hours_since_sync: number
}

export interface RefusalRow {
  facility_name: string
  facility_id: string
  reason_code: string
  reason_label: string
  count: number
}

export interface DashboardData {
  _metadata: Metadata
  coverage: CoverageRow[]
  activity: ActivityRow[]
  enumeration: EnumerationRow[]
  stock: StockRow[]
  stock_daily: StockDailyRow[]
  gps: GpsRow[]
  gps_refusals: GpsRefusalRow[]
  gps_zerodose: GpsZeroDoseRow[]
  microplan: MicroplanRow[]
  settlement: SettlementRow[]
  demographics: DemographicsRow[]
  inactive_users: InactiveUserRow[]
  refusals: RefusalRow[]
}
