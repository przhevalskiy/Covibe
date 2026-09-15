import type { Project } from '@/shared/types';
import type { AgentFileEntry } from './swarmUtils';
import { IdeExplorerProvider } from './IdeExplorerProvider';
import { useIdeExplorer } from './ideExplorerState';
import { IdeEditorPane, IdeExplorerToolbar, IdeFileTree } from './IdeFileTree';
import './IdeFileExplorer.css';

export type IdeFileExplorerProps = {
  project: Project;
  isRunning?: boolean;
  taskStatus?: string;
  buildBranch?: string | null;
  writtenPaths?: string[];
  agentOnFile?: Map<string, AgentFileEntry>;
  editable?: boolean;
  layout?: 'split' | 'stack';
};

function IdeFrozenBanner() {
  const { frozen, taskStatus } = useIdeExplorer();
  if (!frozen) return null;
  return <div className="ide-frozen-banner">Run {taskStatus.toLowerCase()} — files preserved</div>;
}

export function IdeFileExplorer({
  project,
  isRunning = false,
  taskStatus = 'running',
  buildBranch = null,
  writtenPaths = [],
  agentOnFile = new Map(),
  editable = true,
  layout = 'split',
}: IdeFileExplorerProps) {
  return (
    <IdeExplorerProvider
      project={project}
      isRunning={isRunning}
      taskStatus={taskStatus}
      buildBranch={buildBranch}
      writtenPaths={writtenPaths}
      agentOnFile={agentOnFile}
      editable={editable}
    >
      <div className={`ide-explorer layout-${layout}`}>
        <IdeExplorerToolbar />
        <IdeFrozenBanner />
        <div className="ide-explorer-body">
          <div className="ide-tree-pane">
            <IdeFileTree />
          </div>
          <IdeEditorPane />
        </div>
      </div>
    </IdeExplorerProvider>
  );
}
