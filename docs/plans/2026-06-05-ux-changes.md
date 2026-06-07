# UX Changes v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 UX improvements to the Chad Polio war room dashboard: silent-team alert bar, teams-reporting KPI, delta arrows on all KPIs, facility table rollup, and full-width map with 3-state dot legend.

**Architecture:** All changes are client-side React. No new context fields needed — all new logic reads from existing `data.userActivity`, `data.hfSummary`, `data.dailySummary` already in `DashboardContext`. One new component (`AlertBar`), three edited components (`KPICards`, `HFTable`, `CampaignMap`), one edited page (`app/page.tsx`), one edited type file (`lib/types.ts`).

**Tech Stack:** Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui · @tabler/icons-react (new install)

---

## Task 1: Install Tabler Icons

**Files:**
- No file edits — dependency install only

**Step 1: Install**

```bash
cd ~/chad-polio-dashboard
npm install @tabler/icons-react
```

**Step 2: Verify**

```bash
node -e "require('@tabler/icons-react'); console.log('ok')"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tabler/icons-react"
```

---

## Task 2: AlertBar Component

**Files:**
- Create: `components/AlertBar.tsx`
- Modify: `app/page.tsx` — add import + render between header and DateFilter

**Context:** `userActivity` has `last_sync_time: string` in format `"YYYY-MM-DD HH:MM:SS"`. "Now" = the max `last_sync_time` value across ALL records in the dataset (not system clock — the data may be days old). Silent = hours since last sync > 6, computed from that same reference point.

**Step 1: Create `components/AlertBar.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

function parseSync(s: string): Date {
  // "YYYY-MM-DD HH:MM:SS" — not ISO, needs space→T replacement
  return new Date(s.replace(' ', 'T'))
}

export function AlertBar() {
  const { data } = useDashboard()
  const [dismissed, setDismissed] = useState(false)

  if (!data || dismissed) return null

  // "now" = latest timestamp in the dataset
  const allTimes = data.userActivity.map(r => parseSync(r.last_sync_time).getTime())
  const nowMs = Math.max(...allTimes)

  // Per user: most recent sync
  const latestByUser = new Map<string, number>()
  for (const r of data.userActivity) {
    const t = parseSync(r.last_sync_time).getTime()
    const key = `${r.health_facility}||${r.user_name}`
    if (!latestByUser.has(key) || t > latestByUser.get(key)!) {
      latestByUser.set(key, t)
    }
  }

  // Silent = > 6 hours behind "now"
  const SIX_HOURS = 6 * 60 * 60 * 1000
  type Silent = { hf: string; user: string; hoursAgo: number }
  const silent: Silent[] = []
  for (const [key, t] of latestByUser) {
    const hoursAgo = (nowMs - t) / (1000 * 60 * 60)
    if (hoursAgo > 6) {
      const [hf, user] = key.split('||')
      silent.push({ hf, user, hoursAgo: Math.floor(hoursAgo) })
    }
  }

  if (silent.length === 0) return null

  // Group by HF
  const byHF = new Map<string, Silent[]>()
  for (const s of silent) {
    if (!byHF.has(s.hf)) byHF.set(s.hf, [])
    byHF.get(s.hf)!.push(s)
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
      <IconAlertTriangle className="mt-0.5 shrink-0 text-red-500" size={18} />
      <div className="flex-1">
        <span className="font-semibold">Silent teams (&gt;6h no sync): </span>
        {Array.from(byHF.entries()).map(([hf, members], i) => {
          const maxHours = Math.max(...members.map(m => m.hoursAgo))
          const names = members.map(m => m.user).join(', ')
          return (
            <span key={hf}>
              {i > 0 && ' · '}
              <strong>{hf}</strong> ({names}) — {maxHours}h ago
            </span>
          )
        })}
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-red-400 hover:text-red-600">
        <IconX size={16} />
      </button>
    </div>
  )
}
```

**Step 2: Wire into `app/page.tsx`**

Add import at top:
```typescript
import { AlertBar } from '@/components/AlertBar'
```

Add `<AlertBar />` between the header `<div>` and `<DateFilter />`:
```tsx
        </div>
        <AlertBar />
        <DateFilter />
```

**Step 3: Commit**

```bash
git add components/AlertBar.tsx app/page.tsx
git commit -m "feat: alert bar for silent teams (>6h no sync)"
```

---

## Task 3: KPI 4 Swap — Teams Reporting

**Files:**
- Modify: `components/KPICards.tsx`

**Context:** `data.userActivity` has one row per user per day. "Teams" = unique `user_name` values. "Active today" = unique user_names where `date === refDate`. `refDate` = `selectedDate` if set, else max date in `userActivity`.

**Step 1: Rewrite `components/KPICards.tsx`**

```typescript
'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '@/lib/dashboard-context'

interface Delta {
  value: number
  isGood: boolean
}

function DeltaRow({ delta }: { delta: Delta | null }) {
  if (!delta) return <p className="text-xs text-gray-300 mt-1">—</p>
  const sign = delta.value >= 0 ? '+' : ''
  const color = delta.isGood ? 'text-green-600' : 'text-red-500'
  const arrow = delta.isGood ? '↑' : '↓'
  return (
    <p className={`text-xs mt-1 font-medium ${color}`}>
      {arrow} {sign}{delta.value.toLocaleString()} vs yesterday
    </p>
  )
}

function KPICard({
  title, value, sub, color, valueColor, delta,
}: {
  title: string
  value: string
  sub: string
  color: string
  valueColor?: string
  delta?: Delta | null
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueColor ?? ''}`}>{value}</div>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
        <DeltaRow delta={delta ?? null} />
      </CardContent>
    </Card>
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

  // Reference date for "today" in Teams Reporting
  const allActivityDates = data.userActivity.map(r => r.date)
  const maxActivityDate = allActivityDates.length > 0
    ? allActivityDates.reduce((a, b) => (a > b ? a : b))
    : null
  const refDate = selectedDate ?? maxActivityDate

  // Daily summary aggregates
  const rows = selectedDate
    ? data.dailySummary.filter(r => r.date === selectedDate)
    : data.dailySummary
  const t = rows.reduce((acc, r) => ({
    enumerated: acc.enumerated + r.total_eligible_children,
    vaccinated: acc.vaccinated + r.total_vaccinated,
    missed: acc.missed + r.total_missed,
    wastage: acc.wastage + (r.total_stock_issued - r.total_stock_returned),
  }), { enumerated: 0, vaccinated: 0, missed: 0, wastage: 0 })

  const pct = t.enumerated > 0 ? Math.round((t.vaccinated / t.enumerated) * 100) : 0

  // Teams reporting
  const allTeams = new Set(data.userActivity.map(r => r.user_name))
  const todayTeams = new Set(
    data.userActivity.filter(r => r.date === refDate).map(r => r.user_name)
  )
  const teamsPct = allTeams.size > 0 ? todayTeams.size / allTeams.size : 0
  const teamsColor = teamsPct < 0.6 ? 'text-red-600' : teamsPct < 0.8 ? 'text-amber-500' : ''

  // Delta computation (only when selectedDate is set)
  let deltas: { enumerated: Delta | null; vaccinated: Delta | null; missed: Delta | null; teams: Delta | null } = {
    enumerated: null, vaccinated: null, missed: null, teams: null,
  }
  if (selectedDate) {
    const pd = prevDate(selectedDate)
    const prevRows = data.dailySummary.filter(r => r.date === pd)
    if (prevRows.length > 0) {
      const p = prevRows.reduce((acc, r) => ({
        enumerated: acc.enumerated + r.total_eligible_children,
        vaccinated: acc.vaccinated + r.total_vaccinated,
        missed: acc.missed + r.total_missed,
      }), { enumerated: 0, vaccinated: 0, missed: 0 })

      const prevTeams = new Set(data.userActivity.filter(r => r.date === pd).map(r => r.user_name))

      deltas = {
        enumerated: { value: t.enumerated - p.enumerated, isGood: t.enumerated >= p.enumerated },
        vaccinated: { value: t.vaccinated - p.vaccinated, isGood: t.vaccinated >= p.vaccinated },
        missed: { value: t.missed - p.missed, isGood: t.missed <= p.missed },
        teams: { value: todayTeams.size - prevTeams.size, isGood: todayTeams.size >= prevTeams.size },
      }
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Children Enumerated"
        value={t.enumerated.toLocaleString()}
        sub="Eligible 0–59m found"
        color="border-blue-500"
        delta={deltas.enumerated}
      />
      <KPICard
        title="Vaccinated"
        value={`${t.vaccinated.toLocaleString()} (${pct}%)`}
        sub="Coverage vs enumerated"
        color="border-green-500"
        delta={deltas.vaccinated}
      />
      <KPICard
        title="Missed Children"
        value={t.missed.toLocaleString()}
        sub="Enumerated but not vaccinated"
        color="border-red-500"
        delta={deltas.missed}
      />
      <KPICard
        title="Teams Reporting"
        value={`${todayTeams.size} / ${allTeams.size}`}
        sub="teams active today"
        color="border-purple-500"
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
git commit -m "feat: swap stock wastage for teams reporting KPI, add delta arrows"
```

---

## Task 4: HFTable Rollup

**Files:**
- Modify: `components/HFTable.tsx`

**Context:** Current table shows one row per `HFSummaryRow` (per HF per day). New table groups by `health_facility`, summing across dates (or filtering to selectedDate). Teams data comes from `data.userActivity`: count unique `user_name` per HF. "Reporting today" = unique user_names with records on `refDate`. `refDate` = `selectedDate` if set, else max date in userActivity.

**Step 1: Rewrite `components/HFTable.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { IconAlertCircle } from '@tabler/icons-react'
import { useDashboard } from '@/lib/dashboard-context'

type SortKey = 'coverage_pct' | 'missed_children' | 'eligible' | 'reporting_pct'

function Bar({ pct }: { pct: number }) {
  const c = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-200 rounded-full h-2">
        <div className={`${c} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-sm font-medium">{pct}%</span>
    </div>
  )
}

interface FacilityRow {
  health_facility: string
  eligible: number
  missed_children: number
  coverage_pct: number
  totalTeams: number
  reportingTeams: number
  reporting_pct: number
}

export function HFTable() {
  const { data, selectedDate } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('missed_children')
  const [asc, setAsc] = useState(false)
  if (!data) return null

  // Reference date for "today"
  const allDates = data.userActivity.map(r => r.date)
  const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null
  const refDate = selectedDate ?? maxDate

  // Filter hfSummary by date if selected
  const summaryRows = selectedDate
    ? data.hfSummary.filter(r => r.date === selectedDate)
    : data.hfSummary

  // Group hfSummary by health_facility
  const facilityMap = new Map<string, { eligible: number; missed: number; vaccinated: number }>()
  for (const r of summaryRows) {
    const prev = facilityMap.get(r.health_facility) ?? { eligible: 0, missed: 0, vaccinated: 0 }
    facilityMap.set(r.health_facility, {
      eligible: prev.eligible + r.eligible_children_enumerated,
      missed: prev.missed + r.missed_children,
      vaccinated: prev.vaccinated + r.total_vaccinated,
    })
  }

  // Teams from userActivity
  const totalTeamsByHF = new Map<string, Set<string>>()
  const reportingTeamsByHF = new Map<string, Set<string>>()
  for (const r of data.userActivity) {
    if (!totalTeamsByHF.has(r.health_facility)) totalTeamsByHF.set(r.health_facility, new Set())
    totalTeamsByHF.get(r.health_facility)!.add(r.user_name)
    if (r.date === refDate) {
      if (!reportingTeamsByHF.has(r.health_facility)) reportingTeamsByHF.set(r.health_facility, new Set())
      reportingTeamsByHF.get(r.health_facility)!.add(r.user_name)
    }
  }

  // Build rows
  const rows: FacilityRow[] = Array.from(facilityMap.entries()).map(([hf, vals]) => {
    const coverage_pct = vals.eligible > 0 ? Math.round((vals.vaccinated / vals.eligible) * 100) : 0
    const totalTeams = totalTeamsByHF.get(hf)?.size ?? 0
    const reportingTeams = reportingTeamsByHF.get(hf)?.size ?? 0
    const reporting_pct = totalTeams > 0 ? reportingTeams / totalTeams : 0
    return {
      health_facility: hf,
      eligible: vals.eligible,
      missed_children: vals.missed,
      coverage_pct,
      totalTeams,
      reportingTeams,
      reporting_pct,
    }
  }).sort((a, b) =>
    asc
      ? (a[sortKey] as number) - (b[sortKey] as number)
      : (b[sortKey] as number) - (a[sortKey] as number)
  )

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800"
      onClick={() => { if (sortKey === k) { setAsc(!asc) } else { setSortKey(k); setAsc(true) } }}
    >
      {label}{sortKey === k ? (asc ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
            <Th label="Coverage %" k="coverage_pct" />
            <Th label="Missed · revisit" k="missed_children" />
            <Th label="Teams reporting" k="reporting_pct" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => {
            const partial = r.reportingTeams < r.totalTeams
            return (
              <tr key={r.health_facility} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.health_facility}</div>
                  <div className="text-xs text-gray-400">{r.totalTeams} teams · {r.eligible.toLocaleString()} eligible</div>
                </td>
                <td className="px-4 py-3"><Bar pct={r.coverage_pct} /></td>
                <td className="px-4 py-3 text-red-600 font-medium">{r.missed_children.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 font-medium ${partial ? 'text-amber-500' : 'text-gray-700'}`}>
                    {partial && <IconAlertCircle size={14} />}
                    {r.reportingTeams}/{r.totalTeams}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={r.coverage_pct >= 80 ? 'default' : r.coverage_pct >= 50 ? 'secondary' : 'destructive'}>
                    {r.coverage_pct >= 80 ? 'On Track' : r.coverage_pct >= 50 ? 'At Risk' : 'Behind'}
                  </Badge>
                </td>
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
git commit -m "feat: rollup HF table by facility with team reporting column"
```

---

## Task 5: Map Full Width + 3-State Dot + Layout Restack

**Files:**
- Modify: `lib/types.ts` — update `HouseholdLocationRow.status`
- Modify: `components/CampaignMap.tsx` — add amber dot + new height + updated legend
- Modify: `app/page.tsx` — remove 2-col grid, stack vertically

**Step 1: Update `lib/types.ts`**

Change line 34:
```typescript
// Before
  status: 'enumerated' | 'vaccinated'
// After
  status: 'enumerated' | 'vaccinated' | 'revisit'
```

**Step 2: Rewrite `components/CampaignMap.tsx`**

```typescript
'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useDashboard } from '@/lib/dashboard-context'

type DotStatus = 'vaccinated' | 'revisit' | 'enumerated'

function dotColors(status: DotStatus) {
  if (status === 'vaccinated') return { color: '#16a34a', fillColor: '#22c55e' }
  if (status === 'revisit')    return { color: '#d97706', fillColor: '#f59e0b' }
  return                              { color: '#dc2626', fillColor: '#ef4444' }
}

export function CampaignMap() {
  const { data, selectedDate } = useDashboard()
  if (!data) return (
    <div className="h-[420px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
      Upload data to view map
    </div>
  )

  const locs = selectedDate
    ? data.householdLocations.filter(l => l.date === selectedDate)
    : data.householdLocations

  return (
    <MapContainer center={[12.1048, 15.0445]} zoom={12} className="h-[420px] w-full rounded-lg z-0" style={{ zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {locs.map((loc, i) => {
        const status = (loc.status as DotStatus) ?? 'enumerated'
        const { color, fillColor } = dotColors(status)
        return (
          <CircleMarker key={i} center={[loc.latitude, loc.longitude]} radius={5}
            pathOptions={{ color, fillColor, fillOpacity: 0.7, weight: 1 }}>
            <Popup>
              <strong>{loc.health_facility}</strong><br />
              User: {loc.user_name}<br />
              Status: {loc.status}<br />
              Date: {loc.date}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
```

**Step 3: Rewrite layout in `app/page.tsx`**

Replace the `<div className="grid ...">` block and map legend with a vertical stack:

```tsx
        <KPICards />
        <div>
          <h2 className="text-base font-semibold mb-3 text-gray-700">Health Facility Coverage</h2>
          <HFTable />
        </div>
        <div>
          <h2 className="text-base font-semibold mb-3 text-gray-700">Household Locations</h2>
          <CampaignMap />
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />Vaccinated</span>
            <span><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle" />Enumerated only</span>
            <span><span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-1 align-middle" />Flagged for revisit</span>
          </div>
        </div>
```

**Step 4: Commit**

```bash
git add lib/types.ts components/CampaignMap.tsx app/page.tsx
git commit -m "feat: full-width map, 3-state dot legend, vertical layout"
```

---

## Task 6: TypeScript Verification

**Files:** None — verification only

**Step 1: Run type check**

```bash
cd ~/chad-polio-dashboard && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

**Step 2: If errors, fix them before marking complete**

Common issues to watch for:
- `IconAlertTriangle`, `IconAlertCircle`, `IconX` imports from `@tabler/icons-react`
- `HouseholdLocationRow.status` now includes `'revisit'` — CampaignMap casts via `DotStatus` so no additional changes needed
- `KPICard` optional `valueColor` and `delta` props — ensure defaults handle `undefined`

**Step 3: Start dev server and do a final smoke check**

```bash
npm run dev
```

Open `http://localhost:3000`, drop in the sample file at `scripts/chad-sample-data.xlsx`, and confirm:
- [ ] Red alert bar appears (or nothing if all teams synced recently in sample data)
- [ ] KPI 4 shows "X / Y teams active today"
- [ ] KPI cards show delta row ("—" if date filter is "All", arrows if a day is selected)
- [ ] Table is grouped by facility with sub-text and team reporting column
- [ ] Table default sort: most missed at top
- [ ] Map is full width at 420px height
- [ ] Legend shows 3 states

**Step 4: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: TypeScript cleanup after UX v2 changes"
```
