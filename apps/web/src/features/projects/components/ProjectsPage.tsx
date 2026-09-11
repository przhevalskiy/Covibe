import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { projectRepoHint, projectRepoLabel } from '@/shared/constants/requestTypes';
import type { Workspace } from '@/shared/types';
import { useWorkspaceCatalogStore } from '../store';
import { CreateWorkspaceModal } from './CreateProjectModal';
import './ProjectsPage.css';

export function WorkspacesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces, isLoading, fetchWorkspaces } = useWorkspaceCatalogStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [fetchWorkspaces, user]);

  const topLevel = useMemo(
    () => workspaces.filter(w => !w.parent_workspace_id && !w.parent_project_id),
    [workspaces],
  );

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
              onOpen={id => navigate(`/workspaces/${id}`)}
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

function WorkspaceCard({ workspace, onOpen }: { workspace: Workspace; onOpen: (id: string) => void }) {
  return (
    <div className="project-card" onClick={() => onOpen(workspace.id)} role="button" tabIndex={0}>
      <div className="project-card-icon"><FolderKanban size={20} /></div>
      <div className="project-card-body">
        <h3 className="project-card-name">{workspace.name}</h3>
        {workspace.instructions && (
          <p className="project-card-instructions">{workspace.instructions}</p>
        )}
        <span className="project-card-type">{projectRepoLabel(workspace)}</span>
      </div>
    </div>
  );
}
