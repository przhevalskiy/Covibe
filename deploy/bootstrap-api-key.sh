#!/usr/bin/env bash
# Create first Gantry API key on VPS (localhost only).
# Usage (on VPS): bash deploy/bootstrap-api-key.sh [key-name]
set -euo pipefail

NAME="${1:-production}"
PORT="${GANTRY_API_PORT:-8001}"

RESP=$(curl -sf -X POST "http://127.0.0.1:${PORT}/v1/keys" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${NAME}\"}")

echo "$RESP" | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
key = data.get("key") or data.get("api_key")
if not key:
    raise SystemExit(f"Unexpected response: {data}")
print("\n=== Save this key — shown once ===")
print(key)
print("================================\n")
PY
