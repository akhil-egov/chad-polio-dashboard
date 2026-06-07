# Domain Glossary — Chad Polio Dashboard

## Household
A logical unit of registration used during a polio campaign. In Chad this maps to a physical dwelling, but the definition is configurable per country and campaign — it could be a compound, an extended family, or any other culturally appropriate grouping. One Household produces one record in `chad-household-index-v1`. Member count is the number of people in the grouping, not the number of eligible children.

## Eligible Child
A child aged 0–59 months found during household registration. The age band is fixed for this campaign. Eligible children are counted at registration time (enumeration), not at delivery time. Distinct from Zero-dose Child — an eligible child may have received OPV in a prior campaign.

## Zero-dose Child
A child who had never received OPV (oral polio vaccine) before this campaign (`receivedOPVBefore = "NO"`). A subset of Eligible Children. Zero-dose children are the highest-priority targets for vaccination — they have no prior immunity. Tracked in `chad-project-task-index-v1`.

## Coverage
The percentage of Eligible Children who have been vaccinated in this campaign. Formula: `vaccinated_children / eligible_children × 100`. Vaccinated = `ADMINISTRATION_SUCCESS` in the task index. **Never computed against Microplan Target** — that denominator is a pre-campaign estimate and is not valid for real-time display.

## Refusal
A household that declined vaccination during a team visit. Recorded in `chad-household-index-v1` with a reason code. A Refusal is household-level, not child-level. Refusing households' children remain Eligible Children and are counted as unvaccinated — they directly reduce Coverage %. A Refusal is not terminal: teams are expected to revisit and attempt vaccination again. Reason codes: `NOT_DECISION_MAKER`, `RELIGIOUS_BELIEFS`, `VACCINE_SIDE_EFFECTS`, `AFRICA_IS_POLIO_FREE`, `TOO_MANY_DOSES`, `CHILD_WAS_SICK`, `CONCERNS_ABOUT_NOPV`, `CONCERNS_ABOUT_COVID19`.

## Demographics
A breakdown of Eligible Children by age group and gender, with vaccination counts. Age groups are campaign-configurable — they can shift between campaigns and must not be hard-coded in the visualisation. For this campaign the eligible range is 0–59 months. Gender values seen so far: `MALE`, `FEMALE`. The dashboard must render whatever age group strings arrive in the data.

## Settlement Type
A categorical tag on each household record: `URBAN`, `RURAL`, `SLUMS`, or `NOMADS_PASTORALISTS`. Matters for aggregate analysis — different settlement types require different vaccination strategies (nomadic populations are harder to revisit, slum areas tend to have higher zero-dose rates). Data quality is inconsistent at the individual record level, so settlement type is shown only in aggregate (Settlement tab) and intentionally excluded from individual hover cards to avoid clutter.

## Inactive Team
A Team that has submitted no data within a threshold period (target: 24 hours, exact threshold not yet finalised). Causes range from genuine connectivity failure (no internet, phone issue) to a team that has stopped working. The signal means "we have no recent data from this team" — not definitively that they stopped. Primary action: the Health Facility manager calls the team directly. Escalation path: higher officials see the same alert and call up the Health Facility manager to take charge. Tracked in `inactive_users` in the data and surfaced in the AlertBar (full mode only).

## Dashboard Users
A spectrum of users with different information needs:
- **Health Facility staff**: track metrics for their own facility — coverage, households registered, team activity.
- **Supervisors / district managers**: track multiple facilities, identify underperformance, take corrective action (dispatch teams, revisit refusals).
- **Country office / WHO**: campaign-level overview, upward reporting, cross-facility comparison.
- **Field action-takers** (supervisors): need granular detail — map dots, inactive teams, refusal clusters — to make same-day decisions.

The dashboard must serve all levels simultaneously. Full mode exposes performance signals and team-level detail; public mode gives facility staff a neutral progress view without comparative pressure.

## Vaccination Visit
A Team visit to an enumerated household to administer OPV. Vaccination is tracked child-by-child — each Eligible Child produces a separate task record. A household with multiple Eligible Children may be partially vaccinated (some children vaccinated, others not). Partial vaccination is not currently surfaced in the dashboard but is a known future metric. `vaccinated_count` on a household GPS dot is a coordinate-join estimate and subject to human data-entry error and potential duplicate records — treat as approximate, not authoritative.

## Enumeration
The act of a Team visiting a household, registering it in the system, and counting its members and Eligible Children. Enumeration produces the household GPS record. No vaccine is administered at this step. In HCM, enumeration must precede vaccination — a household must be enumerated before it can be vaccinated. The ordering is country-strategy-dependent: in Chad, enumeration started before vaccination (3 June) and continues alongside it (5–7 June), so enumeration and vaccination visits can be concurrent at the campaign level.

## Campaign
The bounded operational period during which Teams enumerate households and vaccinate eligible children across all Health Facilities. Enumeration and vaccination overlap — enumeration begins first (in this instance, 3 June) and continues until the campaign ends; vaccination runs as a sub-period within that (5–7 June in this instance). The distinction between "Campaign" and "Round" is deferred — not yet resolved.

## Health Facility
Both a physical clinic and an administrative catchment area. All households, GPS records, and coverage data are grouped under a Health Facility. In Chad, one Team is assigned to exactly one Health Facility per campaign round (1:1). The catchment area defines which households are the Team's responsibility for that round.

## Team
A field unit of typically two people assigned to a Health Facility for a campaign round. One person carries the device and records all data — their login produces the `user_name` code (e.g. `"LE-11"`). The second person assists with vaccination and community engagement but does not record data. "Team" is the standard term in polio campaigns; the code uniquely identifies the recording device, not the individual. One Team code = one active device = one data stream.

## Microplan Target
A pre-campaign estimate of the number of children expected to be found in a health facility's catchment area. Not used as a Coverage denominator. Displayed in the Microplan tab as reference data only — not a KPI. Source: planning documents loaded before the campaign begins.

