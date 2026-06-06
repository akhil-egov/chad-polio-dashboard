# Issue Tracker — chad-polio-dashboard

Issues for this repo live in **GitHub Issues** at `akhil-egov/chad-polio-dashboard`.

## Usage

- Create: `gh issue create --repo akhil-egov/chad-polio-dashboard`
- List: `gh issue list --repo akhil-egov/chad-polio-dashboard`
- View: `gh issue view <number> --repo akhil-egov/chad-polio-dashboard`
- Close: `gh issue close <number> --repo akhil-egov/chad-polio-dashboard`

## Cross-repo issues

This repo and `akhil-egov/chad-polio-ingest` are coupled via `CONTRACT.md`.
- Bugs that originate in the **ingest pipeline** (wrong extraction, missing field) → file on `akhil-egov/chad-polio-ingest` with label `contract` if it breaks the schema.
- Bugs that surface in the **dashboard** (display, data shape mismatch) → file here.
- When an issue spans both repos, file on the repo where the fix lives and cross-reference the other.

## Labels in use

Category labels: `bug`, `map`, `improvement`, `ux`, `design`
Workflow labels (triage state): `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`
Milestone: `Phase 1 — Dashboard fixes`
