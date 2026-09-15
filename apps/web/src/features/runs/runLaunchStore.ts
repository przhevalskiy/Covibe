import { create } from 'zustand';

interface RunLaunchState {
  pendingTaskId: string | null;
  ideRevealed: boolean;
  setPendingTask: (taskId: string) => void;
  revealIde: () => void;
  reset: () => void;
}

export const useRunLaunchStore = create<RunLaunchState>((set) => ({
  pendingTaskId: null,
  ideRevealed: false,
  setPendingTask: (taskId) => set({ pendingTaskId: taskId, ideRevealed: false }),
  revealIde: () => set({ ideRevealed: true }),
  reset: () => set({ pendingTaskId: null, ideRevealed: false }),
}));
