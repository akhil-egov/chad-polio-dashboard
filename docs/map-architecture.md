# Map Architecture

Entry point for an engineer lifting or re-implementing the campaign map.
Read this first; use the source as reference. All line numbers are approximate — search by comment or symbol name.

---

## Overview

The map has two distinct rendering modes that switch at a configurable zoom threshold (default: 14):

```
zoom < threshold  →  Facility bubble view   (one Marker per health facility)
zoom ≥ threshold  →  GPS dot view           (one CircleMarker per household/refusal/zero-dose/closed record)
```

These are completely separate rendering branches — not the same component at different scales.
The switch happens because rendering 10,000+ individual CircleMarkers at country zoom is unusable,
while facility-level bubbles lose meaning when you're looking at a single neighbourhood.

**Key files:**

| File | Responsibility |
|------|---------------|
| `components/BubbleMap.tsx` | Main component: layout, map setup, rendering both modes |
| `components/map/HoverCards.tsx` | Hover card content per dot type |
| `components/map/FilterSidebar.tsx` | Layer toggles and filter controls |
| `lib/use-map-state.ts` | Compositor: aggregates the three hooks below into one return |
| `lib/use-map-filters.ts` | Filter state: teams, dates, reasons, settlement, zero-dose status |
| `lib/use-map-layers.ts` | Layer visibility toggles: households, refusals, zero-dose, closed |
| `lib/use-map-navigation.ts` | Facility selection, URL sync, fly-to |

---

## Canvas hover system {#canvas-hover}

**This is the biggest trap.** Stop here if you're implementing hover tooltips.

Leaflet's `<Tooltip>` and `<Popup>` components **silently fail** on `CircleMarker`s that use a canvas renderer (`L.canvas()`). No error is thrown. The tooltip simply never appears. This is a known Leaflet limitation: canvas-rendered layers don't fire the mouse events that Leaflet's tooltip machinery depends on.

The GPS dot layer uses canvas because SVG rendering degrades catastrophically beyond ~2,000 dots.

**The workaround: `DotHoverTracker`**

`DotHoverTracker` is a renderless component (returns `null`) that lives inside `<MapContainer>`. It uses Leaflet's `useMapEvents` hook to listen to raw `mousemove` events, then manually scans every visible dot's pixel distance from the cursor:

```tsx
useMapEvents({
  mousemove(e) {
    if (zoom < threshold) { onHover(null); return }
    const mp = e.containerPoint          // cursor in pixel space
    let nearest: AnyDot | null = null
    let minDist = 14                     // 14px hit radius — larger than the 6px dot radius
    for (const dot of dots) {
      const pt = map.latLngToContainerPoint([dot.row.lat, dot.row.lng])
      const d = Math.sqrt((pt.x - mp.x) ** 2 + (pt.y - mp.y) ** 2)
      if (d <= minDist) { minDist = d; nearest = dot }
    }
    if (nearest) onHover({ dot: nearest, x: ..., y: ... })
    else onHover(null)
  }
})
```

The hover card itself is a plain `<div>` **outside** `<MapContainer>`, positioned with CSS `transform` at the pixel coordinates returned by `latLngToContainerPoint`. It is not a Leaflet layer.

**Dot scan order matters.** `allDots` is assembled as `[households, zerodose, closedHousehold, refusals]`. The scan picks the nearest dot — if two dots overlap at the same pixel distance, the last match in the array wins. Refusals are last, so refusal wins on overlap. This is intentional: refusals are operationally high-priority.

**Puppeteer cannot test this.** Leaflet's `useMapEvents` does not fire from synthetic DOM `MouseEvent`s. Hover card correctness must be verified by manually mousing over dots in a real browser.

---

## Zoom split {#zoom-split}

`BubbleMap.tsx` has a single `zoom` state that drives two mutually exclusive rendering branches:

### Below threshold — facility bubbles

```tsx
{zoom < zoomThreshold && visibleBubbles.map(fac => (
  <Marker
    position={centroids.get(fac.name)}
    icon={makeBubbleIcon(fac.abbrev, fac.covPct, fac.records, fac.color)}
  />
))}
```

- Uses Leaflet `<Marker>` with a `L.divIcon` (SVG-in-HTML string)
- One marker per health facility, positioned at the centroid of that facility's GPS records
- Bubble size formula: `Math.max(24, Math.min(56, Math.sqrt(records / 10) * 3.2))` — clamped 24–56px, based on eligible children count
- `makeBubbleIcon` results are cached at module level in `_iconCache` — don't remove this; it prevents recreating the SVG string on every render
- `<Popup>` works fine here — `<Marker>` uses SVG, not canvas

### Above threshold — GPS dots

```tsx
{zoom >= zoomThreshold && visibleHouseholds.map((loc, i) => (
  <CircleMarker renderer={canvasRenderer} ... />
))}
```

- Uses Leaflet `<CircleMarker>` with a shared `L.canvas()` renderer
- The canvas renderer is created once via `useMemo` and shared across all dot layers — never create it per-marker
- `<Tooltip>` and `<Popup>` do not work here — use `DotHoverTracker` instead (see [Canvas hover system](#canvas-hover))
- Four dot layers: households, refusals, zero-dose, closed households — each rendered separately so z-order is controlled

---

## Filter sidebar placement {#filter-sidebar}

The `<FilterSidebar>` is rendered **outside** `<MapContainer>`, as a sibling div:

```tsx
<div className="flex-1 flex overflow-hidden">
  {panelOpen && (
    <div className="w-[280px]">       {/* ← sidebar, outside MapContainer */}
      <FilterSidebar ... />
    </div>
  )}
  <div className="flex-1 relative">  {/* ← map area */}
    <MapContainer ...>
      ...
    </MapContainer>
    {hoveredDot && <div ...>...</div>}  {/* ← hover card, also outside MapContainer */}
  </div>
</div>
```

**Why:** Leaflet intercepts all scroll events within `<MapContainer>` for map panning and zooming. Any scrollable list inside `<MapContainer>` will have its scroll stolen — the map pans instead of the list scrolling. Moving the sidebar outside gives it normal browser scroll behaviour.

The same applies to the hover card div — it is positioned outside `<MapContainer>` using absolute coordinates derived from `latLngToContainerPoint`.

---

## State hook architecture {#state-hooks}

State is split across three focused hooks composed by a fourth:

```
useMapState(data)           ← compositor — use this in BubbleMap
  ├── useMapLayers()        ← which dot layers are visible (showHouseholds, showRefusals, …)
  ├── useMapFilters(data)   ← active filter values (teams, dates, reasons, settlement, zd-status)
  └── useMapNavigation(data)← selected facility + URL sync (?facility=<id>)
```

**`useMapLayers`** — pure toggle state, no data dependency. Safe to reset independently.

**`useMapFilters`** — owns all multi-select filter state. `null` means "all selected" (no filter active). A `Set` means a specific subset is selected. This pattern avoids initialising the Set from data on mount — the full set is the default, not a stored value.

**`useMapNavigation`** — syncs `selectedFac` to the URL via Next.js `router.replace`. Reads `?facility=<facility_id>` on mount so deep links work. The fly-to animation (`FlyTo` component inside `<MapContainer>`) is driven by a `flyTarget` state in `BubbleMap` itself, not in the hook — the hook doesn't have access to the map instance.

**`useMapState`** — the compositor. It runs the cross-cutting derivations that need values from multiple hooks: `visibleHouseholds`, `allDots`, `filterCount`, `facilityStatsOverride`. Import and use only this hook in `BubbleMap`.

---

## Component interface {#component-interface}

```tsx
import { BubbleMap } from '@/components/BubbleMap'
import type { BubbleMapProps } from '@/components/BubbleMap'

<BubbleMap
  defaultCenter={[9.0579, 7.4951]}  // Abuja, Nigeria
  defaultZoom={10}
  adm1Url="/nga-adm1.geojson"
  adm2Url="/nga-adm2.geojson"
  zoomThreshold={13}                // lower threshold for sparser facility coverage
/>
```

All props are optional — omitting them falls back to Chad defaults. The component reads campaign data from `DashboardContext` (via `useDashboard()`), so it must be wrapped in a `<DashboardProvider>`.

**Data the component expects from context (`DashboardData`):**

| Field | Used for |
|-------|---------|
| `data.gps` | Household dots + facility centroid calculation |
| `data.gps_refusals` | Refusal dots |
| `data.gps_zerodose` | Zero-dose dots |
| `data.gps_closed_household` | Closed household dots |
| `data.enumeration` | Facility list, eligible children count, coverage % |
| `data.microplan` | Bubble size fallback (if no GPS records for a facility) |

---

## Per-deployment checklist {#per-deployment}

When deploying for a new country or campaign, change these:

| What | Where | Notes |
|------|-------|-------|
| Map center | `defaultCenter` prop | Country centroid in `[lat, lng]` |
| Initial zoom | `defaultZoom` prop | 10–12 for country view, 12–14 for city |
| Zoom threshold | `zoomThreshold` prop | Lower for sparse coverage, higher for dense |
| ADM1 boundaries | `adm1Url` prop → file in `/public` | Region/state level GeoJSON |
| ADM2 boundaries | `adm2Url` prop → file in `/public` | District level GeoJSON |
| Refusal reason codes | `REFUSAL_LABEL` + `REFUSAL_COLOR` in `lib/constants.ts` | Campaign-specific codes |
| Coordinate filter | `scripts/excel_to_json.py` | Bounding box lat/lng filter — update for new country |

GeoJSON files for administrative boundaries can be downloaded from [GADM](https://gadm.org) (free, no login required). Export at ADM1 and ADM2 levels.
