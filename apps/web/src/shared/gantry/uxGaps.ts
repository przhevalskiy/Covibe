/**
 * UX alignment gap registry — update status as gaps are closed.
 * Import `getOpenUxGaps()` in dev tooling or tests to flag remaining work.
 */

export type UxGapStatus = 'open' | 'closed' | 'deferred';

export interface UxGap {
  id: string;
  status: UxGapStatus;
  summary: string;
  module: string;
}

export const UX_GAPS: readonly UxGap[] = [
  {
    id: 'ux-01-empty-state-dup',
    status: 'closed',
    summary: 'Single EmptyState component used by ChatArea',
    module: 'features/chat/components/ui/EmptyState.tsx',
  },
  {
    id: 'ux-02-runs-nav',
    status: 'closed',
    summary: 'Sidebar: New run, Workspaces, workspace-filtered runs',
    module: 'components/layout/Sidebar.tsx',
  },
  {
    id: 'ux-03-pr-structured-only',
    status: 'closed',
    summary: 'Run detail PR URL from task.result only (no message scrape)',
    module: 'shared/gantry/taskResult.ts',
  },
  {
    id: 'ux-04-task-id-naming',
    status: 'closed',
    summary: 'SSE submitted event uses task_id; hive_task_id legacy alias',
    module: 'shared/types/index.ts',
  },
  {
    id: 'ux-05-ui-project-mapper',
    status: 'closed',
    summary: 'toUiProject replaces toQodexProject naming',
    module: 'shared/services/gantry/projectMapper.ts',
  },
  {
    id: 'ux-06-post-submit-sync',
    status: 'closed',
    summary: 'Discussion store syncs task_id on gantry:task-submitted',
    module: 'features/discussions/store.ts',
  },
  {
    id: 'ux-07-post-submit-nav',
    status: 'closed',
    summary: 'After submit, navigate to /runs/:taskId',
    module: 'shared/hooks/useSSE.ts',
  },
  {
    id: 'ux-08-gantry-legacy-gated',
    status: 'closed',
    summary: 'Compose uses Gantry-only ChatInput (no Qodex wizard/voice path)',
    module: 'features/chat/components/chat/ChatInput.tsx',
  },
  {
    id: 'ux-09-chat-messages-persist',
    status: 'closed',
    summary: 'User and assistant messages persist to discussionLocal on send/finalize',
    module: 'shared/gantry/discussionPersist.ts',
  },
  {
    id: 'ux-10-run-context-specs',
    status: 'closed',
    summary: 'Run composer + menu inlines .txt/.md specs into goal (client-side)',
    module: 'features/compose/RunContextMenu.tsx',
  },
  {
    id: 'ux-11-drop-draft-nav',
    status: 'closed',
    summary: 'Draft sidebar removed; compose at /runs/new with sessionStorage goal only',
    module: 'features/compose/composeSession.ts',
  },
  {
    id: 'ux-14-workspace-default',
    status: 'closed',
    summary: 'Runs attach to workspace; greenfield workspace auto-created on first submit',
    module: 'shared/services/gantry/greenfieldWorkspace.ts',
  },
  {
    id: 'ux-13-artifacts-api',
    status: 'closed',
    summary: 'POST /v1/artifacts + project artifacts list; merged into goal on submit',
    module: 'api/routes/artifacts.py',
  },
  {
    id: 'ux-15-workspace-brief-server',
    status: 'closed',
    summary: 'Project instructions on server; merged into goal via include_workspace_brief',
    module: 'api/services/goal_context.py',
  },
  {
    id: 'ux-16-unified-run-ide',
    status: 'closed',
    summary: 'RunIdePage: compose + explorer left, activity stream right after submit',
    module: 'features/runs/RunIdePage.tsx',
  },
  {
    id: 'ux-12-run-detail-sse',
    status: 'closed',
    summary: 'Run detail uses live SSE with reconnect + 10s fallback poll on disconnect',
    module: 'shared/hooks/useTaskRunStream.ts',
  },
  {
    id: 'ux-17-gantry-only',
    status: 'closed',
    summary: 'Removed GANTRY_PLATFORM dual-mode; Qodex/chat legacy paths dropped',
    module: 'app/App.tsx',
  },
  {
    id: 'ux-18-workspace-vocabulary',
    status: 'closed',
    summary: 'API /v1/workspaces + client workspace_id; UI uses Workspace type',
    module: 'api/routes/workspaces.py',
  },
  {
    id: 'ux-19-expandable-skills',
    status: 'closed',
    summary: 'Org-scoped /v1/playbooks (Skills) — DB-backed, not hardcoded verticals',
    module: 'api/routes/playbooks.py',
  },
] as const;

export function getOpenUxGaps(): UxGap[] {
  return UX_GAPS.filter(g => g.status === 'open');
}

export function getDeferredUxGaps(): UxGap[] {
  return UX_GAPS.filter(g => g.status === 'deferred');
}
