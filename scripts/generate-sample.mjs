import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'

const HFS = ['CS ABENA', 'CS MADIAGO', 'CS TOUKRA', 'CS NGUELI', 'CS CHAGOUA', 'CS DIGUEL', 'CS MOURSAL']
const DATES = ['2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07']
const VACC_DATES = ['2026-06-05', '2026-06-06', '2026-06-07']

// HF_Summary
const hfSummary = []
for (const hf of HFS) {
  const target_enum = 2000 + Math.floor(Math.random() * 2000)
  const target_vacc = Math.floor(target_enum * 0.3)
  const total_users = 8 + Math.floor(Math.random() * 8)
  for (const date of DATES) {
    const enumerated = Math.floor(target_enum * (0.3 + Math.random() * 0.5))
    const eligible = Math.floor(enumerated * (0.35 + Math.random() * 0.2))
    const vaccinated = VACC_DATES.includes(date) ? Math.floor(eligible * (0.4 + Math.random() * 0.5)) : 0
    const missed = Math.max(0, eligible - vaccinated)
    hfSummary.push({
      health_facility: hf,
      target_enumeration: target_enum,
      target_vaccination: target_vacc,
      total_enumeration_records: enumerated,
      eligible_children_enumerated: eligible,
      total_vaccinated: vaccinated,
      missed_children: missed,
      guest_member_count: Math.floor(Math.random() * 80),
      absent_household_count: Math.floor(Math.random() * 60),
      total_users,
      active_users: Math.floor(total_users * (0.5 + Math.random() * 0.5)),
      stock_issued: VACC_DATES.includes(date) ? vaccinated + Math.floor(Math.random() * 100) : 0,
      stock_returned: VACC_DATES.includes(date) ? Math.floor(Math.random() * 80) : 0,
      date,
    })
  }
}

// User_Activity
const userActivity = []
for (const hf of HFS) {
  const numUsers = 6 + Math.floor(Math.random() * 6)
  for (let u = 1; u <= numUsers; u++) {
    const userName = `${hf.replace('CS ', '').slice(0, 2).toUpperCase()}-${String(u).padStart(2, '0')}`
    for (const date of DATES) {
      const records = 40 + Math.floor(Math.random() * 80)
      const eligible = Math.floor(records * (0.35 + Math.random() * 0.2))
      const vaccinated = VACC_DATES.includes(date) ? Math.floor(eligible * (0.4 + Math.random() * 0.5)) : 0
      const h = 8 + Math.floor(Math.random() * 8)
      const m = Math.floor(Math.random() * 60)
      userActivity.push({
        health_facility: hf,
        user_name: userName,
        date,
        enumeration_records: records,
        eligible_children: eligible,
        vaccinated,
        last_sync_time: `${date} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      })
    }
  }
}

// Household_Locations — N'Djamena area coords
const householdLocations = []
let hhCount = 1
for (const hf of HFS) {
  const baseLat = 12.05 + Math.random() * 0.15
  const baseLng = 15.01 + Math.random() * 0.10
  for (const date of DATES) {
    const count = 60 + Math.floor(Math.random() * 80)
    for (let i = 0; i < count; i++) {
      const status = (VACC_DATES.includes(date) && Math.random() > 0.4) ? 'vaccinated' : 'enumerated'
      householdLocations.push({
        health_facility: hf,
        user_name: `${hf.replace('CS ', '').slice(0, 2).toUpperCase()}-${String(1 + (i % 8)).padStart(2, '0')}`,
        household_id: `HH-${String(hhCount++).padStart(4, '0')}`,
        latitude: +(baseLat + (Math.random() - 0.5) * 0.04).toFixed(6),
        longitude: +(baseLng + (Math.random() - 0.5) * 0.04).toFixed(6),
        status,
        date,
      })
    }
  }
}

// Daily_Summary
const dailySummary = DATES.map(date => {
  const rows = hfSummary.filter(r => r.date === date)
  return {
    date,
    total_enumeration_records: rows.reduce((s, r) => s + r.total_enumeration_records, 0),
    total_eligible_children: rows.reduce((s, r) => s + r.eligible_children_enumerated, 0),
    total_vaccinated: rows.reduce((s, r) => s + r.total_vaccinated, 0),
    total_missed: rows.reduce((s, r) => s + r.missed_children, 0),
    total_stock_issued: rows.reduce((s, r) => s + r.stock_issued, 0),
    total_stock_returned: rows.reduce((s, r) => s + r.stock_returned, 0),
  }
})

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hfSummary), 'HF_Summary')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userActivity), 'User_Activity')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(householdLocations), 'Household_Locations')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySummary), 'Daily_Summary')

const xlsxPath = 'scripts/chad-sample-data.xlsx'
writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`✓ Written: ${xlsxPath}`)

const jsonPath = 'public/data.json'
writeFileSync(jsonPath, JSON.stringify({ hfSummary, userActivity, householdLocations, dailySummary }, null, 2))
console.log(`✓ Written: ${jsonPath}`)
console.log(`  HF_Summary rows:          ${hfSummary.length}`)
console.log(`  User_Activity rows:        ${userActivity.length}`)
console.log(`  Household_Locations rows:  ${householdLocations.length}`)
console.log(`  Daily_Summary rows:        ${dailySummary.length}`)
