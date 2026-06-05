import * as XLSX from 'xlsx'
import type { DashboardData, HFSummaryRow, UserActivityRow, HouseholdLocationRow, DailySummaryRow } from './types'

function sheetToObjects<T>(wb: XLSX.WorkBook, name: string): T[] {
  const sheet = wb.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: 0 })
}

export function parseExcel(file: File): Promise<DashboardData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        resolve({
          hfSummary: sheetToObjects<HFSummaryRow>(wb, 'HF_Summary'),
          userActivity: sheetToObjects<UserActivityRow>(wb, 'User_Activity'),
          householdLocations: sheetToObjects<HouseholdLocationRow>(wb, 'Household_Locations'),
          dailySummary: sheetToObjects<DailySummaryRow>(wb, 'Daily_Summary'),
        })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
