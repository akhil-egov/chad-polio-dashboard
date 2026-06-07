#!/usr/bin/env python3
"""
setup_cron.py — register the hourly pipeline cron job on the Jupyter server.
Run this once. Safe to re-run — won't create duplicates.

Usage:
    python3 setup_cron.py
"""

import os
import sys
import ssl
import json
import uuid
import time
import urllib.request
import urllib.error
import threading
from pathlib import Path

import websocket

REPO_ROOT = Path(__file__).parent


def _load_env(path):
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())


def _require(var):
    val = os.environ.get(var)
    if not val:
        print(f"ERROR: {var} not set in .env.local")
        sys.exit(1)
    return val


def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _rest(method, path, base, token, body=None):
    url  = f"{base}/api/{path}"
    data = json.dumps(body).encode() if body is not None else None
    req  = urllib.request.Request(
        url, data=data, method=method,
        headers={"Authorization": f"token {token}",
                 "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, context=_ssl_ctx()) as r:
        return json.loads(r.read())


def _msg(msg_type, content, session):
    return json.dumps({
        "header": {"msg_id": str(uuid.uuid4()), "username": "setup_cron",
                   "session": session, "msg_type": msg_type, "version": "5.3"},
        "parent_header": {}, "metadata": {}, "content": content, "channel": "shell",
    })


CRON_CODE = """
import subprocess, sys, os, signal
from pathlib import Path

python  = sys.executable
dst     = Path.home() / "HCM_CUSTOM_REPORTS/CHAD_POLIO_PILOT/DST"
script  = str(dst / "scheduler.py")
log     = open(Path.home() / "pipeline.log", "a")
pid_file = Path.home() / "scheduler.pid"

# Kill any existing scheduler
if pid_file.exists():
    try:
        old_pid = int(pid_file.read_text().strip())
        os.kill(old_pid, signal.SIGTERM)
        print(f"Stopped previous scheduler (PID {old_pid})")
    except (ProcessLookupError, ValueError):
        pass

proc = subprocess.Popen([python, script], stdout=log, stderr=log,
                         start_new_session=True)
pid_file.write_text(str(proc.pid))
print(f"Scheduler started — PID {proc.pid}")
print(f"Logs: ~/pipeline.log")
print(f"Stop: import os,signal; os.kill({proc.pid}, signal.SIGTERM)")
print("__CRON_DONE__")
"""


def run_on_kernel(base, token, code, timeout=60):
    kernel_id = _rest("POST", "kernels", base, token, {"name": "python3"})["id"]
    print(f"Kernel: {kernel_id}")

    ws_url  = f"{base.replace('https://', 'wss://')}/api/kernels/{kernel_id}/channels"
    session = str(uuid.uuid4())
    done = False
    success = False

    def on_open(ws):
        time.sleep(1)
        ws.send(_msg("execute_request", {
            "code": code, "silent": False, "store_history": False,
            "allow_stdin": False, "stop_on_error": True,
        }, session))

    def on_message(ws, raw):
        nonlocal done, success
        msg      = json.loads(raw)
        msg_type = msg.get("header", {}).get("msg_type", "")
        content  = msg.get("content", {})
        if msg_type == "stream":
            print(content.get("text", "").rstrip())
            if "__CRON_DONE__" in content.get("text", ""):
                success = True
        elif msg_type == "error":
            print(f"ERROR: {content.get('ename')}: {content.get('evalue')}")
        elif msg_type == "execute_reply":
            done = True
            ws.close()

    def on_close(ws, *_):
        nonlocal done
        done = True

    ws = websocket.WebSocketApp(ws_url,
        header={"Authorization": f"token {token}"},
        on_open=on_open, on_message=on_message, on_close=on_close)

    t = threading.Thread(
        target=lambda: ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE}), daemon=True)
    t.start()

    deadline = time.time() + timeout
    while not done and time.time() < deadline:
        time.sleep(1)

    # Cleanup kernel
    try:
        url = f"{base}/api/kernels/{kernel_id}"
        req = urllib.request.Request(url, method="DELETE",
                                     headers={"Authorization": f"token {token}"})
        urllib.request.urlopen(req, context=_ssl_ctx())
    except Exception:
        pass

    return success


def main():
    _load_env(REPO_ROOT / ".env.local")
    base  = _require("JUPYTER_BASE")
    token = _require("JUPYTER_TOKEN")

    print("Registering hourly cron job on Jupyter server...")
    ok = run_on_kernel(base, token, CRON_CODE)
    if ok:
        print("\nDone. Pipeline runs every hour on the Jupyter server.")
        print("Logs: ~/pipeline.log  |  Locally: python3 fetch_latest.py to pull latest data.")
    else:
        print("\nSomething went wrong — check output above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
