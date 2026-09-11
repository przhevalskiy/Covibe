import { gantryClient } from './client';

const ACTIVE_KEY = 'gantry_active_workspace_v1';

/** Derive a workspace name from the user's goal. */
export function workspaceNameFromGoal(goal: string): string {
  const words = goal.trim().split(/\s+/).slice(0, 5).join(' ');
  const safe = words.replace(/[^\w\s-]/g, '').trim().slice(0, 48);
  return safe || `project-${Date.now().toString(36)}`;
}

export function loadActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveWorkspaceId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Create an empty greenfield workspace (no GitHub URL). */
export async function createGreenfieldWorkspace(name: string) {
  return gantryClient.createWorkspace(name.trim() || 'New project');
}

/**
 * Ensure the user has an active workspace for this run.
 * Reuses the persisted workspace when valid; otherwise creates a greenfield project.
 */
export async function ensureActiveWorkspace(goal: string): Promise<string> {
  const stored = loadActiveWorkspaceId();
  if (stored) {
    try {
      await gantryClient.getWorkspace(stored);
      return stored;
    } catch {
      saveActiveWorkspaceId(null);
    }
  }

  const project = await createGreenfieldWorkspace(workspaceNameFromGoal(goal));
  saveActiveWorkspaceId(project.id);
  window.dispatchEvent(
    new CustomEvent('gantry:workspace-changed', { detail: { workspace_id: project.id } }),
  );
  return project.id;
}

/**
 * Resolve project_id for task submit — always tied to a workspace.
 * Explicit id (workspace switch) wins; else active workspace; else create greenfield.
 */
export async function resolveSubmitProjectId(
  explicitProjectId: string | null | undefined,
  goal: string,
): Promise<string> {
  if (explicitProjectId) {
    try {
      await gantryClient.getWorkspace(explicitProjectId);
      saveActiveWorkspaceId(explicitProjectId);
      return explicitProjectId;
    } catch {
      /* fall through */
    }
  }
  return ensureActiveWorkspace(goal);
}
