/**
 * Structural invariants for the Gantry Cortex-shell rebrand.
 * Do not violate these when extending layout, tokens, or input modules.
 */
export const SHELL_INVARIANTS = {
  /** Product flow is unchanged: compose on /runs/new → task submit → IDE reveal → /runs/:id */
  runLifecycle:
    'compose-first on /runs/new; pendingTaskId in runLaunchStore; ideRevealed animates split IDE; route replaces to /runs/:id',

  /** Sidebar sits on shell background; all page content lives inside .app-panel */
  layout: 'app-layout → sidebar + app-main → app-panel → routes',

  /** Styling uses CSS variables only; legacy --brand-* alias --accent-* */
  tokens: 'design/tokens.css imported by index.css; no new hardcoded #2563eb',

  /** Compose input and IDE follow-up share PromptCard shell */
  input: 'components/input/PromptCard — ChatInput + RunFollowUpComposer',

  /** Gantry IA, not Cortex chat IA */
  navigation: 'New run | Workspaces | Runs | Starters | Team | Developer — no Explore/Library/History',

  /** Activity feed semantics unchanged — shell is presentation only */
  ide: 'RunIdePage 3-column workspace (files | center editor/preview | agent rail); MessageFeed, HITL cards preserved',

  /** Message ordering owned by API normalize + taskMessages merge — not CSS order hacks */
  messages: 'api/services/task_messages.py + shared/gantry/taskMessages.ts',

  /** Vercel = static SPA only; API on VPS/K8s via VITE_GANTRY_API_URL */
  deploy: 'deploy/invariants.ts + deploy/env.ts; vercel.json SPA rewrites; no API on Vercel',
} as const;

export type ShellInvariantKey = keyof typeof SHELL_INVARIANTS;
