/**
 * Deployment invariants — Vercel (UI) + VPS/K8s (API/worker).
 * Do not violate when extending deploy config, env, or CI.
 */
export const DEPLOY_INVARIANTS = {
  /** Vercel hosts only the static Vite SPA (apps/web). No API, workers, or Temporal on Vercel. */
  vercelScope: 'apps/web → dist/ static assets + SPA rewrites only',

  /** All /v1 and SSE traffic goes to GANTRY_API_URL — never proxied through Vercel serverless. */
  apiBoundary:
    'Browser → VITE_GANTRY_API_URL (FastAPI on VPS/K8s); Vite dev proxy is local-only',

  /** Single env resolver: deploy/env.ts → shared/services/gantry/config.ts re-exports */
  envModule: 'deploy/env.ts is the only place that reads import.meta.env for Gantry deploy',

  /** Production must set API URL; dev auth bypass is forbidden in preview/production */
  productionEnv: {
    required: ['VITE_GANTRY_API_URL'],
    forbidden: ['VITE_GANTRY_DEV_AUTH_BYPASS'],
  },

  /** CORS is owned by the API (api/main.py), not Vercel rewrites */
  cors: 'API allow_origins must include app origin; UI never adds API proxy routes in vercel.json',

  /** React Router client routes require catch-all rewrite to index.html */
  spa: 'vercel.json rewrites (.*) → /index.html; no SSR',

  /** Product shell invariants still apply in production builds */
  shell: 'design/shellInvariants.ts — compose-first, app-panel layout, token-only styling',

  /** Secrets never in VITE_* except public origins; API keys stay in localStorage client-side */
  secrets: 'No VITE_* for API keys; gantry_* key in localStorage via auth store',
} as const;

export type DeployInvariantKey = keyof typeof DEPLOY_INVARIANTS;
