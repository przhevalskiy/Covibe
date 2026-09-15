#!/usr/bin/env bash
# Update VPS .env with UI origin for CORS after Vercel deploy.
# Usage (on VPS): bash deploy/configure-ui-origin.sh https://your-app.vercel.app
set -euo pipefail

UI_URL="${1:?Usage: configure-ui-origin.sh https://app.example.com}"
UI_URL="${UI_URL%/}"
ENV_FILE="${GANTRY_ENV_FILE:-/opt/gantry/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

upsert GANTRY_WEB_URL "$UI_URL"
upsert GANTRY_CORS_ORIGINS "${UI_URL},https://*.vercel.app"

echo "Updated $ENV_FILE:"
grep -E '^GANTRY_(WEB_URL|CORS_ORIGINS)=' "$ENV_FILE"
echo "Restart API: sudo systemctl restart gantry-api"
