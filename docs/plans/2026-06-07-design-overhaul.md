# Design Overhaul — Readability, Typography, Colour System
## Implementation Plan

> Grill session complete — 12 decisions locked. Do not re-litigate these.

---

## Locked decisions

| # | Decision |
|---|----------|
| 1 | **Reading context**: Mixed laptop + wall display, weighted toward wall (2–3m viewing distance) |
| 2 | **Font**: Source Sans 3 everywhere. Barlow Condensed retained ONLY for the `<h1>` dashboard title |
| 3 | **Numerals**: `font-variant-numeric: tabular-nums` on all data cells — no separate mono font |
| 4 | **Background**: Warm paper — `#F5F0E8` page, `#FFFFFF` cards, `#1A1F2E` primary text |
| 5 | **Size scale**: Wall-first (see table below) — minimum 13px for any label carrying information |
| 6 | **Alert bar**: Pill cards — one per facility, `CS GUELMATE · 28h`, wraps to 2 lines max |
| 7 | **Colour system**: Two-level semantic (category → sub-reason), same hex = same meaning everywhere |
| 8 | **Refusal sub-reason colours**: Always visible in both public and full mode (categorical, not performance) |
| 9 | **KPI card borders**: Semantic colour per card (not arbitrary) |
| 10 | **"no prior day" repetition**: One note below the card row, not per-card |
| 11 | **Colour consistency**: Applied identically on map, sidebar, table, badge, KPI, alert bar |
| 12 | **Public mode suppression**: Only suppresses coverage tier colours — all categorical colours unchanged |

---

## Size scale

| Element | Current | New |
|---|---|---|
| `h1` dashboard title | `text-[1.75rem]` | `text-[2rem]` (Barlow Condensed, unchanged) |
| Section header (`HEALTH FACILITY COVERAGE`) | `text-[11px]` condensed | `text-[15px]` Source Sans 3 semibold |
| Tab labels (`OVERVIEW`, `MAP`) | `text-[10px]` | `text-[15px]` |
| Table column labels | `text-[10px]` | `text-[13px]` uppercase tracking-wide |
| Table body rows (facility name) | `text-[13px]` | `text-[16px]` |
| Coverage % in table | `text-[13px]` | `text-[17px]` bold tabular-nums |
| KPI card label (`CHILDREN ENUMERATED`) | `text-[10px]` | `text-[14px]` |
| KPI big number (`35,510`) | ~`text-[2.25rem]` | `text-[3.5rem]` tabular-nums |
| KPI sub-label (`Eligible 0–59m found`) | `text-[11px]` | `text-[13px]` |
| Badge text (`AT RISK`, `BEHIND`) | `text-[10px]` | `text-[12px]` bold |
| Metadata row (`N'DJAMENA · ENUM JUN 3–7`) | `text-[10px]` | `text-[13px]` |
| Alert bar text | `text-[10px]` / `text-sm` | `text-[14px]` |
| Sidebar section labels (`LAYERS`, `CALL LIST`) | `text-[10px]` | `text-[13px]` |
| Sidebar call list rows | `text-[12px]` | `text-[14px]` |
| Filter chip (`CS CEPHAS ×`) | `text-[11px]` | `text-[13px]` |
| Hover card text | `text-[11-13px]` | `text-[14px]` |

---

## Colour semantic system

### Level 1 — Category colours

```ts
export const COLORS = {
  // Performance / coverage
  ON_TRACK:   '#15803D',  // forest green   ≥ 70%
  ACTIVE:     '#D97706',  // warm amber      ≥ 40%
  CRITICAL:   '#DC2626',  // clear red       < 40%

  // Data categories (both modes)
  HOUSEHOLDS: '#475569',  // slate           neutral
  REFUSAL:    '#BE123C',  // crimson         parent
  ZERODOSE:   '#B45309',  // deep amber      parent
  TEAMS:      '#1D4ED8',  // royal blue

  // Vaccinated household dot
  VAX_YES:    '#15803D',
  VAX_NO:     '#475569',

  // Zero-dose sub-statuses
  ZD_VACCINATED:     '#15803D',
  ZD_NOT_VACCINATED: '#B45309',

  // UI chrome
  WHO_BLUE:    '#006EB6',
  DIGIT_ORANGE: '#F47738',
  PAGE_BG:     '#F5F0E8',
  CARD_BG:     '#FFFFFF',
  TEXT_PRIMARY: '#1A1F2E',
  TEXT_SECONDARY: '#64748B',
  BORDER:      '#E5E0D8',
}
```

### Level 2 — Refusal sub-reason colours (map dots + sidebar checkboxes)

```ts
export const REFUSAL_COLOR: Record<string, string> = {
  RELIGIOUS_BELIEFS:    '#BE123C',  // crimson
  VACCINE_SIDE_EFFECTS: '#7C3AED',  // violet
  NOT_DECISION_MAKER:   '#0369A1',  // ocean blue
  AFRICA_IS_POLIO_FREE: '#B45309',  // burnt amber
  TOO_MANY_DOSES:       '#0F766E',  // teal
  CHILD_WAS_SICK:       '#C2410C',  // terracotta
  CONCERNS_ABOUT_NOPV:  '#4D7C0F',  // olive
  CONCERNS_ABOUT_COVID19: '#BE185D', // rose
  UNKNOWN:              '#64748B',  // slate fallback
}
```

### KPI card accent colours

| Card | Accent | Reasoning |
|---|---|---|
| Children Enumerated | `#475569` slate | Count, not performance |
| Vaccinated | `#15803D` green | Good outcome |
| Missed Children | `#C2410C` burnt orange | Needs revisit |
| Teams Reporting | `#1D4ED8` royal blue | Activity/operational |

---

## Files touched

| File | Change |
|---|--------|
| `app/layout.tsx` | Add `Source_Sans_3` to next/font/google imports |
| `app/globals.css` | CSS variables for colours + font-data tabular-nums rule |
| `lib/constants.ts` | Add `COLORS` + `REFUSAL_COLOR` exports |
| `lib/visibility.ts` | Update all colour functions to use `COLORS` constants |
| `components/AlertBar.tsx` | **Redesign**: prose text → pill cards |
| `components/KPICards.tsx` | Semantic border colours, 56px numbers, 14px labels |
| `components/HFTable.tsx` | 16px rows, 13px column headers, 17px coverage % |
| `components/TeamActivityTable.tsx` | 16px rows, STALE as coloured badge |
| `components/map/FilterSidebar.tsx` | 14px rows, 13px labels, REFUSAL_COLOR per reason |
| `components/map/HoverCards.tsx` | 14px text throughout |
| `components/BubbleMap.tsx` | Refusal dot colours → REFUSAL_COLOR per reason |
| `app/page.tsx` | Source Sans 3 font class, 15px tabs/section headers, warm paper bg |

---

## Implementation sequence

### Step 1 — Font + CSS variables (`layout.tsx`, `globals.css`)
- Add `Source_Sans_3` with weights `[400, 600, 700]` and subsets `['latin', 'latin-ext']`
- Add `--font-source-sans` CSS variable
- Replace `font-family` in `.font-data` with Source Sans 3 + `font-variant-numeric: tabular-nums`
- Add CSS variables for all `COLORS` values
- Set `body` background to `#F5F0E8`, color to `#1A1F2E`

### Step 2 — Colour constants (`lib/constants.ts`)
- Add `COLORS` object
- Add `REFUSAL_COLOR` map (keyed by refusal reason code)
- Keep `REFUSAL_LABEL` unchanged
- Keep `DIGIT_ORANGE` (used for filter sidebar chrome only)

### Step 3 — Visibility functions (`lib/visibility.ts`)
- `barColor` / `bubbleColor` / `progressBarColor`: use `COLORS.ON_TRACK`, `COLORS.ACTIVE`, `COLORS.CRITICAL`
- `dotColor(vaccinated)`: use `COLORS.VAX_YES` / `COLORS.VAX_NO`
- `dotStroke`: derive from same constants with opacity
- `gapTextClass`: update red class to match `COLORS.CRITICAL`

### Step 4 — Alert bar redesign (`components/AlertBar.tsx`)
- Remove prose inline text
- Map `byHF` entries → pill `<span>` elements:
  ```tsx
  <span style={{ background: '#FEE2E2', color: '#BE123C', border: '1px solid #FECACA' }}
    className="inline-flex items-center gap-1.5 text-[14px] font-semibold px-3 py-1 rounded-full mr-2 mb-2">
    {hf} · {maxHours}h
  </span>
  ```
- Pill background lightens with age: >48h → crimson, 24–48h → burnt orange, 6–24h → amber
- Wrap in `flex flex-wrap gap-2`

### Step 5 — KPI cards (`components/KPICards.tsx`)
- `accentColor` values → `COLORS` constants (slate, green, burnt orange, royal blue)
- Number: `text-[3.5rem]` font-bold tabular-nums
- Card label: `text-[14px]` font-semibold uppercase tracking-wide
- Sub-label: `text-[13px]` text-secondary
- Remove per-card "no prior day" → single `<p>` below card row: `Trend comparison unavailable — no prior day data`
- Card background: `#FFFFFF`, border: `#E5E0D8`

### Step 6 — HF Table (`components/HFTable.tsx`)
- Column headers: `text-[13px]` uppercase tracking-wide `#64748B`
- Facility name: `text-[16px]` font-semibold
- Sub-label (teams · eligible): `text-[13px]` text-secondary
- Coverage %: `text-[17px]` font-bold tabular-nums
- Status badge: `text-[12px]` font-bold, use `COLORS.CRITICAL` / `COLORS.ACTIVE` / `COLORS.ON_TRACK`
- Progress bar: `COLORS.*` via `vis.progressBarColor`

### Step 7 — Team Activity Table (`components/TeamActivityTable.tsx`)
- Group rows by facility with sticky sub-header
- `STALE` → `<span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: '#FEE2E2', color: COLORS.CRITICAL }}>STALE</span>`
- Row text: `text-[15px]`

### Step 8 — Filter sidebar + BubbleMap
- **FilterSidebar**: 13px section labels, 14px call list rows
- **Refusal sub-checks**: `accentColor` → `REFUSAL_COLOR[reason]` per checkbox
- **BubbleMap refusal dots**: `fillColor: REFUSAL_COLOR[loc.reason_for_refusal ?? 'UNKNOWN']` (replaces single `#C62828`)
- Refusal dot stroke: darken REFUSAL_COLOR by ~30%

### Step 9 — Page layout (`app/page.tsx`)
- Body/page bg: already set via CSS variable on `body`
- Tab labels: `text-[15px]` (remove `text-[10px]`)
- Section headers (`h2`): `text-[15px]` font-semibold (remove `text-[11px]` condensed)
- Metadata row: `text-[13px]`
- Live dot label: `text-[13px]`

### Step 10 — Hover cards (`components/map/HoverCards.tsx`)
- All text: `text-[14px]` minimum
- Facility name header: `text-[15px]` font-bold

### Step 11 — Visual verification
Screenshot at each state after each step:
- Public FR (default): warm paper background, no performance colours
- Full EN: coverage tiers, alert bar pills, KPI semantic borders
- Map: refusal dots coloured per reason, sidebar 14px text
- Alert bar: pill cards with age-based colour
- KPI row: 56px numbers readable from description

---

## What does NOT change

- `useMapState` filter logic — zero changes
- `DotHoverTracker` pattern — unchanged
- Canvas renderer — unchanged
- URL state (`?facility=`, `?lang=`, `?mode=`) — unchanged
- Public mode suppression rules for performance colours — only colour values update
- DIGIT orange (`#F47738`) on filter sidebar header — unchanged
- `BubbleMap` layout, `FilterSidebar` structure — only colours and sizes

---

## Open items

- **Barlow Condensed title size**: currently `text-[1.75rem]` desktop. Consider `text-[2.25rem]` for wall display prominence.
- **Warm paper dot grid**: current subtle grid in globals.css — consider increasing opacity from near-zero to ~0.04 for texture on the warm background, or remove entirely for clean paper feel.
- **Map legend**: update legend dot colours to match `REFUSAL_COLOR` per reason when refusals are ON.
