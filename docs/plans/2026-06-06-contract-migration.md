# Contract Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all dashboard components from the old two-file schema (`data-summary.json` / `data-locations.json`) to the single `public/data.json` structure defined in `CONTRACT.md`.

**Architecture:** Replace two fetches (summary + locations) with one fetch of `public/data.json`. The context layer translates the new contract types into props for each component. All field renames happen in types + context; components get cleaner prop shapes.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, shadcn/ui, Leaflet (BubbleMap)

---

## Field mapping cheat sheet

| Old field | New field | Sheet |
|---|---|---|
| `data.hfSummary[].health_facility` | `data.enumeration[].facility_name` | enumeration |
| `data.hfSummary[].eligible_children_enumerated` | `data.enumeration[].eligible_children` | enumeration |
| `data.hfSummary[].total_vaccinated` | `data.enumeration[].vaccinated_children` | enumeration |
| `data.hfSummary[].missed_children` | *(derive: eligible - vaccinated_children)* | enumeration |
| `data.hfSummary[].stock_issued` | `data.stock[].vials_issued` | stock |
| `data.hfSummary[].stock_returned` | `data.stock[].vials_returned` | stock |
| `data.dailySummary[].total_eligible_children` | aggregate `coverage[].vaccinated` | coverage |
| `data.dailySummary[].total_vaccinated` | aggregate `coverage[].vaccinated` | coverage |
| `data.userActivity[].health_facility` | `data.activity[].facility_name` | activity |
| `data.userActivity[].user_name` | `data.activity[].user_name` | activity |
| `data.userActivity[].enumeration_records` | `data.activity[].task_count` | activity |
| `data.userActivity[].last_sync_time` | `data.activity[].last_sync` | activity |
| `data.userActivity[].vaccinated` | *(no equivalent in activity — drop from table)* | — |
| `data.generated_at` | `data._metadata.run_timestamp` | _metadata |
| `locations[].latitude` | `data.gps[].lat` | gps |
| `locations[].longitude` | `data.gps[].lng` | gps |
| `locations[].health_facility` | `data.gps[].facility_name` | gps |
| `locations[].status` | derive from `data.gps[].vaccinated` (bool) | gps |
| `locations[].household_id` | `data.gps[].record_id` | gps |

---

## Task 1: Rename old data files

**Files:**
- Rename: `public/data-summary.json` → `public/data-summary.old.json`
- Rename: `public/data-locations.json` → `public/data-locations.old.json`

**Step 1: Rename**
```bash
mv public/data-summary.json public/data-summary.old.json
mv public/data-locations.json public/data-locations.old.json
```

**Step 2: Commit**
```bash
git add -A
git commit -m "chore: archive old data files before contract migration"
```

---

## Task 2: Create stub `public/data.json`

**Files:**
- Create: `public/data.json`

**Step 1: Write the stub**

Create `public/data.json` with this content — arrays are empty so the UI renders in a graceful empty state until ingest delivers real data:

```json
{
  "_metadata": {
    "run_timestamp": "2026-06-06T00:00:00Z",
    "campaign_id": "chad-polio-2026",
    "country": "Chad",
    "records_per_sheet": "{}",
    "extraction_duration_s": 0
  },
  "coverage": [],
  "activity": [],
  "enumeration": [],
  "stock": [],
  "gps": [],
  "microplan": [],
  "settlement": [],
  "demographics": [],
  "inactive_users": [],
  "refusals": []
}
```

**Step 2: Commit**
```bash
git add public/data.json
git commit -m "chore: add stub data.json with contract structure"
```

---

## Task 3: Rewrite `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

**Step 1: Replace entire file**

```typescript
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
  date: string
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

export interface GpsRow {
  record_id: string
  record_type: 'household' | 'task'
  lat: number
  lng: number
  facility_name: string
  facility_id: string
  vaccinated: boolean
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
  gps: GpsRow[]
  microplan: MicroplanRow[]
  settlement: SettlementRow[]
  demographics: DemographicsRow[]
  inactive_users: InactiveUserRow[]
  refusals: RefusalRow[]
}
```

**Step 2: Commit**
```bash
git add lib/types.ts
git commit -m "feat: update types to match CONTRACT.md schema"
```

---

## Task 4: Rewrite `lib/dashboard-context.tsx`

**Files:**
- Modify: `lib/dashboard-context.tsx`

**Step 1: Replace entire file**

Key changes:
- Single fetch of `/data.json` instead of two separate fetches
- Remove `locations` / `loadLocations` / `locationsLoading` — GPS is now inside `data.gps`
- `selectedDate` stays as-is

```typescript
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { DashboardData } from './types'

interface Ctx {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  selectedDate: string | null
  setSelectedDate: (d: string | null) => void
}

const DashboardContext = createContext<Ctx | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data.json')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`)
        return r.json()
      })
      .then((d: DashboardData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, selectedDate, setSelectedDate }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard outside provider')
  return ctx
}
```

**Step 2: Commit**
```bash
git add lib/dashboard-context.tsx
git commit -m "feat: load data.json; remove separate locations fetch"
```

---

## Task 5: Migrate `components/DateFilter.tsx`

**Files:**
- Modify: `components/DateFilter.tsx`

**Step 1: Update to use `coverage` dates**

`dailySummary` is gone. Derive unique dates with vaccination flag from `coverage[]`.

```typescript
'use client'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'

function formatLabel(isoDate: string, hasVacc: boolean) {
  const d = new Date(isoDate + 'T00:00:00')
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return hasVacc ? `${label} +Vacc` : label
}

export function DateFilter({ hideLabel }: { hideLabel?: boolean } = {}) {
  const { data, selectedDate, setSelectedDate } = useDashboard()

  const dates = data
    ? Array.from(
        data.coverage.reduce((map, row) => {
          if (!row.date) return map
          const prev = map.get(row.date) ?? false
          map.set(row.date, prev || row.vaccinated > 0)
          return map
        }, new Map<string, boolean>())
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, hasVacc]) => ({ value: date, label: formatLabel(date, hasVacc) }))
    : []

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!hideLabel && <span className="text-sm font-medium text-gray-500">Day:</span>}
      <Button variant={!selectedDate ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(null)}>All</Button>
      {dates.map(d => (
        <Button key={d.value} variant={selectedDate === d.value ? 'default' : 'outline'} size="sm" onClick={() => setSelectedDate(d.value)}>
          {d.label}
        </Button>
      ))}
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add components/DateFilter.tsx
git commit -m "feat: DateFilter reads coverage[] dates per CONTRACT.md"
```

---

## Task 6: Migrate `components/KPICards.tsx`

**Files:**
- Modify: `components/KPICards.tsx`

**Step 1: Replace data sources**

- `dailySummary` → aggregate from `coverage[]` (sum `vaccinated`, derive eligible from `enumeration[]`)
- `userActivity` → `activity[]`
- `generated_at` → `_metadata.run_timestamp`

Key logic:
- Enumerated = sum of `enumeration[].eligible_children` (campaign total, not date-filtered — enumeration sheet is cumulative)
- Vaccinated = sum of `coverage[].vaccinated` filtered by `selectedDate`
- Missed = eligible - vaccinated
- Teams: total unique `activity[].user_name`; today = those with `date === refDate`
- Delta: compare selected day's `coverage` sum vs previous day

```typescript
'use client'
import { useDashboard } from '@/lib/dashboard-context'

interface Delta { value: number; isGood: boolean }

function DeltaChip({ delta }: { delta: Delta | null }) {
  if (!delta) return <span className="font-data text-[10px] text-slate-300 tracking-wide">— no prior day</span>
  const sign = delta.value >= 0 ? '+' : ''
  return (
    <span className={`font-data text-[10px] font-medium tracking-wide ${delta.isGood ? 'text-green-600' : 'text-red-500'}`}>
      {delta.isGood ? '↑' : '↓'} {sign}{delta.value.toLocaleString()} vs yesterday
    </span>
  )
}

function KPICard({ title, value, sub, accentColor, valueColor, delta }: {
  title: string; value: string; sub: string; accentColor: string; valueColor?: string; delta?: Delta | null
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col shadow-sm">
      <div className="h-[3px] w-full flex-none" style={{ background: accentColor }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="font-condensed text-[10px] font-bold tracking-[0.22em] uppercase text-slate-400">{title}</p>
        <div className={`font-data text-[2rem] font-bold leading-none tracking-tight ${valueColor ?? 'text-slate-800'}`}>{value}</div>
        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-[11px] text-slate-400">{sub}</p>
          <DeltaChip delta={delta ?? null} />
        </div>
      </div>
    </div>
  )
}

function prevDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() - 1)
  return dt.toISOString().slice(0, 10)
}

export function KPICards() {
  const { data, selectedDate } = useDashboard()
  if (!data) return null

  // Enumerated: cumulative from enumeration sheet (no date)
  const enumerated = data.enumeration.reduce((s, r) => s + r.eligible_children, 0)

  // Vaccinated: from coverage, filtered by date
  const covRows = selectedDate
    ? data.coverage.filter(r => r.date === selectedDate)
    : data.coverage
  const vaccinated = covRows.reduce((s, r) => s + r.vaccinated, 0)
  const missed = Math.max(0, enumerated - vaccinated)
  const pct = enumerated > 0 ? Math.round((vaccinated / enumerated) * 100) : 0

  // Teams
  const allActivityDates = data.activity.map(r => r.date)
  const maxActivityDate = allActivityDates.length > 0
    ? allActivityDates.reduce((a, b) => (a > b ? a : b))
    : null
  const refDate = selectedDate ?? maxActivityDate

  const allTeams = new Set(data.activity.map(r => r.user_name))
  const todayTeams = new Set(data.activity.filter(r => r.date === refDate).map(r => r.user_name))
  const teamsPct = allTeams.size > 0 ? todayTeams.size / allTeams.size : 0
  const teamsColor = teamsPct < 0.6 ? 'text-red-600' : teamsPct < 0.8 ? 'text-amber-600' : 'text-slate-800'

  // Deltas
  let deltas: { vaccinated: Delta | null; teams: Delta | null } = { vaccinated: null, teams: null }
  if (selectedDate) {
    const pd = prevDate(selectedDate)
    const prevVacc = data.coverage.filter(r => r.date === pd).reduce((s, r) => s + r.vaccinated, 0)
    const prevTeams = new Set(data.activity.filter(r => r.date === pd).map(r => r.user_name))
    deltas = {
      vaccinated: { value: vaccinated - prevVacc, isGood: vaccinated >= prevVacc },
      teams: { value: todayTeams.size - prevTeams.size, isGood: todayTeams.size >= prevTeams.size },
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard title="Children Enumerated" value={enumerated.toLocaleString()} sub="Eligible 0–59m found" accentColor="#009FDB" />
      <KPICard
        title="Vaccinated"
        value={`${vaccinated.toLocaleString()} (${pct}%)`}
        sub="Coverage vs enumerated"
        accentColor="#16a34a"
        valueColor={pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-slate-800'}
        delta={deltas.vaccinated}
      />
      <KPICard
        title="Missed Children"
        value={missed.toLocaleString()}
        sub="Need revisit"
        accentColor="#dc2626"
        valueColor={missed > 0 ? 'text-red-600' : 'text-slate-800'}
      />
      <KPICard
        title="Teams Reporting"
        value={`${todayTeams.size} / ${allTeams.size}`}
        sub="Active today"
        accentColor="#7c3aed"
        valueColor={teamsColor}
        delta={deltas.teams}
      />
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add components/KPICards.tsx
git commit -m "feat: KPICards reads coverage + enumeration + activity per CONTRACT.md"
```

---

## Task 7: Migrate `components/HFTable.tsx`

**Files:**
- Modify: `components/HFTable.tsx`

**Step 1: Replace data sources**

- Facility list + eligible/vaccinated: `enumeration[]` (cumulative, no date filter)
- Teams reporting: `activity[]` filtered by date
- Coverage %: `enumeration[].pct_complete` (or compute: `vaccinated_children / eligible_children`)

```typescript
'use client'
import { useState } from 'react'
import { IconAlertCircle, IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

type SortKey = 'pct_complete' | 'missed' | 'eligible' | 'reporting_pct'

function CoverageBar({ pct }: { pct: number }) {
  const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'
  const textColor = pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-20 bg-slate-200 rounded-full h-[4px]">
        <div className="h-[4px] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
      <span className={`font-data text-[12px] font-semibold ${textColor}`}>{pct.toFixed(1)}%</span>
    </div>
  )
}

function StatusBadge({ pct }: { pct: number }) {
  if (pct >= 80) return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> On Track
    </span>
  )
  if (pct >= 50) return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> At Risk
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Behind
    </span>
  )
}

interface FacilityRow {
  facility_name: string
  eligible: number
  missed: number
  pct_complete: number
  totalTeams: number
  reportingTeams: number
  reporting_pct: number
}

export function HFTable() {
  const { data, selectedDate } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('missed')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  const allActivityDates = data.activity.map(r => r.date)
  const maxDate = allActivityDates.length > 0 ? allActivityDates.reduce((a, b) => (a > b ? a : b)) : null
  const refDate = selectedDate ?? maxDate

  // enumeration is cumulative — always show all rows
  const totalTeamsByHF = new Map<string, Set<string>>()
  const reportingTeamsByHF = new Map<string, Set<string>>()
  for (const r of data.activity) {
    if (!totalTeamsByHF.has(r.facility_name)) totalTeamsByHF.set(r.facility_name, new Set())
    totalTeamsByHF.get(r.facility_name)!.add(r.user_name)
    if (r.date === refDate) {
      if (!reportingTeamsByHF.has(r.facility_name)) reportingTeamsByHF.set(r.facility_name, new Set())
      reportingTeamsByHF.get(r.facility_name)!.add(r.user_name)
    }
  }

  const rows: FacilityRow[] = data.enumeration.map(r => {
    const pct_complete = r.eligible_children > 0
      ? (r.vaccinated_children / r.eligible_children) * 100
      : 0
    const missed = Math.max(0, r.eligible_children - r.vaccinated_children)
    const totalTeams = totalTeamsByHF.get(r.facility_name)?.size ?? 0
    const reportingTeams = reportingTeamsByHF.get(r.facility_name)?.size ?? 0
    return {
      facility_name: r.facility_name,
      eligible: r.eligible_children,
      missed,
      pct_complete,
      totalTeams,
      reportingTeams,
      reporting_pct: totalTeams > 0 ? reportingTeams / totalTeams : 0,
    }
  }).sort((a, b) =>
    asc
      ? (a[sortKey] as number) - (b[sortKey] as number)
      : (b[sortKey] as number) - (a[sortKey] as number)
  )

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return asc ? <IconChevronUp size={12} className="inline ml-0.5 opacity-50" /> : <IconChevronDown size={12} className="inline ml-0.5 opacity-50" />
  }

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc)
    else { setSortKey(k); setAsc(true) }
  }

  const thBase = 'px-4 py-3 text-left font-condensed text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500 cursor-pointer select-none hover:text-[#009FDB] transition-colors whitespace-nowrap'
  const thStatic = 'px-4 py-3 text-left font-condensed text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500'

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={thStatic}>Facility</th>
            <th className={thBase} onClick={() => handleSort('pct_complete')}>Coverage % <SortIcon k="pct_complete" /></th>
            <th className={thBase} onClick={() => handleSort('missed')}>Missed · Revisit <SortIcon k="missed" /></th>
            <th className={thBase} onClick={() => handleSort('reporting_pct')}>Teams Reporting <SortIcon k="reporting_pct" /></th>
            <th className={thStatic}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const partial = r.reportingTeams < r.totalTeams
            return (
              <tr key={r.facility_name} className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[13px] text-slate-800">{r.facility_name}</div>
                  <div className="font-data text-[10px] text-slate-400 mt-0.5">{r.totalTeams} teams · {r.eligible.toLocaleString()} eligible</div>
                </td>
                <td className="px-4 py-3"><CoverageBar pct={r.pct_complete} /></td>
                <td className="px-4 py-3">
                  <span className={`font-data text-[13px] font-semibold ${r.missed > 0 ? 'text-red-600' : 'text-slate-400'}`}>{r.missed.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-data text-[12px] font-medium flex items-center gap-1.5 ${partial ? 'text-amber-600' : 'text-slate-500'}`}>
                    {partial && <IconAlertCircle size={12} className="shrink-0" />}
                    {r.reportingTeams}/{r.totalTeams}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge pct={r.pct_complete} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add components/HFTable.tsx
git commit -m "feat: HFTable reads enumeration + activity per CONTRACT.md"
```

---

## Task 8: Migrate `components/TeamActivityTable.tsx`

**Files:**
- Modify: `components/TeamActivityTable.tsx`

**Step 1: Replace field names**

- `r.health_facility` → `r.facility_name`
- `r.enumeration_records` → `r.task_count`
- `r.last_sync_time` → `r.last_sync`
- Drop `r.eligible_children` and `r.vaccinated` columns (not in `activity` sheet per contract)
- `r.is_inactive` drives the stale badge instead of computing from timestamp delta

```typescript
'use client'
import { useDashboard } from '@/lib/dashboard-context'

export function TeamActivityTable() {
  const { data, selectedDate } = useDashboard()
  if (!data) return null

  const rows = data.activity
    .filter(r => !selectedDate || r.date === selectedDate)
    .sort((a, b) =>
      a.facility_name.localeCompare(b.facility_name) ||
      a.user_name.localeCompare(b.user_name)
    )

  const thClass = 'px-4 py-3 text-left font-condensed text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500 whitespace-nowrap'

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={thClass}>Health Facility</th>
            <th className={thClass}>User</th>
            <th className={thClass}>Date</th>
            <th className={`${thClass} text-right`}>Tasks</th>
            <th className={thClass}>Last Sync</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-slate-100 hover:bg-[#f0f7fd] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
              <td className="px-4 py-3 font-medium text-[13px] text-slate-800">{r.facility_name}</td>
              <td className="px-4 py-3 text-[13px] text-slate-600">{r.user_name}</td>
              <td className="px-4 py-3 font-data text-[11px] text-slate-400">{r.date}</td>
              <td className="px-4 py-3 text-right font-data text-[12px] text-slate-600">{r.task_count.toLocaleString()}</td>
              <td className={`px-4 py-3 font-data text-[11px] ${r.is_inactive ? 'text-red-600' : 'text-slate-500'}`}>
                {r.last_sync ? r.last_sync.slice(11, 16) : '—'}
                {r.is_inactive && (
                  <span className="ml-1.5 text-[9px] font-bold tracking-[0.1em] uppercase text-red-500 align-middle">stale</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add components/TeamActivityTable.tsx
git commit -m "feat: TeamActivityTable reads activity[] per CONTRACT.md"
```

---

## Task 9: Migrate `components/AlertBar.tsx`

**Files:**
- Modify: `components/AlertBar.tsx`

**Step 1: Switch to `inactive_users` sheet**

The contract provides `inactive_users[]` directly — no need to compute staleness from timestamps. Use it as the source of truth.

```typescript
'use client'
import { useState } from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

export function AlertBar() {
  const { data } = useDashboard()
  const [dismissed, setDismissed] = useState(false)

  if (!data || dismissed || data.inactive_users.length === 0) return null

  const byHF = new Map<string, { users: string[]; maxHours: number }>()
  for (const r of data.inactive_users) {
    if (!byHF.has(r.facility_name)) byHF.set(r.facility_name, { users: [], maxHours: 0 })
    const entry = byHF.get(r.facility_name)!
    entry.users.push(r.user_name)
    entry.maxHours = Math.max(entry.maxHours, Math.floor(r.hours_since_sync))
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
      <IconAlertTriangle className="mt-px shrink-0 text-red-500" size={15} />
      <div className="flex-1 min-w-0 text-sm text-red-800">
        <span className="font-condensed text-[10px] font-bold tracking-[0.2em] uppercase text-red-600 mr-2">
          Silent Teams (&gt;6h no sync)
        </span>
        {Array.from(byHF.entries()).map(([hf, { users, maxHours }], i) => (
          <span key={hf}>
            {i > 0 && <span className="text-red-300 mx-1">·</span>}
            <strong className="font-semibold">{hf}</strong>
            {' '}({users.join(', ')}) — {maxHours}h ago
          </span>
        ))}
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
        <IconX size={14} />
      </button>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add components/AlertBar.tsx
git commit -m "feat: AlertBar reads inactive_users[] per CONTRACT.md"
```

---

## Task 10: Migrate `components/BubbleMap.tsx`

**Files:**
- Modify: `components/BubbleMap.tsx`

**Step 1: Replace field names**

- `data.hfSummary` → `data.enumeration` for facility list + coverage
- `locations` (from old context) → `data.gps`
- `loc.latitude` / `loc.longitude` → `loc.lat` / `loc.lng`
- `loc.health_facility` → `loc.facility_name`
- `loc.status` (string) → derive: `loc.vaccinated ? 'vaccinated' : 'enumerated'`
- `data.generated_at` → `data._metadata.run_timestamp`
- Remove `loadLocations` call — GPS is already in `data`
- Remove `locationsLoading` — not needed

Key diffs in `BubbleMap.tsx`:

```typescript
// Context destructure — remove locations/locationsLoading/loadLocations
const { data, selectedDate } = useDashboard()

// useEffect: remove loadLocations() call
useEffect(() => {
  fetch('/adm1.geojson').then(r => r.json()).then(setAdm1).catch(() => null)
  fetch('/adm2.geojson').then(r => r.json()).then(setAdm2).catch(() => null)
}, [])

// Centroids: data.gps instead of locations, lat/lng instead of latitude/longitude
const centroids = useMemo(() => {
  if (!data) return new Map<string, [number, number]>()
  const acc = new Map<string, { latSum: number; lngSum: number; n: number }>()
  for (const loc of data.gps) {
    if (!acc.has(loc.facility_name)) acc.set(loc.facility_name, { latSum: 0, lngSum: 0, n: 0 })
    const c = acc.get(loc.facility_name)!
    c.latSum += loc.lat; c.lngSum += loc.lng; c.n++
  }
  const out = new Map<string, [number, number]>()
  for (const [fac, { latSum, lngSum, n }] of acc) out.set(fac, [latSum / n, lngSum / n])
  return out
}, [data])

// Facilities: from data.enumeration instead of data.hfSummary
const facilities = useMemo(() => {
  if (!data) return []
  return data.enumeration.map(r => {
    const covPct = r.pct_complete
    const { color } = coverageInfo(covPct)
    return {
      name: r.facility_name,
      records: r.households_registered,
      covPct,
      color,
      abbrev: r.facility_name.replace(/^CS\s+/i, ''),
    }
  }).sort((a, b) => a.covPct - b.covPct)
}, [data])

// Visible dots: data.gps instead of locations, loc.lat/lng, derive status
const visibleLocs = useMemo(() => {
  if (!data) return []
  let locs = data.gps
  if (selectedFac) locs = locs.filter(l => l.facility_name === selectedFac)
  return locs
}, [data, selectedFac])

// In CircleMarker: use loc.lat, loc.lng, derive color from loc.vaccinated
const fill = loc.vaccinated ? '#22c55e' : '#ef4444'
const stroke = loc.vaccinated ? '#16a34a' : '#dc2626'
<CircleMarker center={[loc.lat, loc.lng]} ... >
  <Popup>{loc.facility_name} · {loc.record_type}</Popup>
</CircleMarker>

// Stats bar: data.gps.length instead of locations.length
{data?.gps.length.toLocaleString()} records

// Timestamp: data._metadata.run_timestamp
{data?._metadata.run_timestamp
  ? new Date(data._metadata.run_timestamp).toLocaleDateString(...)
  : '—'}
```

Apply these changes throughout the full file — do not add intermediate variables, just rename in place.

**Step 2: Commit**
```bash
git add components/BubbleMap.tsx
git commit -m "feat: BubbleMap reads enumeration + gps per CONTRACT.md"
```

---

## Task 11: Update `app/page.tsx` header timestamp

**Files:**
- Modify: `app/page.tsx`

**Step 1: Update generated_at reference**

Find the line referencing `data?.generated_at` and change to `data?._metadata.run_timestamp`:

```typescript
// Old
{data?.generated_at && (
  <>
    ...
    {new Date(data.generated_at).toLocaleString(...)}
  </>
)}

// New
{data?._metadata?.run_timestamp && (
  <>
    ...
    {new Date(data._metadata.run_timestamp).toLocaleString(...)}
  </>
)}
```

Also remove the `loadLocations` prop from the `Tabs` `onValueChange` handler — it's no longer needed:

```typescript
// Old
onValueChange={v => {
  if (v === 'map') loadLocations()
  setActiveTab(v)
}}

// New
onValueChange={v => setActiveTab(v)}
```

**Step 2: Commit**
```bash
git add app/page.tsx
git commit -m "feat: page.tsx reads _metadata.run_timestamp per CONTRACT.md"
```

---

## Task 12: Screenshot and verify

**Step 1: Take a screenshot of each tab**

Use Puppeteer MCP:
1. Navigate to `http://localhost:3000`
2. Screenshot overview tab — check: no JS errors, KPI cards show (may be 0s with empty data), HF table shows empty gracefully
3. Click Map tab — check: map loads, no crash
4. Click Team Activity tab — check: empty table, no crash

**Step 2: Fix any TypeScript errors**
```bash
cd /Users/akhil/chad-polio-dashboard && npx tsc --noEmit
```

**Step 3: Final commit if clean**
```bash
git add -A
git commit -m "chore: final cleanup after contract migration"
```

---

## Task 13: Push to Vercel

```bash
git push origin main
```

Vercel auto-deploys on push to `main`.
