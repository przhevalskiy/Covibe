import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Pencil, FolderKanban, CalendarClock, PlayCircle } from 'lucide-react';
import type { Workspace } from '@/shared/types';
import { projectRepoHint, projectRepoLabel } from '@/shared/constants/requestTypes';
import { api } from '@/shared/services/api';
import { useWorkspaceStore, tasksForWorkspace } from '@/features/workspace';
import { useTaskList } from '@/shared/hooks/useTaskList';
import { useWorkspaceCatalogStore } from '../store';
import { CreateWorkspaceModal } from './CreateProjectModal';
import { ProjectFilesPanel } from './ProjectFilesPanel';
import { WorkspaceSkillsPanel } from '@/features/playbooks';
import './ProjectDetailPage.css';

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { getWorkspaceById } = useWorkspaceCatalogStore();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const { tasks, isLoading: tasksLoading } = useTaskList(true);
  const workspaceRuns = useMemo(
    () => (workspaceId ? tasksForWorkspace(tasks, workspaceId) : []),
    [tasks, workspaceId],
  );

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const cached = getWorkspaceById(workspaceId);
      const row = cached ?? (await api.getWorkspace(workspaceId));
      setWorkspace(row);
    } catch {
      setNotFound(true);
    }
  }, [workspaceId, getWorkspaceById]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    if (workspaceId) setActiveWorkspace(workspaceId);
  }, [workspaceId, setActiveWorkspace]);

  const handleStartRun = (message?: string) => {
    if (!workspaceId) return;
    const text = (message ?? taskInput).trim();
    setActiveWorkspace(workspaceId);
    navigate('/runs/new', text ? { state: { initialMessage: text } } : undefined);
  };

  if (notFound) {
    return (
      <div className="project-detail">
        <button className="pd-back" onClick={() => navigate('/workspaces')}>
          <ArrowLeft size={16} /> <span>All workspaces</span>
        </button>
        <p className="pd-missing">This workspace could not be found.</p>
      </div>
    );
  }

  if (!workspace) {
    return <div className="project-detail"><div className="projects-loading"><div className="spinner" /></div></div>;
  }

  return (
    <div className="project-detail">
      <button className="pd-back" onClick={() => navigate('/workspaces')}>
        <ArrowLeft size={16} /> <span>All workspaces</span>
      </button>

      <div className="pd-layout">
        <div className="pd-main">
          <div className="pd-header">
            <div className="pd-header-icon"><FolderKanban size={22} /></div>
            <div className="pd-header-text">
              <h1 className="pd-name">{workspace.name}</h1>
              <span className="pd-type-chip">{projectRepoLabel(workspace)}</span>
              <p className="pd-repo-hint">{projectRepoHint(workspace)}</p>
            </div>
            <button className="pd-edit-btn" onClick={() => setShowEdit(true)} title="Edit workspace">
              <Pencil size={16} />
            </button>
          </div>

          <form className="pd-task-input" onSubmit={e => { e.preventDefault(); handleStartRun(); }}>
            <input
              className="pd-task-field"
              placeholder="Describe what to build in this workspace…"
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
            />
            <button type="submit" className="pd-task-send" title="New run">
              <ArrowUp size={18} />
            </button>
          </form>

          <div className="pd-tasks">
            <h2 className="pd-section-title">Runs</h2>
            <p className="pd-section-hint">
              Multiple runs in this workspace coordinate toward the same project — each opens in the IDE with streaming and HITL.
            </p>
            {tasksLoading && workspaceRuns.length === 0 ? (
              <div className="projects-loading"><div className="spinner" /></div>
            ) : workspaceRuns.length === 0 ? (
              <p className="pd-tasks-empty">No runs yet — describe a build above.</p>
            ) : (
              <div className="pd-task-list">
                {workspaceRuns.map((run) => (
                  <button
                    key={run.task_id}
                    className="pd-task-item"
                    onClick={() => navigate(`/runs/${run.task_id}`)}
                  >
                    <PlayCircle size={15} className="pd-task-item-icon" />
                    <span className="pd-task-item-title">
                      {run.goal?.trim().slice(0, 60) || run.task_id}
                    </span>
                    <span className="pd-task-item-date">{run.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="pd-rail">
          <div className="pd-rail-card">
            <h3 className="pd-rail-title">Brief</h3>
            <p className="pd-rail-body">
              {workspace.instructions ||
                'No brief yet. Edit the workspace to add a theme or conventions for coordinating runs.'}
            </p>
          </div>

          <ProjectFilesPanel project={workspace} />

          {workspaceId && <WorkspaceSkillsPanel workspaceId={workspaceId} />}

          <div className="pd-rail-card pd-rail-disabled">
            <h3 className="pd-rail-title"><CalendarClock size={15} /> Scheduled runs</h3>
            <p className="pd-rail-body">Run on a schedule — coming soon.</p>
          </div>
        </aside>
      </div>

      <CreateWorkspaceModal isOpen={showEdit} onClose={() => setShowEdit(false)} workspace={workspace} />
    </div>
  );
}
