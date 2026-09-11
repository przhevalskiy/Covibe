import { create } from 'zustand';
import {
  getPipelineDefaults,
  savePipelineDefaults,
  type PipelineDefaults,
} from '@/shared/services/gantry/pipelineDefaults';

export type SpecAttachment = {
  id: string;
  filename: string;
  text: string;
  /** Server artifact id once uploaded to workspace. */
  artifactId?: string | null;
};

interface RunComposeState {
  projectId: string | null;
  specs: SpecAttachment[];
  tier: number;
  playbook: string;
}

interface RunComposeActions {
  hydrateFromDefaults: () => void;
  setProjectId: (projectId: string | null) => void;
  addSpec: (filename: string, text: string, artifactId?: string | null) => void;
  removeSpec: (id: string) => void;
  setSpecArtifactId: (id: string, artifactId: string) => void;
  clearSpecs: () => void;
  setTier: (tier: number) => void;
  setPlaybook: (playbook: string) => void;
  applyProfile: (patch: Partial<Pick<PipelineDefaults, 'tier' | 'playbook'>>) => void;
  reset: () => void;
}

type RunComposeStore = RunComposeState & RunComposeActions;

function readDefaults(): Pick<RunComposeState, 'tier' | 'playbook'> {
  const d = getPipelineDefaults();
  return { tier: d.tier, playbook: d.playbook };
}

export const useRunComposeStore = create<RunComposeStore>((set, get) => ({
  projectId: null,
  specs: [],
  ...readDefaults(),

  hydrateFromDefaults: () => set(readDefaults()),

  setProjectId: (projectId) => set({ projectId }),

  addSpec: (filename, text, artifactId = null) =>
    set((state) => ({
      specs: [
        ...state.specs,
        { id: crypto.randomUUID(), filename, text, artifactId },
      ],
    })),

  setSpecArtifactId: (id: string, artifactId: string) =>
    set((state) => ({
      specs: state.specs.map((s) => (s.id === id ? { ...s, artifactId } : s)),
    })),

  removeSpec: (id) =>
    set((state) => ({ specs: state.specs.filter((s) => s.id !== id) })),

  clearSpecs: () => set({ specs: [] }),

  setTier: (tier) => {
    savePipelineDefaults({ ...getPipelineDefaults(), tier, playbook: get().playbook, disable_agents: getPipelineDefaults().disable_agents });
    set({ tier });
  },

  setPlaybook: (playbook) => {
    savePipelineDefaults({ ...getPipelineDefaults(), playbook, tier: get().tier, disable_agents: getPipelineDefaults().disable_agents });
    set({ playbook });
  },

  applyProfile: (patch) => {
    const current = getPipelineDefaults();
    const next = { ...current, ...patch };
    savePipelineDefaults(next);
    set({ tier: next.tier, playbook: next.playbook });
  },

  reset: () => set({ projectId: null, specs: [], ...readDefaults() }),
}));
