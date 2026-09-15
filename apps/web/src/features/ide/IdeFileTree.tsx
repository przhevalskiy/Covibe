import { useState, type CSSProperties } from 'react';
import { FileText, FolderTree, RefreshCw, Save, X } from 'lucide-react';
import { AGENT_ROLE_COLORS, type SwarmRole } from '@/components/chibi/agentTheme';
import type { AgentFileEntry } from './swarmUtils';
import type { TreeNode } from './fileTree';
import { useIdeExplorer } from './ideExplorerState';
import { CodeEditor } from './CodeEditor';
import { CodeViewer } from './CodeViewer';
import './IdeFileExplorer.css';

function agentColor(entry: AgentFileEntry): string {
  const role = entry.role as SwarmRole;
  return AGENT_ROLE_COLORS[role] ?? AGENT_ROLE_COLORS.foreman;
}

function TreeRow({
  node,
  depth,
  activePath,
  agentOnFile,
  recentPaths,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  agentOnFile: Map<string, AgentFileEntry>;
  recentPaths: Set<string>;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const agent = agentOnFile.get(node.path);
  const isRecent = recentPaths.has(node.path);
  const active = activePath === node.path;

  if (node.isFile) {
    return (
      <button
        type="button"
        className={`ide-tree-row file ${active ? 'active' : ''} ${isRecent ? 'recent' : ''} ${agent ? 'agent-active' : ''}`}
        style={agent ? ({ '--agent-accent': agentColor(agent) } as CSSProperties) : undefined}
        onClick={() => onSelect(node.path)}
        title={agent ? `${agent.role} working here` : undefined}
      >
        <FileText size={12} />
        <span className="ide-tree-name">{node.name}</span>
        {agent && (
          <span className="ide-agent-badge" title={agent.role}>
            {agent.role.slice(0, 3)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="ide-tree-dir">
      <button
        type="button"
        className="ide-tree-row dir"
        style={{ paddingLeft: `${10 + depth * 12}px` }}
        onClick={() => setOpen(v => !v)}
      >
        <FolderTree size={12} />
        <span>{node.name}</span>
        <span className="ide-tree-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && node.children.map(child => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          activePath={activePath}
          agentOnFile={agentOnFile}
          recentPaths={recentPaths}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function IdeExplorerToolbar() {
  const { source, buildBranch, isRunning, frozen, loading, refreshTree } = useIdeExplorer();
  return (
    <div className="ide-explorer-toolbar">
      <div>
        <strong>Explorer</strong>
        <span className="ide-explorer-source">
          {source === 'github' ? `GitHub · ${buildBranch}` : 'Workspace'}
          {isRunning && !frozen && ' · live'}
        </span>
      </div>
      <button type="button" className="ide-icon-btn" onClick={() => void refreshTree()} title="Refresh">
        <RefreshCw size={14} className={loading ? 'spinning' : ''} />
      </button>
    </div>
  );
}

export function IdeFileTree({ showToolbar = false }: { showToolbar?: boolean }) {
  const {
    tree,
    loading,
    files,
    error,
    isRunning,
    source,
    buildBranch,
    frozen,
    taskStatus,
    activeTab,
    agentOnFile,
    recentPaths,
    openFile,
    refreshTree,
  } = useIdeExplorer();

  return (
    <div className="ide-file-tree">
      {showToolbar && (
        <div className="ide-explorer-toolbar ide-explorer-toolbar--compact">
          <div>
            <strong>Files</strong>
            <span className="ide-explorer-source">
              {source === 'github' ? `GitHub · ${buildBranch}` : 'Workspace'}
              {isRunning && !frozen && ' · live'}
            </span>
          </div>
          <button type="button" className="ide-icon-btn" onClick={() => void refreshTree()} title="Refresh">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      )}
      {frozen && (
        <div className="ide-frozen-banner">Run {taskStatus.toLowerCase()} — files preserved</div>
      )}
      {error && <p className="ide-error">{error}</p>}
      <div className="ide-file-tree-scroll">
        {loading && files.length === 0 && <p className="ide-empty">Loading…</p>}
        {!loading && files.length === 0 && !error && (
          <p className="ide-empty">
            {isRunning
              ? 'Waiting for builders to write files…'
              : 'Empty — start a run or add files.'}
          </p>
        )}
        {tree.map(node => (
          <TreeRow
            key={node.path}
            node={node}
            depth={0}
            activePath={activeTab}
            agentOnFile={agentOnFile}
            recentPaths={recentPaths}
            onSelect={path => { void openFile(path); }}
          />
        ))}
      </div>
    </div>
  );
}

export function IdeEditorPane() {
  const {
    tabs,
    activeTab,
    setActiveTab,
    closeTab,
    activeData,
    canEdit,
    saving,
    isRunning,
    agentOnFile,
    updateActiveContent,
    saveActive,
  } = useIdeExplorer();

  return (
    <div className="ide-editor-pane">
      {tabs.length > 0 && (
        <div className="ide-tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.relPath}
              type="button"
              className={`ide-tab ${activeTab === tab.relPath ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.relPath)}
            >
              {tab.relPath.split('/').pop()}
              {tab.dirty ? ' •' : ''}
              <span
                className="ide-tab-close"
                onClick={e => { e.stopPropagation(); closeTab(tab.relPath); }}
              >
                <X size={10} />
              </span>
            </button>
          ))}
        </div>
      )}

      {activeData ? (
        <>
          {canEdit ? (
            <>
              <CodeEditor
                relPath={activeData.relPath}
                content={activeData.content}
                onChange={updateActiveContent}
              />
              <div className="ide-editor-actions">
                <button
                  type="button"
                  className="ide-save-btn"
                  disabled={!activeData.dirty || saving}
                  onClick={() => void saveActive()}
                >
                  <Save size={14} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <CodeViewer
              relPath={activeData.relPath}
              content={activeData.content}
              isActive={isRunning && agentOnFile.has(activeData.relPath)}
            />
          )}
        </>
      ) : (
        <p className="ide-empty editor-empty">Select a file from the tree</p>
      )}
    </div>
  );
}
