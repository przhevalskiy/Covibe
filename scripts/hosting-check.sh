#!/usr/bin/env bash
# Local hosting verification — run before first deploy or after deploy changes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> CORS unit tests"
.venv/bin/python -m pytest tests/test_cors_config.py -q

echo "==> apps/web production build"
(
  cd apps/web
  VITE_GANTRY_API_URL="${VITE_GANTRY_API_URL:-https://api.example.com}" npm run build
)

echo "==> deploy smoke (local API if running)"
if curl -sf http://127.0.0.1:8001/health >/dev/null 2>&1; then
  bash deploy/smoke.sh http://127.0.0.1:8001
else
  echo "    (skip — API not on :8001)"
fi

echo "==> hosting check passed"
