#!/usr/bin/env python3
"""Convert chad-polio-ingest Excel output → public/data.json"""

import json
import sys
from pathlib import Path
import pandas as pd

def clean(val):
    """Convert numpy/pandas types to plain Python for JSON serialisation."""
    if pd.isna(val):
        return None
    if hasattr(val, 'item'):
        return val.item()
    return val

def rows(df):
    return [
        {k: clean(v) for k, v in row.items()}
        for row in df.to_dict('records')
    ]

def convert(xlsx_path: str, out_path: str):
    xl = pd.ExcelFile(xlsx_path)
    print(f"Sheets found: {xl.sheet_names}")

    data = {}

    # _metadata — one row
    meta_df = xl.parse('_metadata')
    meta_row = meta_df.iloc[0].to_dict()
    data['_metadata'] = {k: clean(v) for k, v in meta_row.items()}

    # coverage — date must be YYYY-MM-DD string
    cov = xl.parse('coverage')
    cov['date'] = pd.to_datetime(cov['date']).dt.strftime('%Y-%m-%d')
    data['coverage'] = rows(cov)

    # activity — date YYYY-MM-DD, last_sync ISO string, is_inactive bool
    act = xl.parse('activity')
    act['date'] = pd.to_datetime(act['date']).dt.strftime('%Y-%m-%d')
    if 'last_sync' in act.columns:
        act['last_sync'] = act['last_sync'].apply(
            lambda v: None if pd.isna(v) else (v.isoformat() if hasattr(v, 'isoformat') else str(v))
        )
    act['is_inactive'] = act['is_inactive'].astype(bool)
    data['activity'] = rows(act)

    # refusals
    data['refusals'] = rows(xl.parse('refusals'))

    # enumeration
    data['enumeration'] = rows(xl.parse('enumeration'))

    # enumeration_daily
    if 'enumeration_daily' in xl.sheet_names:
        ed = xl.parse('enumeration_daily')
        if 'date' in ed.columns:
            ed['date'] = ed['date'].apply(lambda v: None if pd.isna(v) else str(v)[:10])
        data['enumeration_daily'] = rows(ed)
    else:
        data['enumeration_daily'] = []

    # stock
    data['stock'] = rows(xl.parse('stock'))

    # stock_daily
    if 'stock_daily' in xl.sheet_names:
        sd = xl.parse('stock_daily')
        if 'date' in sd.columns:
            sd['date'] = sd['date'].apply(
                lambda v: None if pd.isna(v) else str(v)[:10]
            )
        data['stock_daily'] = rows(sd)
    else:
        data['stock_daily'] = []

    # gps — vaccinated must be bool
    gps = xl.parse('gps')
    gps['vaccinated'] = gps['vaccinated'].astype(bool)
    data['gps'] = rows(gps)

    # gps_refusals
    if 'gps_refusals' in xl.sheet_names:
        data['gps_refusals'] = rows(xl.parse('gps_refusals'))
    else:
        data['gps_refusals'] = []

    # gps_zerodose
    if 'gps_zerodose' in xl.sheet_names:
        data['gps_zerodose'] = rows(xl.parse('gps_zerodose'))
    else:
        data['gps_zerodose'] = []

    # gps_closed_household
    if 'gps_closed_household' in xl.sheet_names:
        data['gps_closed_household'] = rows(xl.parse('gps_closed_household'))
    else:
        data['gps_closed_household'] = []

    # microplan
    data['microplan'] = rows(xl.parse('microplan'))

    # settlement
    data['settlement'] = rows(xl.parse('settlement'))

    # demographics
    data['demographics'] = rows(xl.parse('demographics'))

    # inactive_users
    iu = xl.parse('inactive_users')
    if 'last_sync' in iu.columns:
        iu['last_sync'] = iu['last_sync'].apply(
            lambda v: None if pd.isna(v) else (v.isoformat() if hasattr(v, 'isoformat') else str(v))
        )
    data['inactive_users'] = rows(iu)

    with open(out_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

    sizes = {k: len(v) if isinstance(v, list) else '—' for k, v in data.items()}
    print(f"Written to {out_path}")
    for sheet, count in sizes.items():
        print(f"  {sheet}: {count} records")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 excel_to_json.py <path/to/chad_YYYYMMDD_HHMM.xlsx>")
        sys.exit(1)
    xlsx = sys.argv[1]
    out = str(Path(__file__).parent.parent / 'public' / 'data.json')
    convert(xlsx, out)
