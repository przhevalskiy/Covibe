import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import {
  AgentRail,
  IdeEditorPane,
  IdeExplorerProvider,
  IdeFileTree,
  PreviewPane,
  extractAgentOnFiles,
  extractDevUrl,
  extractGoalFromMessages,
  extractHitlFromMessages,
  extractWrittenPaths,
  parsePipelineMeta,
  parsePipelineStages,
} from '@/features/ide';
import { useChatStore } from '@/features/chat';
import { playbookLabel, runSizeLabel } from '@/shared/constants/runConfig';
import { resolveTaskBranch, resolveTaskPrUrl } from '@/shared/gantry/taskResult';
import { isTerminalStatus } from '@/shared/gantry/runStreamMessages';
import { useTaskRunStream } from '@/shared/hooks/useTaskRunStream';
import { useWorkspaceStore } from '@/features/workspace';
import { gantryClient } from '@/shared/services/gantry/client';
import { toUiWorkspace } from '@/shared/services/gantry/projectMapper';
import type { Workspace } from '@/shared/types';
import { RunComposePanel } from './RunComposePanel';
import { useRunLaunchStore } from './runLaunchStore';
import './RunDetailPage.css';

const CENTER_TAB_KEY = 'gantry_run_center_tab';
const RAIL_DRAWER_KEY = 'gantry_agent_rail_drawer';

type CenterTab = 'files' | 'preview';

const PRE_TASK_STATUSES = new Set(['queued', 'pending', 'unknown', 'compose']);

export function RunIdePage() {
  const navigate = useNavigate();
  const { taskId: routeTaskId } = useParams<{ taskId: string }>();
  const isComposeRoute = !routeTaskId || routeTaskId === 'new';
  const pendingTaskId = useRunLaunchStore((s) => s.pendingTaskId);
  const ideRevealed = useRunLaunchStore((s) => s.ideRevealed);
  const revealIde = useRunLaunchStore((s) => s.revealIde);
  const resetLaunch = useRunLaunchStore((s) => s.reset);
  const isSubmitted = useChatStore((s) => s.isSubmitted);

  const streamTaskId = isComposeRoute ? pendingTaskId ?? undefined : routeTaskId;
  const showComposeOnly = isComposeRoute && !ideRevealed;

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [composeProject, setComposeProject] = useState<Workspace | null>(null);

  const { task, project: runProject, messages, error, streamLive, refresh } =
    useTaskRunStream(streamTaskId);

  const project = isComposeRoute ? composeProject : runProject;
  const taskId = streamTaskId;

  const [centerTab, setCenterTab] = useState<CenterTab>(() => {
    const saved = localStorage.getItem(CENTER_TAB_KEY);
    return saved === 'preview' ? 'preview' : 'files';
  });
  const [drawerMode, setDrawerMode] = useState(() =>
    localStorage.getItem(RAIL_DRAWER_KEY) === 'true',
  );
  const [manualPreviewUrl, setManualPreviewUrl] = useState('');
  const previewAutoSwitchedRef = useRef(false);

  useEffect(() => {
    if (!isComposeRoute && routeTaskId) {
      resetLaunch();
    }
  }, [isComposeRoute, routeTaskId, resetLaunch]);

  useEffect(() => {
    if (isComposeRoute && !pendingTaskId) {
      resetLaunch();
    }
  }, [isComposeRoute, pendingTaskId, resetLaunch]);

  useEffect(() => {
    if (!isComposeRoute || !activeWorkspaceId) {
      if (isComposeRoute) setComposeProject(null);
      return;
    }
    let cancelled = false;
    void gantryClient
      .getWorkspace(activeWorkspaceId)
      .then((row) => {
        if (!cancelled) setComposeProject(toUiWorkspace(row));
      })
      .catch(() => {
        if (!cancelled) setComposeProject(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isComposeRoute, activeWorkspaceId]);

  useEffect(() => {
    if (showComposeOnly) return;
    previewAutoSwitchedRef.current = false;
  }, [showComposeOnly, taskId]);

  useEffect(() => {
    if (!isComposeRoute || ideRevealed || !pendingTaskId || !isSubmitted) return;

    const status = task?.status?.toLowerCase() ?? '';
    const tasked =
      messages.length > 0 ||
      (status.length > 0 && !PRE_TASK_STATUSES.has(status));

    if (!tasked) return;

    revealIde();
    const timer = window.setTimeout(() => {
      navigate(`/runs/${pendingTaskId}`, { replace: true });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [
    isComposeRoute,
    ideRevealed,
    pendingTaskId,
    isSubmitted,
    messages.length,
    task?.status,
    revealIde,
    navigate,
  ]);

  const selectCenterTab = (tab: CenterTab) => {
    setCenterTab(tab);
    localStorage.setItem(CENTER_TAB_KEY, tab);
  };

  const status = task?.status ?? (showComposeOnly ? 'compose' : 'running');
  const isRunning = task ? !isTerminalStatus(task.status) : false;
  const buildBranch = resolveTaskBranch(task);
  const repoRoot = project?.repo_path ?? '';
  const writtenPaths = useMemo(
    () => extractWrittenPaths(messages, repoRoot),
    [messages, repoRoot],
  );
  const agentOnFile = useMemo(
    () => extractAgentOnFiles(messages, repoRoot),
    [messages, repoRoot],
  );
  const stages = useMemo(
    () => parsePipelineStages(messages, task?.status ?? 'running'),
    [messages, task?.status],
  );
  const pipelineMeta = useMemo(() => parsePipelineMeta(messages), [messages]);
  const goal = useMemo(
    () => (showComposeOnly ? null : extractGoalFromMessages(messages)),
    [showComposeOnly, messages],
  );
  const messageHitl = useMemo(() => extractHitlFromMessages(messages), [messages]);
  const prUrl = resolveTaskPrUrl(task);
  const detectedPreviewUrl = useMemo(() => extractDevUrl(messages), [messages]);
  const activePreviewUrl = manualPreviewUrl.trim() || detectedPreviewUrl || '';
  const tierLabel = task?.tier != null && task.tier >= 0 ? runSizeLabel(task.tier) : null;
  const effectivelyDone = task ? !isRunning || !!pipelineMeta.finalReport : false;

  useEffect(() => {
    if (showComposeOnly || !detectedPreviewUrl || previewAutoSwitchedRef.current) return;
    previewAutoSwitchedRef.current = true;
    selectCenterTab('preview');
  }, [showComposeOnly, detectedPreviewUrl]);

  const headerTitle = showComposeOnly
    ? 'New run'
    : goal || 'Factory run';

  const workspaceBody = project ? (
    <IdeExplorerProvider
      project={project}
      isRunning={isRunning}
      taskStatus={task?.status ?? 'running'}
      buildBranch={buildBranch}
      writtenPaths={writtenPaths}
      agentOnFile={agentOnFile}
      editable={false}
    >
      <div className={`run-ide-workspace ${drawerMode ? 'run-ide-workspace--drawer' : ''} ${ideRevealed ? 'run-ide-workspace--enter' : ''}`}>
        <section className="run-ide-files">
          <IdeFileTree showToolbar />
        </section>

        <section className="run-ide-center">
          <div className="run-ide-center-tabs">
            <button
              type="button"
              className={centerTab === 'files' ? 'active' : ''}
              onClick={() => selectCenterTab('files')}
            >
              Editor
            </button>
            <button
              type="button"
              className={centerTab === 'preview' ? 'active' : ''}
              onClick={() => selectCenterTab('preview')}
              disabled={!project}
            >
              Preview
              {activePreviewUrl && <span className="run-ide-tab-dot" />}
            </button>
          </div>
          <div className="run-ide-center-panel">
            {centerTab === 'files' ? (
              <IdeEditorPane />
            ) : (
              <PreviewPane
                url={detectedPreviewUrl ?? ''}
                manualUrl={manualPreviewUrl}
                onUrlChange={setManualPreviewUrl}
              />
            )}
          </div>
        </section>

        {taskId && (
          <AgentRail
            taskId={taskId}
            messages={messages}
            status={status}
            effectivelyDone={effectivelyDone}
            pendingHitl={task?.pending_hitl ?? []}
            messageHitl={messageHitl}
            onFollowUpSent={() => void refresh()}
            onTerminated={() => void refresh()}
            onDrawerModeChange={setDrawerMode}
            stages={stages}
            pipelineMeta={pipelineMeta}
            prUrl={prUrl}
            tierLabel={tierLabel}
          />
        )}
      </div>
    </IdeExplorerProvider>
  ) : (
    <div className="run-ide-placeholder">
      <div className="run-ide-loading">
        {task ? 'Loading workspace…' : <Loader2 size={20} className="spinning" />}
      </div>
    </div>
  );

  return (
    <div className={`run-ide ${showComposeOnly ? 'run-ide--compose-first' : ''} ${ideRevealed ? 'run-ide--revealed' : ''}`}>
      {!showComposeOnly && (
        <header className="run-ide-header">
          <Link to="/runs" className="run-ide-back">
            <ArrowLeft size={16} /> Runs
          </Link>
          <div className="run-ide-title-wrap">
            <h1>{headerTitle}</h1>
            {taskId && <code>{taskId.slice(0, 8)}</code>}
          </div>
          <div className="run-ide-header-meta">
            {(isRunning || streamLive) && (
              <Loader2 size={14} className="spinning" />
            )}
            <>
              <span className={`run-status run-status-${status.toLowerCase()}`}>{status}</span>
              {streamLive && <span className="run-chip">Live</span>}
              {task?.tier != null && task.tier >= 0 && (
                <span className="run-chip">{runSizeLabel(task.tier)}</span>
              )}
              {task?.playbook && (
                <span className="run-chip">{playbookLabel(task.playbook)}</span>
              )}
              {prUrl && (
                <a href={prUrl} target="_blank" rel="noopener noreferrer" className="run-pr-link">
                  PR <ExternalLink size={12} />
                </a>
              )}
            </>
          </div>
        </header>
      )}

      {error && !showComposeOnly && <p className="run-detail-error">{error}</p>}

      {showComposeOnly ? (
        <RunComposePanel workspace={project} layout="centered" />
      ) : (
        workspaceBody
      )}
    </div>
  );
}
