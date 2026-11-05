"""
Export three analytics CSVs from data.json for Excel / Claude analysis.

Outputs (written to scripts/output/):
  1. daily_summary.csv       — day-wise enum + vaxx + active teams
  2. enum_cohort.csv         — per-enum-day cohort → total vaccinated
  3. geo_duplicates.csv      — geo-clusters with >1 enum record (under-vaxx signal)

Run:  python3 scripts/export_analytics.py
"""

import json
import re
import csv
import os
from collections import defaultdict

DATA_PATH = "public/data.json"
OUT_DIR = "scripts/output"
os.makedirs(OUT_DIR, exist_ok=True)

with open(DATA_PATH) as f:
    data = json.load(f)

# ── Day number lookup (from activity table) ──────────────────────────────────
day_number = {}
for r in data["activity"]:
    day_number[r["date"]] = r["day_number"]

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT 1: daily_summary.csv
# ─────────────────────────────────────────────────────────────────────────────
# Columns:
#   date, day_number,
#   households_enumerated, eligible_children_enumerated,  ← from enumeration_daily
#   vaccinated_children,                                   ← from coverage (0 on enum-only days)
#   active_users,                                          ← distinct user_name in activity
#   active_teams                                           ← distinct team_name in activity

enum_by_date = defaultdict(lambda: {"households": 0, "eligible": 0})
for r in data["enumeration_daily"]:
    if r["date"] == "2026-06-15":   # known noise record
        continue
    enum_by_date[r["date"]]["households"] += r["households_registered"]
    enum_by_date[r["date"]]["eligible"] += r["eligible_children"]

vaxx_by_date = defaultdict(int)
for r in data["coverage"]:
    vaxx_by_date[r["date"]] += r["vaccinated"]

users_by_date = defaultdict(set)
teams_by_date = defaultdict(set)
for r in data["activity"]:
    users_by_date[r["date"]].add(r["user_name"])
    teams_by_date[r["date"]].add(r["team_name"])

all_dates = sorted(set(list(enum_by_date.keys()) + list(vaxx_by_date.keys())))

daily_rows = []
for d in all_dates:
    daily_rows.append({
        "date": d,
        "day_number": day_number.get(d, ""),
        "households_enumerated": enum_by_date[d]["households"],
        "eligible_children_enumerated": enum_by_date[d]["eligible"],
        "vaccinated_children": vaxx_by_date[d],
        "active_users": len(users_by_date[d]),
        "active_teams": len(teams_by_date[d]),
    })

with open(f"{OUT_DIR}/daily_summary.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(daily_rows[0].keys()))
    w.writeheader()
    w.writerows(daily_rows)

print(f"[1] daily_summary.csv — {len(daily_rows)} rows")

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT 2: enum_cohort.csv
# ─────────────────────────────────────────────────────────────────────────────
# Each row = all households enumerated on a given day, and how many of their
# children were eventually vaccinated (at any point in the campaign).
#
# Columns:
#   enum_date, day_number,
#   households_in_cohort,          ← GPS records with that enum date
#   vaccinated_from_cohort,        ← sum of vaccinated_count on those GPS records
#   eligible_children_enumerated,  ← from enumeration_daily (cross-reference)
#   not_vaccinated_estimate,       ← eligible - vaccinated (rough estimate)
#   pct_vaccinated
#
# NOTE: vaccinated_from_cohort counts children vaccinated from households
# enumerated on that day — regardless of which campaign day they were vaccinated.
# It does NOT tell you which day vaccination happened (no per-household vaxx date
# in current pipeline). See comment in code.

cohort = defaultdict(lambda: {"households": 0, "vaccinated": 0})
pattern = re.compile(r"H-(\d{4}-\d{2}-\d{2})-")
for r in data["gps"]:
    m = pattern.match(r["record_id"])
    if not m:
        continue
    d = m.group(1)
    cohort[d]["households"] += 1
    cohort[d]["vaccinated"] += r.get("vaccinated_count", 0) or 0

cohort_rows = []
for d in sorted(cohort.keys()):
    eligible = enum_by_date[d]["eligible"]
    vaxxed = cohort[d]["vaccinated"]
    pct = round(vaxxed / eligible * 100, 1) if eligible > 0 else 0
    cohort_rows.append({
        "enum_date": d,
        "day_number": day_number.get(d, ""),
        "households_in_cohort": cohort[d]["households"],
        "vaccinated_from_cohort": vaxxed,
        "eligible_children_enumerated": eligible,
        "not_vaccinated_estimate": max(0, eligible - vaxxed),
        "pct_vaccinated": pct,
    })

with open(f"{OUT_DIR}/enum_cohort.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(cohort_rows[0].keys()))
    w.writeheader()
    w.writerows(cohort_rows)

print(f"[2] enum_cohort.csv — {len(cohort_rows)} rows")

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT 3: geo_duplicates.csv
# ─────────────────────────────────────────────────────────────────────────────
# Clusters of GPS records within ~11m of each other (lat/lng rounded to 4dp).
# Only outputs clusters with >1 record (potential duplicates).
#
# Columns:
#   cluster_id,
#   lat_center, lng_center,
#   record_count,              ← how many enum records at this location
#   enum_dates,                ← pipe-separated list e.g. "2026-06-03|2026-06-04"
#   teams,                     ← pipe-separated user_names who visited
#   facility_names,            ← pipe-separated (flags cross-facility boundary issues)
#   total_vaccinated_count,    ← sum of vaccinated_count across all records
#   any_record_unvaccinated,   ← TRUE if any record has vaccinated_count = 0
#   flag
#       MULTI_ENUM_ZERO_VAX     = all records have vaccinated_count = 0
#       MULTI_ENUM_PARTIAL_VAX  = some vaccinated, some not
#       MULTI_ENUM_ALL_VAXXED   = all records have vaccinated_count > 0

clusters = defaultdict(list)
for r in data["gps"]:
    key = (round(r["lat"], 4), round(r["lng"], 4))
    clusters[key].append(r)

dup_rows = []
cluster_id = 1
for (lat, lng), records in sorted(clusters.items()):
    if len(records) < 2:
        continue

    enum_dates_list = []
    for r in records:
        m = pattern.match(r["record_id"])
        if m:
            enum_dates_list.append(m.group(1))

    total_vaxxed = sum(r.get("vaccinated_count", 0) or 0 for r in records)
    any_unvaxxed = any((r.get("vaccinated_count", 0) or 0) == 0 for r in records)
    all_unvaxxed = all((r.get("vaccinated_count", 0) or 0) == 0 for r in records)

    if all_unvaxxed:
        flag = "MULTI_ENUM_ZERO_VAX"
    elif any_unvaxxed:
        flag = "MULTI_ENUM_PARTIAL_VAX"
    else:
        flag = "MULTI_ENUM_ALL_VAXXED"

    dup_rows.append({
        "cluster_id": cluster_id,
        "lat_center": lat,
        "lng_center": lng,
        "record_count": len(records),
        "enum_dates": "|".join(sorted(set(enum_dates_list))),
        "teams": "|".join(sorted(set(r["user_name"] for r in records if r.get("user_name")))),
        "facility_names": "|".join(sorted(set(r["facility_name"] for r in records if r.get("facility_name")))),
        "total_vaccinated_count": total_vaxxed,
        "any_record_unvaccinated": any_unvaxxed,
        "flag": flag,
    })
    cluster_id += 1

with open(f"{OUT_DIR}/geo_duplicates.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(dup_rows[0].keys()))
    w.writeheader()
    w.writerows(dup_rows)

# Summary by flag
from collections import Counter
flag_counts = Counter(r["flag"] for r in dup_rows)
print(f"[3] geo_duplicates.csv — {len(dup_rows)} duplicate clusters")
for flag, count in sorted(flag_counts.items()):
    print(f"    {flag}: {count}")

print(f"\nAll files written to {OUT_DIR}/")

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT 4: master_gps_raw.csv
# ─────────────────────────────────────────────────────────────────────────────
# One row per GPS event (household + refusal + zerodose).
# All columns present; irrelevant ones are blank for a given record_type.
#
# Columns:
#   record_id, record_type,
#   enum_date, day_number,
#   lat, lng,
#   facility_id, facility_name, district, region,
#   user_name,
#   settlement_type, settlement_name,
#   member_count,              ← household + refusal only
#   vaccinated_count,          ← household only (total vaxxed kids ever at this house)
#   reason_for_refusal,        ← refusal only
#   reason_not_vaccinated,     ← refusal only
#   age_months,                ← zerodose only
#   gender,                    ← zerodose only
#   administration_status,     ← zerodose only (ADMINISTRATION_SUCCESS = vaccinated)
#   is_vaccinated,             ← derived: household → vaccinated_count>0; zerodose → admin_status==SUCCESS; refusal → False
#   geo_cluster_key,           ← "lat_3dp|lng_3dp" — join key to geo_duplicates.csv
#   in_duplicate_cluster,      ← TRUE if another household record shares this geo_cluster_key
#   geo_duplicate_flag         ← MULTI_ENUM_ZERO_VAX / MULTI_ENUM_PARTIAL_VAX / MULTI_ENUM_ALL_VAXXED (household only)

# Build facility → district/region lookup from activity table
facility_lookup = {}
for r in data["activity"]:
    fid = r["facility_id"]
    if fid not in facility_lookup:
        facility_lookup[fid] = {"district": r["district"], "region": r["region"]}

# Pre-compute geo-cluster flags for household records
geo_cluster_info = defaultdict(lambda: {"count": 0, "flag": ""})
for (lat, lng), records in clusters.items():
    key = f"{lat}|{lng}"
    vaxxed_counts = [r.get("vaccinated_count", 0) or 0 for r in records]
    all_zero = all(v == 0 for v in vaxxed_counts)
    any_zero = any(v == 0 for v in vaxxed_counts)
    if all_zero:
        flag = "MULTI_ENUM_ZERO_VAX"
    elif any_zero:
        flag = "MULTI_ENUM_PARTIAL_VAX"
    else:
        flag = "MULTI_ENUM_ALL_VAXXED"
    geo_cluster_info[key] = {"count": len(records), "flag": flag}

MASTER_FIELDS = [
    "record_id", "record_type",
    "enum_date", "day_number",
    "lat", "lng",
    "facility_id", "facility_name", "district", "region",
    "user_name",
    "settlement_type", "settlement_name",
    "member_count",
    "vaccinated_count",
    "reason_for_refusal",
    "reason_not_vaccinated",
    "age_months",
    "gender",
    "administration_status",
    "is_vaccinated",
    "geo_cluster_key",
    "in_duplicate_cluster",
    "geo_duplicate_flag",
]

def base_row(r, record_type):
    fid = r.get("facility_id", "")
    meta = facility_lookup.get(fid, {"district": "", "region": ""})
    return {
        "record_id": r.get("record_id", ""),
        "record_type": record_type,
        "enum_date": "",
        "day_number": "",
        "lat": round(float(r["lat"]), 3) if r.get("lat") is not None else "",
        "lng": round(float(r["lng"]), 3) if r.get("lng") is not None else "",
        "facility_id": fid,
        "facility_name": r.get("facility_name", ""),
        "district": meta["district"],
        "region": meta["region"],
        "user_name": r.get("user_name", ""),
        "settlement_type": r.get("settlement_type", ""),
        "settlement_name": r.get("settlement_name", ""),
        "member_count": "",
        "vaccinated_count": "",
        "reason_for_refusal": "",
        "reason_not_vaccinated": "",
        "age_months": "",
        "gender": "",
        "administration_status": "",
        "is_vaccinated": "",
        "geo_cluster_key": "",
        "in_duplicate_cluster": "",
        "geo_duplicate_flag": "",
    }

master_rows = []

# Household records
for r in data["gps"]:
    row = base_row(r, "household")
    m = pattern.match(r["record_id"])
    if m:
        d = m.group(1)
        row["enum_date"] = d
        row["day_number"] = day_number.get(d, "")
    row["member_count"] = r.get("member_count", "")
    vaxxed = r.get("vaccinated_count", 0) or 0
    row["vaccinated_count"] = vaxxed
    row["is_vaccinated"] = vaxxed > 0
    lat_r = round(float(r["lat"]), 3)
    lng_r = round(float(r["lng"]), 3)
    cluster_key = f"{lat_r}|{lng_r}"
    row["geo_cluster_key"] = cluster_key
    info = geo_cluster_info[cluster_key]
    row["in_duplicate_cluster"] = info["count"] > 1
    row["geo_duplicate_flag"] = info["flag"] if info["count"] > 1 else ""
    master_rows.append(row)

# Refusal records
for r in data["gps_refusals"]:
    row = base_row(r, "refusal")
    m = pattern.match(r["record_id"])
    if m:
        d = m.group(1)
        row["enum_date"] = d
        row["day_number"] = day_number.get(d, "")
    row["member_count"] = r.get("member_count", "")
    row["reason_for_refusal"] = r.get("reason_for_refusal", "")
    row["reason_not_vaccinated"] = r.get("reason_not_vaccinated", "")
    row["is_vaccinated"] = False
    master_rows.append(row)

# Zerodose records
for r in data["gps_zerodose"]:
    row = base_row(r, "zerodose")
    # No date in zerodose record_id (UUID format)
    row["age_months"] = r.get("age_months", "")
    row["gender"] = r.get("gender", "")
    status = r.get("administration_status", "")
    row["administration_status"] = status
    row["is_vaccinated"] = status == "ADMINISTRATION_SUCCESS"
    master_rows.append(row)

with open(f"{OUT_DIR}/master_gps_raw.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=MASTER_FIELDS)
    w.writeheader()
    w.writerows(master_rows)

print(f"[4] master_gps_raw.csv — {len(master_rows)} rows ({len(data['gps'])} household, {len(data['gps_refusals'])} refusal, {len(data['gps_zerodose'])} zerodose)")
