# Plan: Map Filter Improvements (Issue #20)

## Spec
- Panel width: 220px → 280px, HF names wrap (remove `truncate`)
- New "Filters" collapsible section (between Layers and HF list)
  - Team filter: search input + multi-select checkboxes (386 teams, search required)
  - Date filter: multi-select checkboxes (dates derived from record_id for household/refusal layers only)
- Team + date filters apply to all dot layers
- Cascade: when filters active, HF list records = GPS dot count, covPct = sum(vaccinated_count)/eligible_children
- Empty state message when totalVisible === 0 and any filter active
- Both public and full mode

## Steps

### 1. `lib/use-map-state.ts`
- Add `extractDateFromRecordId(id: string): string | null` — regex `(\d{4}-\d{2}-\d{2})`
- Add state: `selectedTeams: Set<string> | null`, `selectedDates: Set<string> | null`, `teamSearch: string`
- Add computed: `allTeams: string[]` (sorted, distinct user_name across all GPS layers), `allDates: string[]` (sorted, distinct dates from household + refusal record_ids)
- Filter each `visible*` useMemo by team and date (where date is derivable)
- Update `filterCount` to include active team/date counts
- Add functions: `toggleTeam`, `isTeamChecked`, `selectAllTeams`, `toggleDate`, `isDateChecked`, `selectAllDates`, `setTeamSearch`
- Add `filteredFacilitiesWithStats` useMemo — when team/date active: recompute records/covPct from GPS dots; otherwise use enumeration

### 2. `components/map/FilterSidebar.tsx`
- `w-[220px]` → `w-[280px]` on root div
- Remove `truncate` from HF name div (line 482)
- Add props for team/date filter state
- Add `FiltersSection` component (collapsible, between Layers and HF list):
  - Team subsection: search `<input>` + scrollable checkbox list (max-h ~160px)
  - Date subsection: checkbox list (7 dates max)
  - "Select all" link per subsection when partially filtered
- Empty state: when `filteredFacilities.length === 0` AND filter active, show "No records match" in HF list (already exists but needs to reflect dot emptiness too — add separate `noDotsMatch` prop)

### 3. `components/BubbleMap.tsx`
- Wrapper div: `w-[220px]` → `w-[280px]`
- Destructure new state from `useMapState`
- Pass new props to `FilterSidebar`
- Wire `filteredFacilitiesWithStats` into the sidebar's `facilities` prop when filters active
- Update `handleClearAll` to also reset team/date filters
- Add empty-state overlay on map when `totalVisible === 0` and any filter active

## Date filter note
ZeroDose and ClosedHousehold record IDs are UUIDs — no date parseable. Date filter silently has no effect on those layers (dots remain visible). No special UI needed.
