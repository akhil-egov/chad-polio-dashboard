@AGENTS.md

# chad-polio-dashboard

## Role
This repo is the **visualisation layer only**. It reads processed data and renders the dashboard.
It does NOT connect to Elasticsearch. It does NOT extract or transform data.

## Three-repo pipeline
```
[chad-polio-ingest]  →  Excel file  →  [chad-polio-dashboard]  (you are here)
```

## Data source
- Static file: `public/data.json`
- Schema defined in `~/chad-polio-ingest/CONTRACT.md` — read that before adding any new data field
- No live Elasticsearch connection from the frontend

## Updating data (when a new Excel arrives)
```bash
python3 scripts/excel_to_json.py /path/to/chad_YYYYMMDD_HHMM.xlsx
git add public/data.json && git commit -m "data: update to chad_YYYYMMDD_HHMM" && git push
```
Vercel deploys automatically on push. Script lives at `scripts/excel_to_json.py`.

## Stack
- Next.js App Router, TypeScript, Tailwind, shadcn/ui, Leaflet (maps)
- Deployed on Vercel (auto-deploy on push to main)

## Data contract
Column names in CONTRACT.md map directly to fields in `data.json`.
**Never invent field names. If a field isn't in the contract, check with master window first.**

---

## i18n + public/full mode

The dashboard has two orthogonal toggles, both persisted in URL params:

| Param | Values | Default | Where set |
|-------|--------|---------|-----------|
| `lang` | `fr` \| `en` | `fr` | Header FR/EN pill toggle |
| `mode` | `public` \| `full` | `public` | Header 👁/⚙ pill toggle |

- **WHO internal bookmark**: `?lang=en&mode=full`
- **Public/facility view**: `localhost:3000` (defaults apply)
- State lives in `lib/dashboard-context.tsx` — `lang`, `mode`, `setLang`, `setMode`, `t`
- Translations in `lib/i18n.ts` via `createT(lang)` → `t(key)` — no external library

### What public mode hides / neutralises
| Element | Public mode |
|---------|------------|
| AlertBar (silent teams) | Hidden entirely |
| Status badges (On Track / At Risk / Behind) | Hidden |
| Red/amber/green on progress bars | → neutral `#009FDB` |
| Missed Children KPI card | Hidden |
| Gap numbers (MicroplanTable) | → `text-slate-700` (neutral) |
| Team Activity tab | Hidden |
| Map bubble colours (coverage tiers) | → single `#009FDB` |
| Map household dots | → `#009FDB` |
| Map refusal dots | Keep `#C62828` — categorical, not performance |
| Map zero-dose dots | Keep `#F9A825` — categorical, not performance |

**Never remove Teams Reporting column** — it stays visible in both modes.

---

## Accessibility standards (in force)

- Minimum font size: **10px** (no `text-[9px]` anywhere)
- Key label contrast: **`text-slate-500`** minimum for informational labels (not `text-slate-400`)
- Focus rings: `focus-visible:ring-2 focus-visible:ring-[#009FDB]` on all interactive elements
- WCAG AA target: 4.5:1 for normal text, 3:1 for large/bold uppercase

---

## Mobile responsiveness

- Header: responsive 2-row layout — title scales (`text-[1.05rem]` mobile → `text-[1.75rem]` desktop), metadata hidden on mobile
- Tabs: wrapped in `overflow-x-auto` so they scroll horizontally on small screens
- Tables: all have `overflow-x-auto` wrappers — never remove these
- KPI cards: `grid-cols-2` on mobile (3 in public mode, 4 in full mode on desktop)

---

## Performance patterns

- **`useMemo`** all heavy data aggregations — see `KPICards.tsx` and `HFTable.tsx` for reference
- **`Cache-Control: public, max-age=300`** on `data.json` (set in `next.config.ts`)
- **BubbleMap**: CircleMarkers use canvas renderer (`L.canvas`) — never switch back to SVG
- **BubbleMap**: `makeBubbleIcon` uses a module-level Map cache — don't remove it

---

## Map dot hover (BubbleMap)

**Critical**: Leaflet `<Tooltip>` and `<Popup>` do NOT work on canvas-rendered CircleMarkers.
Use the custom `DotHoverTracker` pattern instead — it listens to `mousemove` via `useMapEvents`,
computes pixel distance from mouse to each dot, and sets a `hoveredDot` state that renders a
plain `<div>` overlay (not a Leaflet layer).

```
DotHoverTracker (inside MapContainer)
  → useMapEvents({ mousemove }) → pixel distance scan → setHoveredDot
Overlay div (outside MapContainer, inside .flex-1.relative)
  → positioned at hoveredDot.x / hoveredDot.y with transform
```

Hit radius threshold: **14px** (larger than dot radius 6, gives comfortable hover area).

### GPS dot hover card content

Three dot types, each with its own hover card. Settlement type and settlement name
are intentionally **not shown** — removed as operationally irrelevant.

**Household dot**
| Field | Public mode | Full mode |
|-------|-------------|-----------|
| Facility name | Bold header | Bold header |
| User (team code) | Hidden | Shown in `#009FDB` |
| Member count | `N members` | `N members` |
| Vaccinated count | `✓ N children vaccinated` / `✗ None vaccinated` | same |

**Refusal dot** (always `#C62828`)
| Field | Public mode | Full mode |
|-------|-------------|-----------|
| Facility name | Bold header | Bold header |
| User (team code) | Hidden | Shown in `#009FDB` |
| Member count | `N members` | `N members` |
| Reason | Human-readable label in red | same |

**Zero-dose dot** (always `#F9A825`)
| Field | Public mode | Full mode |
|-------|-------------|-----------|
| Facility name | Bold header | Bold header |
| User (team code) | Hidden | Shown in `#009FDB` |
| Age + gender | `54 months · Male` | same |
| Status | `✓ Vaccinated` / `✗ Not yet vaccinated` | same |

### Layer toggles + cascaded filters
- **Households** toggle (default ON): no sub-filters
- **Refusals** toggle (default OFF): expands multi-select checkboxes per reason code, sorted by count
- **Zero Dose** toggle (default OFF): expands `Not yet vaccinated (N)` + `Vaccinated ✓ (N)` checkboxes
- Priority when dots overlap: refusal > zero-dose > household (scan order in `DotHoverTracker`)

### Puppeteer cannot trigger Leaflet hover cards
Leaflet's `useMapEvents` does not fire from synthetic DOM `MouseEvent`s dispatched
by Puppeteer. Hover card correctness must be verified by manually mousing over
dots in a real browser — do not waste time trying to automate this.

---

## GPS data fields (gps sheet in data.json)

| Field | Source ES path | Notes |
|-------|---------------|-------|
| `record_id` | `Data.household.id` | |
| `lat` / `lng` | `Data.household.address.latitude/longitude` | Filtered 11–14 / 13–17 |
| `facility_name` | `Data.boundaryHierarchy.healthFacility` | |
| `settlement_type` | `Data.additionalDetails.settlementType` | URBAN/RURAL/SLUMS/NOMADS_PASTORALISTS |
| `settlement_name` | `Data.boundaryHierarchy.settlement` | Neighbourhood/quartier |
| `user_name` | `Data.userName` | Team code e.g. "LE-11" |
| `member_count` | `Data.additionalDetails.memberCount` | Household size (int) |
| `vaccinated` | Hardcoded `False` | All current records are household visits |
| `vaccinated_count` | task-index join on GPS coords | Children with `ADMINISTRATION_SUCCESS` at this location. **Tech debt**: `householdId` is null on task records so join uses rounded lat/lng (5dp ≈ 1m). Fix when backend populates `householdId`. |

## GPS data fields (gps_refusals sheet)

| Field | Source ES path | Notes |
|-------|---------------|-------|
| `record_id` | `Data.household.id` | |
| `lat` / `lng` | `Data.household.address.latitude/longitude` | |
| `facility_name` | `Data.boundaryHierarchy.healthFacility` | |
| `settlement_type` | `Data.additionalDetails.settlementType` | |
| `settlement_name` | `Data.boundaryHierarchy.settlement` | |
| `user_name` | `Data.userName` | |
| `member_count` | `Data.additionalDetails.memberCount` | |
| `reason_for_refusal` | `Data.additionalDetails.reasonForRefusal` | Raw code — see `REFUSAL_LABEL` in BubbleMap.tsx |
| `reason_not_vaccinated` | `Data.additionalDetails.reasonNotVaccinated` | |

## GPS data fields (gps_zerodose sheet)

| Field | Source ES path | Notes |
|-------|---------------|-------|
| `record_id` | `hit["_id"]` | Task index doc ID |
| `lat` / `lng` | `Data.additionalDetails.lat/lng` | String coords parsed in extractor |
| `facility_name` | `Data.boundaryHierarchy.healthFacility` | |
| `settlement_type` | `Data.additionalDetails.settlementType` | |
| `settlement_name` | `Data.boundaryHierarchy.settlement` | |
| `user_name` | `Data.userName` | |
| `age_months` | `Data.additionalDetails.age` | Int |
| `gender` | `Data.additionalDetails.gender` | MALE / FEMALE |
| `administration_status` | `Data.administrationStatus` | `ADMINISTRATION_SUCCESS` = vaccinated |

---

## Ingest pipeline — remote Jupyter

The ingest pipeline runs on a **remote Jupyter server** at `campaigns.afro.who.int/jupyter`.
It is NOT local. Path: `/HCM_CUSTOM_REPORTS/CHAD_POLIO_PILOT/DST/`

Key files on remote:
- `main.py` — orchestrates all extractors, writes timestamped Excel to `output/`
- `extractors/gps.py` — GPS extraction + vaccination count join
- `extractors/gps_refusals.py` — refusal household dots
- `extractors/gps_zerodose.py` — zero-dose child dots
- `extractors/base.py` — ESClient (`es.query()` and `es.scroll()` — NOT `es.search()`)

**When editing extractors on Jupyter, always write the file via a cell — never paste raw Python:**
```python
content = '''...file contents...'''
with open("extractors/gps.py", "w") as f:
    f.write(content)
```

**To run the extractor from Jupyter:**
```python
import os
os.environ["ES_URL"] = "https://elasticsearch-data.es-cluster:9200"
os.environ["ES_AUTH_HEADER"] = "Basic ZWxhc3RpYzo2OGF0dU5FTXoycXpPUUVNS25RRUR6elk="

from main import run
run()
```
Always **Kernel → Restart** before running to clear cached imports.

**Full data update workflow:**
1. Edit extractor on remote Jupyter (e.g. `extractors/gps.py`)
2. Restart kernel, run the cell above
3. Download the new `output/chad_YYYYMMDD_HHMM.xlsx`
4. On local: `python3 scripts/excel_to_json.py /path/to/chad_YYYYMMDD_HHMM.xlsx`
5. `git add public/data.json && git commit -m "data: update to chad_YYYYMMDD_HHMM" && git push`

---

## Elasticsearch indices

| Index | Used for |
|-------|----------|
| `chad-household-index-v1` | GPS, enumeration (household count), settlement, refusals |
| `chad-project-beneficiary-index-v1` | Eligible children, demographics |
| `chad-project-task-index-v1` | Vaccinated children, activity, stock |
| `chad-user-action-location-capture-index-v1` | (not yet used) |

Campaign ID: `CMP-2026-05-29-000091`

---

## Timezone

All timestamps display in **Africa/Ndjamena (UTC+1)**. Pass `timeZone: 'Africa/Ndjamena'` to every `toLocaleString` call that shows a time.

---

## Visual verification loop

You have Puppeteer MCP available in every session. Use it as your default
way to verify any UI change — not just code review.

The loop for every frontend change:

1. Make the change
2. Screenshot at `localhost:3000` (public FR) and `localhost:3000?lang=en&mode=full` (full EN)
3. Also check `390px` width for mobile
4. Review against intended outcome — fix anything off, screenshot again
5. Only then move to the next change

Never mark a UI change complete based on code alone.
The screenshot is the source of truth.

## What to look for

- No horizontal scroll at 1280px width
- Header compact and readable at 390px — no overflow
- Text not overflowing containers
- Colors rendering correctly (neutral in public mode, red/green/amber in full mode)
- Data actually appearing (not empty/zero when it shouldn't be)
- Map tiles loading (not grey boxes)
- AlertBar visible in full mode, hidden in public mode
- Team Activity tab visible in full mode, hidden in public mode

---

## Agent skills

### Issue tracker

GitHub Issues at `akhil-egov/chad-polio-dashboard`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-state workflow (`needs-triage` → `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

