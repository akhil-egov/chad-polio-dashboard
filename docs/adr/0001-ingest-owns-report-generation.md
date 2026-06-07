# ADR 0001: Ingest pipeline owns report generation

**Status:** Proposed  
**Date:** 2026-06-06

## Context

The pipeline has two repos:

- `chad-polio-ingest` — queries Elasticsearch, transforms data, produces Excel files
- `chad-polio-dashboard` — reads processed data, renders visualisations

As the project matures, stakeholders need deliverables beyond the live dashboard: summary Excel files, PDF snapshots for country office, etc. The question is where that generation logic lives.

## Decision

Report generation (Excel summaries, PDFs, or any other output format) lives in `chad-polio-ingest`, not in `chad-polio-dashboard`.

The dashboard's only job is to visualise data it receives. It does not produce downloadable reports, generate PDFs, or transform raw data into new outputs.

## Consequences

**Benefits**
- The ingest pipeline can produce reports independently — no browser or dashboard instance required
- Report logic has direct access to the full extracted dataset without an API layer in between
- The dashboard stays simple: one data source in, one visualisation out

**Trade-offs**
- Report formats (currently Excel and PDF) may vary per request — the ingest pipeline must stay flexible and not assume a fixed output format
- If a stakeholder wants a report triggered from the dashboard UI (e.g. a "Download PDF" button), that would need to call back to an ingest-side service rather than generating locally — adds a round-trip

## Alternatives considered

- **Dashboard generates reports**: would require the dashboard to re-implement data transformation logic already in the ingest, and couples report quality to frontend availability
- **Separate reports repo**: extra maintenance overhead for a small team; overkill at current scale

## Review notes

This decision is proposed and open for revision. In particular:
- If a "Download from dashboard" UX becomes important, revisit the round-trip trade-off
- Output formats are not fixed — Excel and PDF today, could expand
