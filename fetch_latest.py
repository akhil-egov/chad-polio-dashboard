#!/usr/bin/env python3
"""
fetch_latest.py — download the latest extraction Excel from the Jupyter server,
convert it to data.json, and push to GitHub.

Usage:
    python3 fetch_latest.py            # download, convert, commit, push
    python3 fetch_latest.py --no-push  # download and convert only

Reads credentials from .env.local (JUPYTER_BASE, JUPYTER_TOKEN, JUPYTER_REMOTE_ROOT).
"""

import os
import sys
import json
import base64
import ssl
import urllib.request
import urllib.error
import subprocess
from pathlib import Path


REPO_ROOT     = Path(__file__).parent
EXCEL_TO_JSON = REPO_ROOT / "scripts" / "excel_to_json.py"
DOWNLOADS_DIR = REPO_ROOT / "downloads"


def _load_env(path: Path) -> None:
    """Minimal .env file loader — no external dependencies required."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())


def _require(var: str) -> str:
    val = os.environ.get(var)
    if not val:
        print(f"ERROR: {var} is not set. Add it to .env.local")
        sys.exit(1)
    return val


def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _get(url: str, token: str) -> bytes:
    req = urllib.request.Request(url, headers={"Authorization": f"token {token}"})
    with urllib.request.urlopen(req, context=_ssl_ctx()) as r:
        return r.read()


def list_output_files(base: str, token: str, remote_root: str) -> list[dict]:
    url  = f"{base}/api/contents/{remote_root}/output"
    data = json.loads(_get(url, token))
    return [f for f in data.get("content", []) if f["name"].endswith(".xlsx")]


def download_file(base: str, token: str, remote_root: str,
                  remote_name: str, dest: Path) -> None:
    url  = f"{base}/api/contents/{remote_root}/output/{remote_name}?content=1&format=base64"
    data = json.loads(_get(url, token))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(base64.b64decode(data["content"]))


def main():
    _load_env(REPO_ROOT / ".env.local")

    base        = _require("JUPYTER_BASE")
    token       = _require("JUPYTER_TOKEN")
    remote_root = _require("JUPYTER_REMOTE_ROOT")
    no_push     = "--no-push" in sys.argv

    print("Listing output files on Jupyter server...")
    try:
        files = list_output_files(base, token, remote_root)
    except urllib.error.HTTPError as e:
        print(f"ERROR listing files: HTTP {e.code}")
        sys.exit(1)

    if not files:
        print("No Excel files found in output/ — run main.run() on Jupyter first.")
        sys.exit(1)

    latest = sorted(files, key=lambda f: f["name"])[-1]
    name   = latest["name"]
    print(f"Latest: {name}  ({latest.get('size', '?')} bytes)")

    dest = DOWNLOADS_DIR / name
    if dest.exists():
        print(f"Already downloaded: {dest}")
    else:
        print("Downloading...")
        download_file(base, token, remote_root, name, dest)
        print(f"Saved to {dest}")

    print("Converting to data.json...")
    result = subprocess.run(
        [sys.executable, str(EXCEL_TO_JSON), str(dest)],
        capture_output=True, text=True,
    )
    print(result.stdout.strip())
    if result.returncode != 0:
        print("ERROR:", result.stderr.strip())
        sys.exit(1)

    if no_push:
        print("Done (--no-push: skipping git commit).")
        return

    print("Committing and pushing...")
    tag = name.replace(".xlsx", "").replace("chad_", "")
    subprocess.run(["git", "add", "public/data.json"], cwd=REPO_ROOT, check=True)

    if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=REPO_ROOT).returncode == 0:
        print("data.json unchanged — nothing to commit.")
        return

    subprocess.run(
        ["git", "commit", "-m", f"data: update to chad_{tag}"],
        cwd=REPO_ROOT, check=True,
    )
    subprocess.run(["git", "push"], cwd=REPO_ROOT, check=True)
    print("Done.")


if __name__ == "__main__":
    main()
