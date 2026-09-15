import { create } from 'zustand';
import {
  Workspace,
  WorkspaceCreate,
  WorkspaceUpdate,
  Discussion,
} from '@/shared/types';
import { api } from '@/shared/services/api';
import { clearActiveWorkspaceIfDeleted } from './workspaceDelete';

interface WorkspaceCatalogState {
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
}

interface WorkspaceCatalogActions {
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (data: WorkspaceCreate) => Promise<Workspace>;
  updateWorkspace: (id: string, data: WorkspaceUpdate) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  getWorkspaceDiscussions: (id: string) => Promise<Discussion[]>;
  getWorkspaceById: (id: string) => Workspace | undefined;
  clearError: () => void;
  reset: () => void;
}

type WorkspaceCatalogStore = WorkspaceCatalogState & WorkspaceCatalogActions;

export const useWorkspaceCatalogStore = create<WorkspaceCatalogStore>((set, get) => ({
  workspaces: [],
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await api.getWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createWorkspace: async (data: WorkspaceCreate) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await api.createWorkspace(data);
      set(state => ({ workspaces: [workspace, ...state.workspaces], isLoading: false }));
      return workspace;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateWorkspace: async (id: string, data: WorkspaceUpdate) => {
    try {
      const updated = await api.updateWorkspace(id, data);
      set(state => ({
        workspaces: state.workspaces.map(w => (w.id === id ? updated : w)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteWorkspace: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteWorkspace(id);
      clearActiveWorkspaceIfDeleted(id);
      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  getWorkspaceDiscussions: async (id: string) => {
    return api.getWorkspaceDiscussions(id);
  },

  getWorkspaceById: (id: string) => get().workspaces.find(w => w.id === id),

  clearError: () => set({ error: null }),

  reset: () => set({ workspaces: [], isLoading: false, error: null }),
}));

/** @deprecated Use useWorkspaceCatalogStore */
export const useProjectStore = useWorkspaceCatalogStore;
