#!/usr/bin/env bash
# Read-only readiness check. No tokens, deployment or remote command execution.
set -euo pipefail
if [[ "$#" -ne 1 ]]; then
  echo "Usage: bash scripts/smoke_ready.sh https://YOUR_BACKEND" >&2
  exit 2
fi
url=$(python3 - "$1" <<'PYURL'
import sys
from urllib.parse import urlsplit
u = urlsplit(sys.argv[1])
local = u.hostname in {"localhost", "127.0.0.1", "::1"}
if not u.hostname or u.username or u.password or u.query or u.fragment or u.path not in {"", "/"}:
    sys.exit("Use a base URL without credentials, paths or query parameters")
if u.scheme != "https" and not (u.scheme == "http" and local):
    sys.exit("HTTPS required, except for local testing")
print(sys.argv[1].rstrip("/") + "/api/ready")
PYURL
)
body=$(mktemp)
trap 'rm -f "$body"' EXIT
status=$(curl --silent --show-error --connect-timeout 5 --max-time 15 --proto '=http,https' --output "$body" --write-out '%{http_code}' "$url")
if [[ "$status" != "200" ]]; then
  echo "FAIL: readiness returned HTTP $status (no response body logged)" >&2
  exit 1
fi
python3 - "$body" <<'PYBODY'
import json, sys
try:
    with open(sys.argv[1]) as f:
        ready = json.load(f).get("status") == "ready"
except (ValueError, AttributeError):
    ready = False
if not ready:
    sys.exit("FAIL: readiness response is not valid")
print("PASS: backend readiness only; E2B and other accounts are not remotely validated")
PYBODY
