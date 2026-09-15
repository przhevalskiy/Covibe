import { useEffect, useState } from 'react';
import { useWorkspaceCatalogStore } from '@/features/projects';
import { useWorkspaceStore } from '@/features/workspace';
import { gantryClient } from '@/shared/services/gantry/client';
import { toUiWorkspace } from '@/shared/services/gantry/projectMapper';
import type { Workspace } from '@/shared/types';
import {
  composeGoalStripLabel,
  getComposeGoalContext,
  moreGoalSectionsForContext,
  primaryGoalSectionsForContext,
  type ComposeGoalContext,
} from './composeGoalSections';

export function useComposeWorkspace() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceRevision = useWorkspaceStore((s) => s.workspaceRevision);
  const workspaces = useWorkspaceCatalogStore((s) => s.workspaces);
  const fetchWorkspaces = useWorkspaceCatalogStore((s) => s.fetchWorkspaces);
  const [fetchedWorkspace, setFetchedWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (workspaces.length === 0) void fetchWorkspaces();
  }, [fetchWorkspaces, workspaces.length]);

  useEffect(() => {
    const onWorkspaceChanged = () => {
      void fetchWorkspaces();
    };
    window.addEventListener('gantry:workspace-changed', onWorkspaceChanged);
    return () => window.removeEventListener('gantry:workspace-changed', onWorkspaceChanged);
  }, [fetchWorkspaces]);

  useEffect(() => {
    setFetchedWorkspace(null);

    if (!activeWorkspaceId) return;
    if (workspaces.some((workspace) => workspace.id === activeWorkspaceId)) return;

    let cancelled = false;
    void gantryClient
      .getWorkspace(activeWorkspaceId)
      .then((row) => {
        if (!cancelled) setFetchedWorkspace(toUiWorkspace(row));
      })
      .catch(() => {
        if (!cancelled) setFetchedWorkspace(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, workspaceRevision, workspaces]);

  const workspace =
    activeWorkspaceId == null
      ? null
      : workspaces.find((item) => item.id === activeWorkspaceId) ??
        (fetchedWorkspace?.id === activeWorkspaceId ? fetchedWorkspace : null);

  const context: ComposeGoalContext = getComposeGoalContext(activeWorkspaceId, workspace);

  return {
    activeWorkspaceId,
    workspaceRevision,
    workspace,
    context,
    label: composeGoalStripLabel(context),
    primarySections: primaryGoalSectionsForContext(context),
    moreSections: moreGoalSectionsForContext(context),
  };
}
