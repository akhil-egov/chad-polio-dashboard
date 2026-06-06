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
| Map dots (unenumerated, red) | → `#009FDB` |

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

