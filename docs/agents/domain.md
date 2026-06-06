# Domain Docs — chad-polio-dashboard

## Layout: single-context

One `CONTEXT.md` + `docs/adr/` at the repo root. No per-subfolder contexts.

## Consumer rules

- **Before writing any new component or feature**: read `CONTEXT.md` for domain language (campaign terms, field names, public/full mode rules).
- **Before any architectural decision**: check `docs/adr/` for prior decisions. Never re-litigate a closed ADR without flagging it explicitly.
- **Field names**: defined in `~/chad-polio-ingest/CONTRACT.md` — that is the ground truth for all data field names. Never invent field names; if a field isn't in CONTRACT.md, ask before using it.
- **Public vs full mode**: rules are in `CLAUDE.md` — the "What public mode hides" table is authoritative. Always check it when adding any new data-revealing element.

## Key domain concepts

See `CONTEXT.md` for full definitions. Short index:

- **Health Facility (HF)** — enumeration and vaccination unit
- **Team** — field workers assigned to a HF; identified by codes like `AB-11`
- **Eligible child** — age ≤ 59 months, not head of household
- **Silent team** — no sync in threshold period (default 24h)
- **Zero-dose child** — child who had never received OPV before this campaign
- **Campaign ID** — `CMP-2026-05-29-000091`

## Related repo

`akhil-egov/chad-polio-ingest` owns data extraction. `CONTRACT.md` in that repo defines the Excel/JSON schema both repos depend on.
