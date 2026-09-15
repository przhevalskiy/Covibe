#!/usr/bin/env bash
# Deploy apps/web to Vercel (requires: vercel login OR VERCEL_TOKEN env).
# Usage:
#   export VITE_GANTRY_API_URL=https://api.staging.yourdomain.com
#   bash deploy/vercel-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"

if [ -z "${VITE_GANTRY_API_URL:-}" ]; then
  echo "Set VITE_GANTRY_API_URL before deploy (public API origin)." >&2
  exit 1
fi

cd "$WEB"
echo "==> Building with VITE_GANTRY_API_URL=$VITE_GANTRY_API_URL"
VITE_GANTRY_API_URL="$VITE_GANTRY_API_URL" npm run build

echo "==> Deploying to Vercel (apps/web root)"
if [ -n "${VERCEL_TOKEN:-}" ]; then
  npx vercel deploy --prebuilt --prod --token "$VERCEL_TOKEN" --yes
else
  npx vercel deploy --prebuilt --prod
fi

echo ""
echo "Next: on VPS run"
echo "  bash deploy/configure-ui-origin.sh https://<your-vercel-url>"
