import { useWorkspaceStore } from '@/features/workspace';

export function confirmDeleteWorkspace(name: string): boolean {
  return window.confirm(
    `Delete workspace "${name}"?\n\nThis removes it from your catalog. Runs already started are kept.`,
  );
}

export function clearActiveWorkspaceIfDeleted(id: string): void {
  if (useWorkspaceStore.getState().activeWorkspaceId === id) {
    useWorkspaceStore.getState().setActiveWorkspace(null);
  }
}
