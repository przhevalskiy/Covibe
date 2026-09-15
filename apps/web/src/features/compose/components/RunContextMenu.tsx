import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePlus,
  ChevronRight,
  ArrowLeft,
  FolderKanban,
  LayoutTemplate,
  FileText,
  Gauge,
  Plus,
  Trash2,
} from 'lucide-react';
import { gantryClient } from '@/shared/services/gantry/client';
import { useWorkspaceCatalogStore } from '@/features/projects';
import { confirmDeleteWorkspace } from '@/features/projects/workspaceDelete';
import { useTemplateStore } from '@/features/templates';
import { useWorkspaceStore } from '@/features/workspace';
import { Template } from '@/shared/types';
import { RUN_SIZE_OPTIONS } from '@/shared/constants/runConfig';
import { usePlaybookOptions, usePlaybookStore } from '@/features/playbooks';
import { useRunComposeStore } from '../store';
import { extractSpecText } from '../specExtract';
import type { ComposeContextMenuView } from '../composeContextMenu';
import '@/features/chat/components/input/InputActionsDropdown.css';
import './RunContextMenu.css';

type MenuView = ComposeContextMenuView;

interface RunContextMenuProps {
  onStarterPick?: (body: string) => void;
}

export function RunContextMenu({ onStarterPick }: RunContextMenuProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>('root');
  const [error, setError] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const { workspaces, fetchWorkspaces, deleteWorkspace } = useWorkspaceCatalogStore();
  const { templates, fetchTemplates } = useTemplateStore();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const createAndActivate = useWorkspaceStore((s) => s.createAndActivate);
  const { specs, tier, playbook, addSpec, applyProfile } = useRunComposeStore();
  const playbookOptions = usePlaybookOptions();
  const fetchPlaybooks = usePlaybookStore(s => s.fetchPlaybooks);

  const openMenu = (nextView: MenuView = 'root') => {
    setView(nextView);
    setIsOpen(true);
    if (workspaces.length === 0) void fetchWorkspaces();
    if (templates.length === 0) void fetchTemplates();
    void fetchPlaybooks(activeWorkspaceId ?? undefined);
  };

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: MenuView }>).detail;
      openMenu(detail?.view ?? 'root');
    };
    window.addEventListener('gantry:open-compose-menu', onOpen);
    return () => window.removeEventListener('gantry:open-compose-menu', onOpen);
  }, [activeWorkspaceId, workspaces.length, templates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeMenu = () => {
    setIsOpen(false);
    setView('root');
  };

  const handleSpecFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    try {
      const file = files[0];
      const text = await extractSpecText(file);
      if (activeWorkspaceId) {
        const { artifact } = await gantryClient.uploadArtifact(activeWorkspaceId, file, 'run');
        addSpec(file.name, text, artifact.id);
      } else {
        addSpec(file.name, text);
      }
      closeMenu();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const pickWorkspace = (id: string) => {
    setActiveWorkspace(id);
    closeMenu();
  };

  const handleDeleteWorkspace = async (workspace: { id: string; name: string }) => {
    if (!confirmDeleteWorkspace(workspace.name)) return;
    setError(null);
    try {
      await deleteWorkspace(workspace.id);
      void fetchWorkspaces();
      if (activeWorkspaceId === workspace.id) {
        setActiveWorkspace(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleNewWorkspace = async () => {
    const name = newWorkspaceName.trim() || 'New project';
    setError(null);
    try {
      await createAndActivate(name);
      void fetchWorkspaces();
      setNewWorkspaceName('');
      closeMenu();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const pickTemplate = (t: Template) => {
    const wsId = t.workspace_id ?? t.hubspace_id;
    if (wsId) setActiveWorkspace(wsId);
    onStarterPick?.(t.body);
    closeMenu();
  };

  const contextCount = specs.length;

  return (
    <div className="input-actions run-context-menu">
      <button
        type="button"
        onClick={() => (isOpen ? closeMenu() : openMenu('root'))}
        className="input-actions-trigger"
        title="Add context to this run"
      >
        <BadgePlus size={20} />
        {contextCount > 0 && (
          <span className="input-actions-badge">{contextCount}</span>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.json,.yaml,.yml,.csv"
        onChange={(e) => void handleSpecFile(e.target.files)}
        style={{ display: 'none' }}
      />

      {isOpen && (
        <>
          <div className="input-actions-backdrop" onClick={closeMenu} />
          <div className="input-actions-dropdown run-context-dropdown">
            {view === 'root' && (
              <>
                <p className="run-context-menu-heading">Add context to this run…</p>
                <button type="button" className="input-actions-item" onClick={() => setView('starters')}>
                  <LayoutTemplate size={18} />
                  <div className="input-actions-item-content">
                    <span className="input-actions-item-label">Starter</span>
                    <span className="input-actions-item-desc">Load a saved prompt</span>
                  </div>
                  <ChevronRight size={16} className="input-actions-item-chevron" />
                </button>
                <button
                  type="button"
                  className="input-actions-item"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText size={18} />
                  <div className="input-actions-item-content">
                    <span className="input-actions-item-label">Spec / doc</span>
                    <span className="input-actions-item-desc">Inline .txt or .md into the goal</span>
                  </div>
                  {specs.length > 0 && (
                    <span className="input-actions-item-count">{specs.length}</span>
                  )}
                </button>
                <button type="button" className="input-actions-item" onClick={() => setView('profile')}>
                  <Gauge size={18} />
                  <div className="input-actions-item-content">
                    <span className="input-actions-item-label">Run profile</span>
                    <span className="input-actions-item-desc">Size and playbook preset</span>
                  </div>
                  <ChevronRight size={16} className="input-actions-item-chevron" />
                </button>
                <button type="button" className="input-actions-item" onClick={() => setView('workspaces')}>
                  <FolderKanban size={18} />
                  <div className="input-actions-item-content">
                    <span className="input-actions-item-label">Workspace</span>
                    <span className="input-actions-item-desc">Switch project or start a new one</span>
                  </div>
                  <ChevronRight size={16} className="input-actions-item-chevron" />
                </button>
              </>
            )}

            {view === 'workspaces' && (
              <div className="input-actions-submenu">
                <button type="button" className="input-actions-back" onClick={() => setView('root')}>
                  <ArrowLeft size={15} /> Workspace
                </button>
                <div className="input-actions-sublist">
                  <button
                    type="button"
                    className={`input-actions-subitem ${!activeWorkspaceId ? 'selected' : ''}`}
                    onClick={() => {
                      setActiveWorkspace(null);
                      closeMenu();
                    }}
                  >
                    <FolderKanban size={14} /> New project workspace
                  </button>
                </div>
                <div className="run-context-new-workspace">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="New project name"
                    className="run-context-new-workspace-input"
                  />
                  <button type="button" className="input-actions-subitem" onClick={() => void handleNewWorkspace()}>
                    <Plus size={14} /> Create workspace
                  </button>
                </div>
                <div className="input-actions-sublist">
                  {workspaces.length === 0 ? (
                    <p className="run-context-empty">Your first run creates a workspace automatically.</p>
                  ) : (
                    workspaces.map((p) => (
                      <div key={p.id} className="run-context-workspace-row">
                        <button
                          type="button"
                          className={`input-actions-subitem ${p.id === activeWorkspaceId ? 'selected' : ''}`}
                          onClick={() => pickWorkspace(p.id)}
                        >
                          <FolderKanban size={14} /> {p.name}
                          {p.github_url ? ' · linked' : ''}
                        </button>
                        <button
                          type="button"
                          className="run-context-workspace-delete"
                          title={`Delete ${p.name}`}
                          onClick={() => void handleDeleteWorkspace(p)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  className="input-actions-setup"
                  onClick={() => { closeMenu(); navigate('/workspaces'); }}
                >
                  Manage workspaces →
                </button>
              </div>
            )}

            {view === 'starters' && (
              <div className="input-actions-submenu">
                <button type="button" className="input-actions-back" onClick={() => setView('root')}>
                  <ArrowLeft size={15} /> Starter
                </button>
                <div className="input-actions-sublist">
                  {templates.length === 0 ? (
                    <button
                      type="button"
                      className="input-actions-setup"
                      onClick={() => { closeMenu(); navigate('/starters'); }}
                    >
                      No starters yet — set one up →
                    </button>
                  ) : (
                    templates.map((t) => (
                      <button key={t.id} type="button" className="input-actions-subitem" onClick={() => pickTemplate(t)}>
                        <LayoutTemplate size={14} /> {t.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {view === 'profile' && (
              <div className="input-actions-submenu">
                <button type="button" className="input-actions-back" onClick={() => setView('root')}>
                  <ArrowLeft size={15} /> Run profile
                </button>
                <button
                  type="button"
                  className={`input-actions-subitem ${tier === -1 && !playbook ? 'selected' : ''}`}
                  onClick={() => {
                    applyProfile({ tier: -1, playbook: '' });
                    closeMenu();
                  }}
                >
                  Reset to Automatic · General
                </button>
                <p className="run-context-submenu-label">Run size</p>
                <div className="input-actions-sublist">
                  {RUN_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`input-actions-subitem ${tier === opt.value ? 'selected' : ''}`}
                      onClick={() => {
                        applyProfile({ tier: opt.value });
                        closeMenu();
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="run-context-submenu-label">Skill</p>
                <div className="input-actions-sublist">
                  {playbookOptions.map((opt) => (
                    <button
                      key={opt.id || 'general'}
                      type="button"
                      className={`input-actions-subitem ${playbook === opt.id ? 'selected' : ''}`}
                      onClick={() => {
                        applyProfile({ playbook: opt.id });
                        closeMenu();
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="input-actions-error">
          {error}
          <button onClick={() => setError(null)} type="button">Dismiss</button>
        </div>
      )}
    </div>
  );
}
