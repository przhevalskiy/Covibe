import { create } from 'zustand';
import {
  createGreenfieldWorkspace,
  loadActiveWorkspaceId,
  saveActiveWorkspaceId,
} from '@/shared/services/gantry/greenfieldWorkspace';
import { gantryClient } from '@/shared/services/gantry/client';

interface WorkspaceState {
  activeWorkspaceId: string | null;
}

interface WorkspaceActions {
  hydrate: () => void;
  setActiveWorkspace: (id: string | null) => void;
  createAndActivate: (name: string) => Promise<string>;
  validateActive: () => Promise<void>;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeWorkspaceId: loadActiveWorkspaceId(),

  hydrate: () => set({ activeWorkspaceId: loadActiveWorkspaceId() }),

  setActiveWorkspace: (id) => {
    saveActiveWorkspaceId(id);
    set({ activeWorkspaceId: id });
    window.dispatchEvent(
      new CustomEvent('gantry:workspace-changed', { detail: { workspace_id: id } }),
    );
  },

  createAndActivate: async (name: string) => {
    const project = await createGreenfieldWorkspace(name);
    get().setActiveWorkspace(project.id);
    return project.id;
  },

  validateActive: async () => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    try {
      await gantryClient.getWorkspace(id);
    } catch {
      get().setActiveWorkspace(null);
    }
  },
}));

/** Client-side filter — tasks for the active workspace. */
export function tasksForWorkspace<T extends { project_id?: string | null }>(
  tasks: T[],
  workspaceId: string | null,
): T[] {
  if (!workspaceId) return tasks;
  return tasks.filter(t => t.project_id === workspaceId);
}
