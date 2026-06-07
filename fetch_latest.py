#!/usr/bin/env python3
"""
fetch_latest.py — download the latest extraction Excel from the Jupyter server,
convert it to data.json, and push to GitHub.

Usage:
    python3 fetch_latest.py          # download, convert, commit, push
    python3 fetch_latest.py --no-push  # download and convert only
"""

import sys
import json
import base64
import urllib.request
import urllib.error
import ssl
import subprocess
from pathlib import Path
from datetime import datetime

JUPYTER_BASE  = "https://campaigns.afro.who.int/jupyter/user/reportsadmin"
JUPYTER_TOKEN = "ca92f2898a594ce48cb4c839abb92ed2"
REMOTE_OUTPUT = "HCM_CUSTOM_REPORTS/CHAD_POLIO_PILOT/DST/output"

REPO_ROOT     = Path(__file__).parent
EXCEL_TO_JSON = REPO_ROOT / "scripts" / "excel_to_json.py"
DOWNLOADS_DIR = REPO_ROOT / "downloads"


def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"Authorization": f"token {JUPYTER_TOKEN}"})
    with urllib.request.urlopen(req, context=_ssl_ctx()) as r:
        return r.read()


def list_output_files() -> list[dict]:
    url  = f"{JUPYTER_BASE}/api/contents/{REMOTE_OUTPUT}"
    data = json.loads(_get(url))
    return [f for f in data.get("content", []) if f["name"].endswith(".xlsx")]


def download_file(remote_name: str, dest: Path) -> None:
    url  = f"{JUPYTER_BASE}/api/contents/{REMOTE_OUTPUT}/{remote_name}?content=1&format=base64"
    data = json.loads(_get(url))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(base64.b64decode(data["content"]))


def main():
    no_push = "--no-push" in sys.argv

    print("Listing output files on Jupyter server...")
    try:
        files = list_output_files()
    except urllib.error.HTTPError as e:
        print(f"ERROR listing files: HTTP {e.code}")
        sys.exit(1)

    if not files:
        print("No Excel files found in output/ — run main.run() on Jupyter first.")
        sys.exit(1)

    # Pick the most recent by filename (chad_YYYYMMDD_HHMM.xlsx sorts correctly)
    latest = sorted(files, key=lambda f: f["name"])[-1]
    name   = latest["name"]
    print(f"Latest: {name}  ({latest.get('size', '?')} bytes)")

    dest = DOWNLOADS_DIR / name
    if dest.exists():
        print(f"Already downloaded: {dest}")
    else:
        print(f"Downloading...")
        download_file(name, dest)
        print(f"Saved to {dest}")

    print("Converting to data.json...")
    result = subprocess.run(
        [sys.executable, str(EXCEL_TO_JSON), str(dest)],
        capture_output=True, text=True
    )
    print(result.stdout.strip())
    if result.returncode != 0:
        print("ERROR:", result.stderr.strip())
        sys.exit(1)

    if no_push:
        print("Done (--no-push: skipping git commit).")
        return

    print("Committing and pushing...")
    tag = name.replace(".xlsx", "").replace("chad_", "")  # e.g. 20260607_0059
    subprocess.run(["git", "add", "public/data.json"], cwd=REPO_ROOT, check=True)

    # Check if there's anything to commit
    status = subprocess.run(
        ["git", "diff", "--cached", "--quiet"], cwd=REPO_ROOT
    )
    if status.returncode == 0:
        print("data.json unchanged — nothing to commit.")
        return

    subprocess.run(
        ["git", "commit", "-m", f"data: update to chad_{tag}"],
        cwd=REPO_ROOT, check=True
    )
    subprocess.run(["git", "push"], cwd=REPO_ROOT, check=True)
    print("Done.")


if __name__ == "__main__":
    main()
