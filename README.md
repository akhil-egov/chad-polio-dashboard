# chad-polio-dashboard

Real-time operations dashboard for the WHO AFRO nOPV2 campaign — N'Djamena, Chad, June 2026.

Built with Next.js, deployed on Vercel. Reads from a static `public/data.json` updated hourly by the ingest pipeline.

---

## Pipeline overview

```
Elasticsearch (WHO AFRO)
        │
        ▼
  chad-polio-ingest
  (runs hourly on remote Jupyter server)
        │
        ▼
  output/chad_YYYYMMDD_HHMM.xlsx
        │
  fetch_latest.py
        │
        ▼
  public/data.json  →  Vercel  →  dashboard
```

---

## Dashboard features

| Tab | What it shows |
|-----|--------------|
| **Coverage** | Daily vaccination progress by facility — bar charts, KPI cards |
| **Map** | Household GPS dots, refusal dots (coloured by reason), zero-dose children |
| **Enumeration** | Households registered, eligible children 0–59m, vaccinated |
| **Microplan** | Coverage % vs microplan target, gap analysis |
| **Stock** | Vials issued / returned / used per facility |
| **Settlement** | Urban / Rural / Slums / Nomads breakdown |
| **Demographics** | Age × gender distribution of vaccinated children |
| **Activity** | Per-team task count and last-sync time |

### Public vs full mode
Toggled via URL param — default is public:

| Element | Public | Full |
|---------|--------|------|
| Coverage colours (red/amber/green) | Neutral blue | Shown |
| Alert bar (silent teams) | Hidden | Shown |
| Status badges | Hidden | Shown |
| Gap numbers | Neutral | Red |
| Team Activity tab | Hidden | Shown |

- **Public view:** `https://<url>` (defaults apply)
- **WHO internal:** `https://<url>?lang=en&mode=full`

---

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

To update data locally without pushing:
```bash
python3 fetch_latest.py --no-push
```

---

## Data update workflow

Credentials go in `.env.local` (gitignored):
```
JUPYTER_BASE=https://<host>/jupyter/user/<username>
JUPYTER_TOKEN=<jupyterhub_api_token>
JUPYTER_REMOTE_ROOT=<path/to/DST/relative/to/jupyter/home>
ES_URL=https://elasticsearch-data.es-cluster:9200
ES_AUTH_HEADER=Basic <base64-credentials>
```

### Automation scripts

| Script | What it does | Command |
|--------|-------------|---------|
| `fetch_latest.py` | Download latest Excel → `data.json` → git push | `python3 fetch_latest.py` |
| `run_pipeline.py` | Trigger extraction on Jupyter + fetch_latest | `python3 run_pipeline.py` |
| `setup_cron.py` | Start hourly scheduler on Jupyter server | `python3 setup_cron.py` |

### Normal operations

```bash
# Pull latest hourly data and deploy to Vercel
python3 fetch_latest.py

# Force a fresh extraction now (~5-10 min)
python3 run_pipeline.py

# After a Jupyter server reboot — restart the scheduler
python3 setup_cron.py
```

The Jupyter server runs `main.run()` every hour at :00. Logs at `~/pipeline.log` on the server.

### Manual update (without scripts)

```bash
python3 scripts/excel_to_json.py /path/to/chad_YYYYMMDD_HHMM.xlsx
git add public/data.json && git commit -m "data: update to chad_YYYYMMDD_HHMM" && git push
```

Vercel deploys automatically on push to `main`.

---

## Repository structure

```
app/
  page.tsx              — main dashboard, tab layout
components/
  BubbleMap.tsx         — Leaflet map (households, refusals, zero-dose)
  KPICards.tsx          — summary cards
  AlertBar.tsx          — silent team alerts (full mode only)
  TeamActivityTable.tsx — per-user activity
  map/
    FilterSidebar.tsx   — facility list + layer toggles
    HoverCards.tsx      — hover card for each dot type
lib/
  types.ts              — TypeScript interfaces for all data shapes
  constants.ts          — COLORS, REFUSAL_LABEL, REFUSAL_COLOR
  visibility.ts         — public/full mode behavioural differences
  i18n.ts               — EN/FR translations
  dashboard-context.tsx — lang/mode URL state
public/
  data.json             — static data file (auto-updated by pipeline)
scripts/
  excel_to_json.py      — converts ingest Excel → data.json
downloads/              — cached Excel files (gitignored)
fetch_latest.py         — download + convert + push
run_pipeline.py         — trigger Jupyter execution + fetch
setup_cron.py           — register hourly scheduler on Jupyter
```

---

## Map architecture

- Leaflet with **canvas renderer** (`L.canvas`) — CircleMarkers only, no SVG
- Tooltips/popups don't work on canvas — uses custom `DotHoverTracker` pattern instead
- `DotHoverTracker`: listens to `mousemove`, scans pixel distance to each dot, renders an HTML overlay
- Hit radius: 14px. Priority when dots overlap: refusal > zero-dose > household

### Dot types

| Type | Colour | Notes |
|------|--------|-------|
| Household | WHO Blue `#006EB6` | Single colour in both modes |
| Refusal | Per-reason (8 colours from `REFUSAL_COLOR`) | |
| Zero-dose | Amber `#F9A825` | Vaccinated/not shown in hover card |

### Bubble sizing
Bubbles represent facilities. Sized by `eligible_children` (0–59m enumerated). Coloured by coverage tier: ≥70% green, ≥40% amber, <40% red — in both public and full mode.

---

## Tech stack

- **Next.js** App Router, TypeScript, Tailwind CSS v4
- **Leaflet** (react-leaflet) — maps
- **shadcn/ui** — base components
- **Vercel** — hosting, auto-deploy on push to `main`

---

## Related repos

- [`chad-polio-ingest`](https://github.com/akhil-egov/chad-polio-ingest) — Elasticsearch extraction pipeline
