import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '@/shared/types';
import { gantryClient } from '@/shared/services/gantry/client';
import type { AgentFileEntry } from './swarmUtils';
import { buildFileTree, type TreeNode } from './fileTree';

export type IdeTab = { relPath: string; content: string; dirty?: boolean };

const MAX_TABS = 6;

export type IdeExplorerState = {
  project: Project;
  isRunning: boolean;
  taskStatus: string;
  buildBranch: string | null;
  writtenPaths: string[];
  agentOnFile: Map<string, AgentFileEntry>;
  editable: boolean;
  loading: boolean;
  error: string | null;
  files: string[];
  source: 'workspace' | 'github';
  tabs: IdeTab[];
  activeTab: string | null;
  saving: boolean;
  canEdit: boolean;
  frozen: boolean;
  tree: TreeNode[];
  recentPaths: Set<string>;
  activeData: IdeTab | null;
  refreshTree: () => Promise<void>;
  openFile: (rel: string, userGesture?: boolean) => Promise<void>;
  closeTab: (rel: string) => void;
  setActiveTab: (rel: string | null) => void;
  updateActiveContent: (value: string) => void;
  saveActive: () => Promise<void>;
};

export type IdeExplorerProviderProps = {
  project: Project;
  isRunning?: boolean;
  taskStatus?: string;
  buildBranch?: string | null;
  writtenPaths?: string[];
  agentOnFile?: Map<string, AgentFileEntry>;
  editable?: boolean;
};

export const IdeExplorerContext = createContext<IdeExplorerState | null>(null);

export function useIdeExplorer(): IdeExplorerState {
  const ctx = useContext(IdeExplorerContext);
  if (!ctx) throw new Error('useIdeExplorer must be used within IdeExplorerProvider');
  return ctx;
}

export function useIdeExplorerState({
  project,
  isRunning = false,
  taskStatus = 'running',
  buildBranch = null,
  writtenPaths = [],
  agentOnFile = new Map(),
  editable = true,
}: IdeExplorerProviderProps): IdeExplorerState {
  const [files, setFiles] = useState<string[]>([]);
  const [source, setSource] = useState<'workspace' | 'github'>('workspace');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<IdeTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const userSelectedAt = useRef(0);

  const useGithub = !isRunning && Boolean(buildBranch && project.github_owner && project.github_repo);
  const canEdit = editable && source === 'workspace' && !useGithub;
  const frozen = ['terminated', 'failed', 'canceled', 'cancelled', 'timeout'].includes(taskStatus.toLowerCase());
  const recentPaths = useMemo(() => new Set(writtenPaths.slice(-8)), [writtenPaths]);
  const tree = useMemo(() => buildFileTree(files), [files]);
  const activeData = tabs.find(t => t.relPath === activeTab) ?? null;

  const refreshTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useGithub) {
        const data = await gantryClient.projectGithubTree(project.id, buildBranch ?? 'main');
        setFiles(data.files);
        setSource('github');
      } else {
        const data = await gantryClient.workspaceFileTree(project.id);
        setFiles(data.files);
        setSource('workspace');
      }
    } catch (err) {
      setFiles([]);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [project.id, useGithub, buildBranch]);

  useEffect(() => {
    void refreshTree();
    const ms = isRunning ? 2500 : 8000;
    const id = setInterval(() => { void refreshTree(); }, ms);
    return () => clearInterval(id);
  }, [refreshTree, isRunning]);

  const fetchContent = useCallback(async (rel: string): Promise<string> => {
    if (useGithub) {
      const data = await gantryClient.projectGithubFile(project.id, rel, buildBranch ?? 'main');
      return data.content;
    }
    const data = await gantryClient.workspaceFileContent(project.id, rel);
    return data.content;
  }, [project.id, useGithub, buildBranch]);

  const openFile = useCallback(async (rel: string, userGesture = true) => {
    if (userGesture) userSelectedAt.current = Date.now();
    setActiveTab(rel);
    setTabs(prev => {
      if (prev.some(t => t.relPath === rel)) return prev;
      let next = [...prev, { relPath: rel, content: '' }];
      if (next.length > MAX_TABS) next = next.slice(-MAX_TABS);
      return next;
    });
    try {
      const content = await fetchContent(rel);
      setTabs(prev => prev.map(t => (t.relPath === rel ? { ...t, content, dirty: false } : t)));
    } catch (err) {
      setTabs(prev => prev.map(t => (t.relPath === rel ? { ...t, content: `// ${(err as Error).message}` } : t)));
    }
  }, [fetchContent]);

  useEffect(() => {
    if (agentOnFile.size === 0 || Date.now() - userSelectedAt.current < 5000) return;
    const builder = Array.from(agentOnFile.entries()).find(([, e]) => e.role === 'builder');
    const target = builder ?? Array.from(agentOnFile.entries())[0];
    if (target) void openFile(target[0], false);
  }, [agentOnFile, openFile]);

  useEffect(() => {
    if (writtenPaths.length === 0 || agentOnFile.size > 0) return;
    if (Date.now() - userSelectedAt.current < 5000) return;
    const last = writtenPaths[writtenPaths.length - 1];
    const rel = files.includes(last) ? last : files.find(f => f.endsWith(last)) ?? last;
    void openFile(rel, false);
  }, [writtenPaths, files, agentOnFile.size, openFile]);

  useEffect(() => {
    if (!activeTab || !isRunning) return;
    const hot = agentOnFile.has(activeTab);
    const id = setInterval(async () => {
      try {
        const content = await fetchContent(activeTab);
        setTabs(prev => prev.map(t =>
          t.relPath === activeTab && !t.dirty ? { ...t, content } : t,
        ));
      } catch { /* ignore */ }
    }, hot ? 800 : 2000);
    return () => clearInterval(id);
  }, [activeTab, isRunning, fetchContent, agentOnFile]);

  const closeTab = useCallback((rel: string) => {
    setTabs(prev => {
      const remaining = prev.filter(t => t.relPath !== rel);
      if (activeTab === rel) {
        setActiveTab(remaining.at(-1)?.relPath ?? null);
      }
      return remaining;
    });
  }, [activeTab]);

  const updateActiveContent = useCallback((value: string) => {
    if (!activeTab) return;
    setTabs(prev => prev.map(t =>
      t.relPath === activeTab ? { ...t, content: value, dirty: true } : t,
    ));
  }, [activeTab]);

  const saveActive = useCallback(async () => {
    if (!activeTab || !activeData || !canEdit) return;
    setSaving(true);
    try {
      await gantryClient.saveWorkspaceFile(project.id, activeTab, activeData.content);
      setTabs(prev => prev.map(t => (t.relPath === activeTab ? { ...t, dirty: false } : t)));
      await refreshTree();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [activeTab, activeData, canEdit, project.id, refreshTree]);

  return {
    project,
    isRunning,
    taskStatus,
    buildBranch,
    writtenPaths,
    agentOnFile,
    editable,
    loading,
    error,
    files,
    source,
    tabs,
    activeTab,
    saving,
    canEdit,
    frozen,
    tree,
    recentPaths,
    activeData,
    refreshTree,
    openFile,
    closeTab,
    setActiveTab,
    updateActiveContent,
    saveActive,
  };
}
