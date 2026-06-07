# ADR-0002: Three-Axis Campaign Data Model

## Date
2026-06-07

## Status
Accepted

## Context
Every data point in a polio SIA campaign is simultaneously:
- Temporal — it happened on a specific date (campaign day)
- Spatial — it happened at a specific place (district → facility)
- Activity — it was done by a specific actor (team → user)

The original dashboard was built around component types (Map tab, Overview tab) rather than around these data dimensions. This caused fragmented filter state, no cross-axis drill-down, and a UI that couldn't answer compound questions like "what did team AB-07 do in CS ABENA on Day 2?"

## Decision
All data in the dashboard must be understood as sitting on three axes: Temporal (T), Spatial (S), and Activity (A). The filter system must allow locking any subset of axes and exploring the remainder.

The context layer (lib/dashboard-context.tsx) owns filter state for all three axes:
- selectedDate → T axis
- selectedFacility → S axis  
- selectedUser → A axis

All components derive their displayed data from this shared filter state.

## Consequences
- Filter state is richer and must be carefully managed to avoid performance regressions (useMemo required everywhere)
- The ingest pipeline (chad-polio-ingest) must add district and day_number fields to enable the full S and T axis hierarchy
- The UI redesign (issue #12) must be designed around this three-axis model, not around component types
- This model is intentionally generic and applies to any future country deployment — the axes are the same, only the boundary hierarchy and campaign dates change

## Applies to
chad-polio-dashboard, chad-polio-ingest
