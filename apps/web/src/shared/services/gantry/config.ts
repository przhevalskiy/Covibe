/** Local dev — skip API key modal; Gantry API must set GANTRY_DEV_AUTH_BYPASS=true. */
export const GANTRY_DEV_AUTH_BYPASS =
  import.meta.env.VITE_GANTRY_DEV_AUTH_BYPASS === 'true';

export function gantryBaseUrl(): string {
  const configured = import.meta.env.VITE_GANTRY_API_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, '');
  return '';
}

/** Swagger / OpenAPI docs for the Gantry control plane. */
export function gantryDocsUrl(): string {
  const base = gantryBaseUrl();
  return `${base || 'http://localhost:8001'}/docs`;
}
