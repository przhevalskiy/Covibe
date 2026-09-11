import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, PlayCircle } from 'lucide-react';
import { useTaskList } from '@/shared/hooks/useTaskList';
import { runSizeLabel } from '@/shared/constants/runConfig';
import { resolveTaskPrUrl } from '@/shared/gantry/taskResult';
import { useWorkspaceStore, tasksForWorkspace } from '@/features/workspace';
import { useWorkspaceCatalogStore } from '@/features/projects';
import './RunsPage.css';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'terminated', 'timeout', 'canceled']);

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'waiting_approval') return 'Needs approval';
  if (s === 'running') return 'Running';
  if (s === 'queued') return 'Queued';
  if (TERMINAL.has(s)) return s.charAt(0).toUpperCase() + s.slice(1);
  return status;
}

export function RunsPage() {
  const { tasks, isLoading, error, refresh } = useTaskList(true);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { workspaces } = useWorkspaceCatalogStore();
  const [showAll, setShowAll] = useState(false);

  const visibleTasks = useMemo(() => {
    if (showAll || !activeWorkspaceId) return tasks;
    return tasksForWorkspace(tasks, activeWorkspaceId);
  }, [tasks, activeWorkspaceId, showAll]);

  const workspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div className="runs-page">
      <header className="runs-page-header">
        <div>
          <h1>Runs</h1>
          <p className="runs-page-subtitle">
            {workspace && !showAll
              ? `Runs in workspace “${workspace.name}” — open any run for the IDE, live stream, and HITL.`
              : 'All factory runs — each opens in the IDE with streaming activity and checkpoints.'}
          </p>
        </div>
        <div className="runs-page-header-actions">
          {activeWorkspaceId && (
            <button
              type="button"
              className="runs-page-refresh"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? 'Workspace only' : 'Show all'}
            </button>
          )}
          <button type="button" className="runs-page-refresh" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </header>

      {isLoading && tasks.length === 0 ? (
        <div className="runs-page-loading">
          <Loader2 size={24} className="spin" />
        </div>
      ) : error ? (
        <p className="runs-page-error">{error}</p>
      ) : visibleTasks.length === 0 ? (
        <div className="runs-page-empty">
          <PlayCircle size={32} />
          <h2>No runs yet</h2>
          <p>
            Describe a build on <Link to="/runs/new">New run</Link> — a workspace is created automatically.
          </p>
        </div>
      ) : (
        <ul className="runs-page-list">
          {visibleTasks.map((task) => {
            const running = !TERMINAL.has(task.status.toLowerCase());
            const tier =
              task.tier != null && task.tier >= 0 ? runSizeLabel(task.tier) : null;
            const prUrl = resolveTaskPrUrl(task);
            return (
              <li key={task.task_id}>
                <Link to={`/runs/${task.task_id}`} className="runs-page-row">
                  <span
                    className={`runs-page-status ${running ? 'running' : task.status.toLowerCase()}`}
                  >
                    {statusLabel(task.status)}
                  </span>
                  <span className="runs-page-goal">
                    {task.goal?.trim() || task.task_id}
                  </span>
                  <span className="runs-page-meta">
                    {tier && <span>{tier}</span>}
                    {prUrl && (
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="runs-page-pr"
                        onClick={(e) => e.stopPropagation()}
                      >
                        PR <ExternalLink size={12} />
                      </a>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
