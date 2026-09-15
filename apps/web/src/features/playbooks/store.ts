import { useMemo } from 'react';
import { create } from 'zustand';
import type { Playbook, PlaybookCreate } from '@/shared/types';
import { gantryClient } from '@/shared/services/gantry/client';

export type PlaybookOption = {
  id: string;
  slug: string;
  label: string;
  hint: string;
  is_system?: boolean;
};

interface PlaybookState {
  playbooks: Playbook[];
  isLoading: boolean;
  error: string | null;
}

interface PlaybookActions {
  fetchPlaybooks: (workspaceId?: string) => Promise<void>;
  createPlaybook: (data: PlaybookCreate) => Promise<Playbook>;
  deletePlaybook: (id: string) => Promise<void>;
  getBySlug: (slug: string) => Playbook | undefined;
  asOptions: () => PlaybookOption[];
  labelFor: (slugOrId: string | null | undefined) => string;
  hintFor: (slugOrId: string | null | undefined) => string | undefined;
}

const GENERAL_OPTION: PlaybookOption = {
  id: '',
  slug: '',
  label: 'General',
  hint: 'No skill preset — tier and pipeline defaults only.',
};

function toOption(row: Playbook): PlaybookOption {
  const cfg = row.config ?? {};
  const tracks = cfg.pipeline?.max_parallel_tracks ?? 1;
  const hint =
    row.description?.trim() ||
    `Tier ${cfg.tier_default ?? 1} default · ${tracks} track(s) · branch: ${cfg.branch_prefix ?? 'swarm'}`;
  return {
    id: row.slug,
    slug: row.slug,
    label: row.label,
    hint,
    is_system: row.is_system,
  };
}

type PlaybookStore = PlaybookState & PlaybookActions;

export const usePlaybookStore = create<PlaybookStore>((set, get) => ({
  playbooks: [],
  isLoading: false,
  error: null,

  fetchPlaybooks: async (workspaceId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const playbooks = await gantryClient.listPlaybooks(workspaceId);
      set({ playbooks, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createPlaybook: async (data: PlaybookCreate) => {
    const playbook = await gantryClient.createPlaybook(data);
    set(state => ({ playbooks: [playbook, ...state.playbooks] }));
    return playbook;
  },

  deletePlaybook: async (id: string) => {
    await gantryClient.deletePlaybook(id);
    set(state => ({
      playbooks: state.playbooks.filter(p => p.id !== id && p.slug !== id),
    }));
  },

  getBySlug: (slug: string) =>
    get().playbooks.find(p => p.slug === slug || p.id === slug),

  asOptions: () => [GENERAL_OPTION, ...get().playbooks.map(toOption)],

  labelFor: (slugOrId) => {
    if (!slugOrId) return GENERAL_OPTION.label;
    const row = get().getBySlug(slugOrId);
    return row?.label ?? slugOrId;
  },

  hintFor: (slugOrId) => {
    if (!slugOrId) return GENERAL_OPTION.hint;
    const row = get().getBySlug(slugOrId);
    return row ? toOption(row).hint : undefined;
  },
}));

/** Stable playbook options for selectors — avoids re-render loops from asOptions(). */
export function usePlaybookOptions(): PlaybookOption[] {
  const playbooks = usePlaybookStore((s) => s.playbooks);
  return useMemo(
    () => [GENERAL_OPTION, ...playbooks.map(toOption)],
    [playbooks],
  );
}
