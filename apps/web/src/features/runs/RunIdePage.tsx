import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import {
  CrewPanel,
  IdeFileExplorer,
  PreviewPane,
  RunActivityFeed,
  TracesPanel,
  extractAgentOnFiles,
  extractDevUrl,
  extractGoalFromMessages,
  extractHitlFromMessages,
  extractWrittenPaths,
  parsePipelineMeta,
  parsePipelineStages,
} from '@/features/ide';
import { playbookLabel, runSizeLabel } from '@/shared/constants/runConfig';
import { resolveTaskBranch, resolveTaskPrUrl } from '@/shared/gantry/taskResult';
import { isTerminalStatus } from '@/shared/gantry/runStreamMessages';
import { useTaskRunStream } from '@/shared/hooks/useTaskRunStream';
import { useWorkspaceStore } from '@/features/workspace';
import { gantryClient } from '@/shared/services/gantry/client';
import { toUiWorkspace } from '@/shared/services/gantry/projectMapper';
import type { Workspace } from '@/shared/types';
import { RunComposePanel } from './RunComposePanel';
import './RunDetailPage.css';

const LEFT_TAB_KEY = 'gantry_run_left_tab';
const RIGHT_TAB_KEY = 'gantry_run_right_tab';

type LeftTab = 'explorer' | 'preview';
type RightTab = 'compose' | 'activity' | 'crew' | 'traces';

export function RunIdePage() {
  const { taskId: routeTaskId } = useParams<{ taskId: string }>();
  const isCompose = !routeTaskId || routeTaskId === 'new';
  const taskId = isCompose ? undefined : routeTaskId;

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [composeProject, setComposeProject] = useState<Workspace | null>(null);

  const { task, project: runProject, messages, error, streamLive, refresh } =
    useTaskRunStream(taskId);

  const project = isCompose ? composeProject : runProject;

  const [leftTab, setLeftTab] = useState<LeftTab>(() => {
    const saved = localStorage.getItem(LEFT_TAB_KEY);
    return saved === 'preview' ? 'preview' : 'explorer';
  });
  const [rightTab, setRightTab] = useState<RightTab>(() =>
    isCompose ? 'compose' : 'activity',
  );
  const [manualPreviewUrl, setManualPreviewUrl] = useState('');
  const previewAutoSwitchedRef = useRef(false);

  useEffect(() => {
    if (!isCompose || !activeWorkspaceId) {
      setComposeProject(null);
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
  }, [isCompose, activeWorkspaceId]);

  useEffect(() => {
    if (isCompose) {
      setRightTab('compose');
    } else {
      setRightTab('activity');
      previewAutoSwitchedRef.current = false;
    }
  }, [isCompose, taskId]);

  const selectLeftTab = (tab: LeftTab) => {
    setLeftTab(tab);
    localStorage.setItem(LEFT_TAB_KEY, tab);
  };

  const selectRightTab = (tab: RightTab) => {
    setRightTab(tab);
    localStorage.setItem(RIGHT_TAB_KEY, tab);
  };

  const status = task?.status ?? (isCompose ? 'compose' : 'running');
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
    () => (isCompose ? null : extractGoalFromMessages(messages)),
    [isCompose, messages],
  );
  const messageHitl = useMemo(() => extractHitlFromMessages(messages), [messages]);
  const prUrl = resolveTaskPrUrl(task);
  const detectedPreviewUrl = useMemo(() => extractDevUrl(messages), [messages]);
  const activePreviewUrl = manualPreviewUrl.trim() || detectedPreviewUrl || '';
  const tierLabel = task?.tier != null && task.tier >= 0 ? runSizeLabel(task.tier) : null;
  const effectivelyDone = task ? !isRunning || !!pipelineMeta.finalReport : false;

  useEffect(() => {
    if (isCompose || !detectedPreviewUrl || previewAutoSwitchedRef.current) return;
    previewAutoSwitchedRef.current = true;
    selectLeftTab('preview');
  }, [isCompose, detectedPreviewUrl]);

  const headerTitle = isCompose
    ? 'New run'
    : goal || 'Factory run';

  return (
    <div className="run-ide">
      <header className="run-ide-header">
        <Link to="/runs" className="run-ide-back">
          <ArrowLeft size={16} /> Runs
        </Link>
        <div className="run-ide-title-wrap">
          <h1>{headerTitle}</h1>
          {taskId && <code>{taskId.slice(0, 8)}</code>}
          {isCompose && project && (
            <span className="run-chip">{project.name}</span>
          )}
        </div>
        <div className="run-ide-header-meta">
          {!isCompose && (isRunning || streamLive) && (
            <Loader2 size={14} className="spinning" />
          )}
          {!isCompose && (
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
          )}
        </div>
      </header>

      {error && <p className="run-detail-error">{error}</p>}

      <div className="run-ide-split">
        <section className="run-ide-left">
          <div className="run-ide-left-tabs">
            <button
              type="button"
              className={leftTab === 'explorer' ? 'active' : ''}
              onClick={() => selectLeftTab('explorer')}
            >
              Explorer
            </button>
            <button
              type="button"
              className={leftTab === 'preview' ? 'active' : ''}
              onClick={() => selectLeftTab('preview')}
              disabled={isCompose && !project}
            >
              Preview
              {activePreviewUrl && <span className="run-ide-tab-dot" />}
            </button>
          </div>

          <div className="run-ide-left-panel">
            {leftTab === 'explorer' ? (
              project ? (
                <IdeFileExplorer
                  project={project}
                  isRunning={isRunning}
                  taskStatus={task?.status ?? 'compose'}
                  buildBranch={buildBranch}
                  writtenPaths={writtenPaths}
                  agentOnFile={agentOnFile}
                  editable={false}
                  layout="split"
                />
              ) : (
                <div className="run-ide-placeholder">
                  {isCompose ? (
                    <>
                      <p>Workspace files appear here once you have an active workspace.</p>
                      <p className="run-ide-placeholder-hint">
                        A workspace is created automatically when you start your first run.
                      </p>
                    </>
                  ) : (
                    <div className="run-ide-loading">
                      {task ? 'Loading workspace…' : <Loader2 size={20} className="spinning" />}
                    </div>
                  )}
                </div>
              )
            ) : (
              <PreviewPane
                url={detectedPreviewUrl ?? ''}
                manualUrl={manualPreviewUrl}
                onUrlChange={setManualPreviewUrl}
              />
            )}
          </div>
        </section>

        <section className="run-ide-right">
          <div className="run-ide-right-tabs">
            {isCompose ? (
              <button type="button" className="active">
                Compose
              </button>
            ) : (
              ([
                ['activity', 'Activity'],
                ['crew', 'Crew'],
                ['traces', 'Traces'],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  className={rightTab === tab ? 'active' : ''}
                  onClick={() => selectRightTab(tab)}
                >
                  {label}
                </button>
              ))
            )}
          </div>

          <div className="run-ide-right-panel">
            {isCompose ? (
              <RunComposePanel workspace={project} />
            ) : (
              <>
                {rightTab === 'activity' && taskId && (
                  <RunActivityFeed
                    messages={messages}
                    pendingHitl={task?.pending_hitl ?? []}
                    messageHitl={messageHitl}
                    onHitlResolved={() => void refresh()}
                    onFollowUpSent={() => void refresh()}
                    onTerminated={() => void refresh()}
                    taskId={taskId}
                    status={status}
                    effectivelyDone={effectivelyDone}
                  />
                )}
                {rightTab === 'crew' && (
                  <CrewPanel
                    stages={stages}
                    pipelineMeta={pipelineMeta}
                    prUrl={prUrl}
                    tierLabel={tierLabel}
                  />
                )}
                {rightTab === 'traces' && taskId && <TracesPanel taskId={taskId} />}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
