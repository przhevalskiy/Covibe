#!/usr/bin/env bash
# Post-deploy smoke checks for Gantry API.
# Usage: bash deploy/smoke.sh [https://api.example.com]
set -euo pipefail

BASE="${1:-http://localhost:8001}"
BASE="${BASE%/}"

echo "==> health"
curl -sf "${BASE}/health" | head -c 200
echo

echo "==> openapi reachable"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "${BASE}/docs"

echo "==> smoke passed (${BASE})"
