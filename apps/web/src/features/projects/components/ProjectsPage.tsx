import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { projectRepoLabel } from '@/shared/constants/requestTypes';
import type { Workspace } from '@/shared/types';
import { useWorkspaceCatalogStore } from '../store';
import { confirmDeleteWorkspace } from '../workspaceDelete';
import { CreateWorkspaceModal } from './CreateProjectModal';
import './ProjectsPage.css';

export function WorkspacesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces, isLoading, fetchWorkspaces, deleteWorkspace } = useWorkspaceCatalogStore();
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [fetchWorkspaces, user]);

  const topLevel = useMemo(
    () => workspaces.filter(w => !w.parent_workspace_id && !w.parent_project_id),
    [workspaces],
  );

  const handleDelete = async (workspace: Workspace) => {
    if (!confirmDeleteWorkspace(workspace.name)) return;
    setDeletingId(workspace.id);
    try {
      await deleteWorkspace(workspace.id);
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Workspaces</h1>
          <p className="projects-subtitle">
            Project containers for your runs — greenfield by default. Link GitHub later if you want PRs on an existing repo.
          </p>
        </div>
        <button className="projects-new-btn" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New workspace</span>
        </button>
      </div>

      {isLoading && workspaces.length === 0 ? (
        <div className="projects-loading"><div className="spinner" /></div>
      ) : workspaces.length === 0 ? (
        <div className="projects-empty">
          <div className="projects-empty-icon"><FolderKanban size={32} /></div>
          <h2>No workspaces yet</h2>
          <p>Start a run — a workspace is created automatically — or add one here.</p>
          <button className="projects-new-btn" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            <span>New workspace</span>
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {topLevel.map(workspace => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              deleting={deletingId === workspace.id}
              onOpen={id => navigate(`/workspaces/${id}`)}
              onDelete={() => void handleDelete(workspace)}
            />
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={w => navigate(`/workspaces/${w.id}`)}
      />
    </div>
  );
}

function WorkspaceCard({
  workspace,
  deleting,
  onOpen,
  onDelete,
}: {
  workspace: Workspace;
  deleting?: boolean;
  onOpen: (id: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="project-card"
      onClick={() => onOpen(workspace.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(workspace.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="project-card-icon"><FolderKanban size={20} /></div>
      <div className="project-card-body">
        <h3 className="project-card-name">{workspace.name}</h3>
        {workspace.instructions && (
          <p className="project-card-instructions">{workspace.instructions}</p>
        )}
        <span className="project-card-type">{projectRepoLabel(workspace)}</span>
      </div>
      <button
        type="button"
        className="project-card-delete"
        title="Delete workspace"
        disabled={deleting}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
