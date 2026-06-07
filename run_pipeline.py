#!/usr/bin/env python3
"""
run_pipeline.py — trigger main.run() on the remote Jupyter kernel, then
download the result, convert to data.json, and push to GitHub.

Usage:
    python3 run_pipeline.py            # full run: execute + download + push
    python3 run_pipeline.py --no-push  # execute + download, skip git push

Reads credentials from .env.local.
Requires: pip3 install websocket-client
"""

import os
import sys
import ssl
import json
import uuid
import time
import urllib.request
import urllib.error
import subprocess
from pathlib import Path

import websocket  # pip3 install websocket-client

REPO_ROOT = Path(__file__).parent


# ── env loading ───────────────────────────────────────────────────────────────

def _load_env(path: Path) -> None:
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


# ── Jupyter REST helpers ──────────────────────────────────────────────────────

def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _rest(method: str, path: str, base: str, token: str, body=None) -> dict:
    url  = f"{base}/api/{path}"
    data = json.dumps(body).encode() if body is not None else None
    req  = urllib.request.Request(
        url, data=data, method=method,
        headers={"Authorization": f"token {token}",
                 "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, context=_ssl_ctx()) as r:
        return json.loads(r.read())


def create_kernel(base: str, token: str) -> str:
    resp = _rest("POST", "kernels", base, token, {"name": "python3"})
    return resp["id"]


def delete_kernel(base: str, token: str, kernel_id: str) -> None:
    try:
        url = f"{base}/api/kernels/{kernel_id}"
        req = urllib.request.Request(
            url, method="DELETE",
            headers={"Authorization": f"token {token}"},
        )
        urllib.request.urlopen(req, context=_ssl_ctx())
    except Exception:
        pass  # best-effort cleanup


# ── Jupyter messaging protocol ────────────────────────────────────────────────

def _msg(msg_type: str, content: dict, session: str) -> str:
    return json.dumps({
        "header": {
            "msg_id":   str(uuid.uuid4()),
            "username": "run_pipeline",
            "session":  session,
            "msg_type": msg_type,
            "version":  "5.3",
        },
        "parent_header": {},
        "metadata":      {},
        "content":       content,
        "channel":       "shell",
    })


def _build_code() -> str:
    remote_root  = _require("JUPYTER_REMOTE_ROOT")
    es_url       = _require("ES_URL")
    es_auth      = _require("ES_AUTH_HEADER")
    return f"""
import os, sys
from pathlib import Path
os.environ["ES_URL"]         = {es_url!r}
os.environ["ES_AUTH_HEADER"] = {es_auth!r}
dst = Path.home() / {remote_root!r}
sys.path.insert(0, str(dst))
os.chdir(str(dst))
from main import run
run()
print("__PIPELINE_DONE__")
"""


def execute_on_kernel(base: str, token: str, kernel_id: str, code: str,
                      timeout: int = 1800) -> bool:
    """
    Connect via WebSocket, execute CODE, stream output, return True on success.
    timeout: max seconds to wait for completion (default 30 min).
    """
    ws_base  = base.replace("https://", "wss://").replace("http://", "ws://")
    ws_url   = f"{ws_base}/api/kernels/{kernel_id}/channels"
    session  = str(uuid.uuid4())
    success  = False
    done     = False

    def on_open(ws):
        # Wait briefly for kernel to be ready, then execute
        time.sleep(1)
        ws.send(_msg("execute_request", {
            "code":             code,
            "silent":           False,
            "store_history":    False,
            "allow_stdin":      False,
            "stop_on_error":    True,
        }, session))

    def on_message(ws, raw):
        nonlocal success, done
        try:
            msg      = json.loads(raw)
            msg_type = msg.get("header", {}).get("msg_type", "")
            content  = msg.get("content", {})

            if msg_type == "stream":
                text = content.get("text", "").rstrip()
                if text:
                    for line in text.splitlines():
                        print(f"  [jupyter] {line}")
                if "__PIPELINE_DONE__" in content.get("text", ""):
                    success = True

            elif msg_type == "error":
                print(f"  [jupyter ERROR] {content.get('ename')}: {content.get('evalue')}")
                for tb in content.get("traceback", []):
                    # Strip ANSI codes for clean output
                    import re
                    print("  " + re.sub(r"\x1b\[[0-9;]*m", "", tb))

            elif msg_type == "execute_reply":
                status = content.get("status")
                if status == "ok":
                    success = True
                done = True
                ws.close()

        except Exception as e:
            print(f"  [ws parse error] {e}")

    def on_error(ws, error):
        print(f"  [ws error] {error}")

    def on_close(ws, *_):
        nonlocal done
        done = True

    sslopt = {"cert_reqs": ssl.CERT_NONE}
    ws = websocket.WebSocketApp(
        ws_url,
        header={"Authorization": f"token {token}"},
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    import threading
    t = threading.Thread(target=lambda: ws.run_forever(sslopt=sslopt), daemon=True)
    t.start()

    deadline = time.time() + timeout
    while not done and time.time() < deadline:
        time.sleep(1)

    if not done:
        print(f"ERROR: kernel timed out after {timeout}s")
        ws.close()

    return success


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    _load_env(REPO_ROOT / ".env.local")

    base        = _require("JUPYTER_BASE")
    token       = _require("JUPYTER_TOKEN")
    no_push     = "--no-push" in sys.argv

    print("Creating Jupyter kernel...")
    kernel_id = create_kernel(base, token)
    print(f"Kernel: {kernel_id}")

    code = _build_code()
    try:
        print("Executing pipeline on Jupyter (this takes ~5–10 min)...")
        t0      = time.time()
        success = execute_on_kernel(base, token, kernel_id, code)
        elapsed = int(time.time() - t0)
        if not success:
            print(f"ERROR: pipeline did not complete successfully ({elapsed}s)")
            sys.exit(1)
        print(f"Pipeline complete ({elapsed}s)")
    finally:
        delete_kernel(base, token, kernel_id)
        print("Kernel cleaned up")

    # Hand off to fetch_latest
    args = [sys.executable, str(REPO_ROOT / "fetch_latest.py")]
    if no_push:
        args.append("--no-push")
    result = subprocess.run(args)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
