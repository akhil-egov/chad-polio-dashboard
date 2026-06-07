# Issue #12 — Filter Panel Redesign
## Implementation Plan

> Grill session complete — 8 decisions locked. Do not re-litigate these.

---

## Locked decisions

| # | Decision |
|---|----------|
| 1 | Boundary hierarchy is a **flat searchable list** of 27 facilities — no tree, no district level |
| 2 | **Single unified sidebar** (~280px): search + chip + layer toggles at top, call list at bottom |
| 3 | **Single chip** — 0 or 1 facility selected at a time. No multi-select, no toast. |
| 4 | Both mental models (facility-first and problem-first) use the same sidebar — no tabs, no modes |
| 5 | **Intersection logic** — facility filter × layer toggle × sub-filter compose independently. "N filters active" indicator when any non-default filter is on. |
| 6 | **DIGIT orange** (`#F47738`) for filter sidebar chrome only (header, chip, active states). Coverage tier colours unchanged. |
| 7 | **Mobile deferred** — no bottom sheet. Desktop only for this build. |
| 8 | **URL state: `?facility=AB` only** — facility ID in URL param on selection. Layer toggles stay local. |

---

## What changes

### New file: `components/map/FilterSidebar.tsx`
The unified left sidebar. Replaces both the existing call list sidebar and the floating layer panel.

Structure (top to bottom):
```
┌─────────────────────────────────┐
│ 🔶 FILTERS  [2 active] [Clear]  │  ← DIGIT orange header, filter count badge
├─────────────────────────────────┤
│ 🔍 Search facilities...         │  ← controlled input, filters call list live
├─────────────────────────────────┤
│ [CS ABENA ×]                    │  ← chip when selectedFac is set, X clears it
├─────────────────────────────────┤
│ LAYERS                          │
│ ● Households  25,216  ON        │
│ ● Refusals      261   OFF       │
│   └ [sub-filter checkboxes]     │
│ ● Zero Dose     670   OFF       │
│   └ [sub-filter checkboxes]     │
├─────────────────────────────────┤
│ CALL LIST  (worst coverage)     │
│ CS CEPHAS     0.0%   912       │
│ CS AL-MANSOUR 23.0%  4,131     │
│ ...                             │
│ ░░░░ [scroll gradient] ░░░░░░  │
└─────────────────────────────────┘
```

Props: all filter state from `useMapState` hook — no new local state inside this component.

---

### Modified: `lib/use-map-state.ts`

Three additions:

1. **Facility URL sync** — on mount, read `?facility=XX` from `useSearchParams()` and set initial `selectedFac`. On `handleSelect`/`handleClear`, call `router.replace()` to update the URL. Use `next/navigation` hooks (`useRouter`, `useSearchParams`, `usePathname`).

2. **Facility search** — add `facilitySearch: string` + `setFacilitySearch` state. Expose `filteredFacilities` derived from `facilities` filtered by search string (case-insensitive match on `facility_name`).

3. **Filter count** — derive `filterCount: number` = (selectedFac ? 1 : 0) + (showRefusals ? 1 : 0) + (showZerodose ? 1 : 0). Used for the "N filters active" badge.

---

### Modified: `components/BubbleMap.tsx`

Four changes only:

1. **Replace existing sidebar** — remove the 290px call list `<div>` (left sidebar). Replace with `<FilterSidebar ...>` passing all `useMapState` return values.

2. **Remove floating layer panel** — the inline `LayerRow`/`SubCheck`/`REFUSAL_LABEL` JSX block that was moved here when `LayerPanel` was deleted. It now lives in `FilterSidebar`.

3. **Bubble dimming** — in the `Marker` render loop (zoom < ZOOM_THRESHOLD), when `selectedFac` is set:
   - Selected facility bubble: add a white ring (`border: '3px solid white'` in the DivIcon HTML)
   - All other bubbles: wrap `<Marker>` in a container or set `opacity` on the icon — use Leaflet's `setOpacity` or pass `opacity={0.3}` prop to `<Marker>`

4. **"N filters active" chip** — in the map header row (next to the data timestamp), add a small `filterCount > 0 && <span>` showing "N active" in DIGIT orange. Tapping it calls `handleClear()`.

---

### Modified: `lib/constants.ts`

Add:
```ts
export const DIGIT_ORANGE = '#F47738'
```

Confirm this value against the Figma (Design System Drafts, Pages 8–13) before shipping.

---

## Implementation sequence

### Step 1 — URL sync in `use-map-state.ts`
- Add `useSearchParams`, `useRouter`, `usePathname` imports from `next/navigation`
- On mount effect: if `?facility=XX` in URL, find matching facility and call `handleSelect`
- In `handleSelect`: call `router.replace(pathname + ?facility=facilityId)`
- In `handleClear`: call `router.replace(pathname)` (strips param)
- Add `facilitySearch` state + `filteredFacilities` derived
- Add `filterCount` derived
- **Test**: navigate to `/?facility=AB`, confirm CS ABENA is pre-selected

### Step 2 — `FilterSidebar.tsx`
- Build the component receiving all props from `useMapState`
- Header: DIGIT orange background or left-border accent, funnel icon (`IconFilter` from `@tabler/icons-react`), filter count badge
- Search input: controlled, `onChange → setFacilitySearch`
- Chip: renders when `selectedFac !== null`, clicking X calls `handleClear()`
- Layer section: move the `LayerRow` / `SubCheck` functions here from `BubbleMap.tsx`
- Call list: render `filteredFacilities` (search-filtered). Each row: click → `handleSelect(fac.name)`. Scroll gradient at bottom (already implemented in the existing call list — copy the pattern)
- **No new state** — pure display component wired to props

### Step 3 — Update `BubbleMap.tsx`
- Replace the old 290px sidebar div with `<FilterSidebar>`
- Remove inline `LayerRow` / `SubCheck` / `REFUSAL_LABEL` (now in FilterSidebar)
- Add bubble opacity in the `Marker` loop:
  ```tsx
  opacity={selectedFac && fac.name !== selectedFac ? 0.3 : 1}
  ```
  Note: Leaflet `<Marker>` accepts an `opacity` prop directly.
- Add filter count chip to the map header

### Step 4 — `lib/constants.ts`
- Add `DIGIT_ORANGE`

### Step 5 — Visual verification
Screenshot at each state:
- Default (no filter) — public mode and full mode
- Facility selected (chip visible, other bubbles dimmed)
- Refusals ON (layer toggle active, reason sub-filters expanded)
- Both filters active (facility + refusals — intersection, "2 filters active" badge)
- Search input filtering the call list
- URL `?facility=AB` on load — confirm pre-selection

---

## What does NOT change

- `DotHoverTracker` logic — unchanged
- Canvas renderer (`L.canvas`) — unchanged
- `coverageInfo` removed in earlier refactor — `vis.bubbleColor()` used — unchanged
- `useMapState` filter composition logic — only additions, no rewrites
- Day filter in header — unchanged
- Public/full mode colour rules — unchanged
- `app/page.tsx` — no layout change needed (BubbleMap is already full-screen with its own layout)

---

## Files touched

| File | Change |
|------|--------|
| `lib/constants.ts` | Add `DIGIT_ORANGE` |
| `lib/use-map-state.ts` | URL sync, facility search, filter count |
| `components/map/FilterSidebar.tsx` | **New** — unified sidebar |
| `components/BubbleMap.tsx` | Swap sidebar, remove floating panel, add dimming |

Four files. No new dependencies (tabler icons already installed).

---

## Open question before coding

**Confirm DIGIT orange hex** from Figma (Design System Drafts, Pages 8–13). Plan uses `#F47738` as a placeholder. If the Figma specifies a different value, update `DIGIT_ORANGE` in `lib/constants.ts` before Step 2.
