import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  SquarePen,
  Settings,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Menu,
  X,
  FolderKanban,
  LayoutTemplate,
  Bot,
  PlayCircle,
  Sparkles,
  Globe,
  Check,
  MessageCirclePlus,
} from 'lucide-react';
import { getAvatarIcon } from '@/shared/constants/avatarIcons';
import { useDiscussionStore } from '@/features/discussions';
import { useWorkspaceCatalogStore } from '@/features/projects';
import { useChatStore } from '@/features/chat';
import { useAuthStore } from '@/features/auth';
import { SampleQuestionsDropdown } from './SampleQuestionsDropdown';
import { AccountSettingsModal } from './AccountSettingsModal';
import { TRACK_STARTERS } from '@/shared/constants/sampleQuestions';
import { useTaskList } from '@/shared/hooks/useTaskList';
import type { GantryTaskSummary } from '@/shared/services/gantry/client';
import { useWorkspaceStore, tasksForWorkspace } from '@/features/workspace';
import './Sidebar.css';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSampleQuestions, setShowSampleQuestions] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const sampleQuestionsRef = useRef<HTMLDivElement>(null);

  const { linkTaskToDiscussion, setActiveDiscussionId } = useDiscussionStore();
  const { fetchWorkspaces } = useWorkspaceCatalogStore();
  const { clearMessages } = useChatStore();
  const { user, signOut } = useAuthStore();
  const { tasks, isLoading: tasksLoading, refresh: refreshTasks } = useTaskList(true);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const hydrateWorkspace = useWorkspaceStore((s) => s.hydrate);
  const workspaceTasks = useMemo(
    () => tasksForWorkspace(tasks, activeWorkspaceId),
    [tasks, activeWorkspaceId],
  );

  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [fetchWorkspaces, user]);

  useEffect(() => {
    const onSubmitted = (event: Event) => {
      void refreshTasks();
      const detail = (event as CustomEvent<{ task_id?: string; discussion_id?: string }>).detail;
      if (detail?.discussion_id && detail?.task_id) {
        linkTaskToDiscussion(detail.discussion_id, detail.task_id);
      }
    };
    const onWorkspace = () => {
      hydrateWorkspace();
      void fetchWorkspaces();
    };
    window.addEventListener('gantry:task-submitted', onSubmitted);
    window.addEventListener('gantry:workspace-changed', onWorkspace);
    return () => {
      window.removeEventListener('gantry:task-submitted', onSubmitted);
      window.removeEventListener('gantry:workspace-changed', onWorkspace);
    };
  }, [refreshTasks, linkTaskToDiscussion, hydrateWorkspace, fetchWorkspaces]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
        setShowLanguageMenu(false);
      }
    };
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = sampleQuestionsRef.current?.contains(target);
      const isInsideMenu = (target as Element).closest?.('.sample-questions-dropdown-menu');
      if (!isInsideContainer && !isInsideMenu) setShowSampleQuestions(false);
    };
    if (showSampleQuestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSampleQuestions]);

  const handleNewRun = () => {
    clearMessages();
    setActiveDiscussionId(null);
    navigate('/runs/new');
  };

  const handleSampleQuestionSelect = (question: string) => {
    setShowSampleQuestions(false);
    clearMessages();
    setActiveDiscussionId(null);
    navigate('/runs/new', { state: { initialMessage: question } });
  };

  const handleLogout = async () => {
    setShowSettingsMenu(false);
    await signOut();
  };

  const activeRunId = location.pathname.startsWith('/runs/')
    ? location.pathname.split('/')[2]
    : null;
  const isComposeActive = location.pathname === '/runs/new';

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {!isCollapsed && <span className="sidebar-logo-wordmark">Gantry</span>}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="sidebar-collapse-btn"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="sidebar-nav-links">
          <button
            onClick={handleNewRun}
            className={`sidebar-nav-link ${isComposeActive ? 'active' : ''}`}
          >
            <SquarePen size={18} />
            {!isCollapsed && <span>New run</span>}
          </button>
          <button
            className={`sidebar-nav-link ${location.pathname.startsWith('/workspaces') ? 'active' : ''}`}
            onClick={() => navigate('/workspaces')}
          >
            <FolderKanban size={18} />
            {!isCollapsed && <span>Workspaces</span>}
          </button>
          <button
            className={`sidebar-nav-link ${
              location.pathname === '/runs' ||
              (location.pathname.startsWith('/runs/') && !isComposeActive)
                ? 'active'
                : ''
            }`}
            onClick={() => navigate('/runs')}
          >
            <PlayCircle size={18} />
            {!isCollapsed && <span>Runs</span>}
          </button>
          <button className="sidebar-nav-link" onClick={() => navigate('/starters')}>
            <LayoutTemplate size={18} />
            {!isCollapsed && <span>Starters</span>}
          </button>
          <button className="sidebar-nav-link" onClick={() => navigate('/agents')}>
            <Bot size={18} />
            {!isCollapsed && <span>Team</span>}
          </button>
        </div>

        {!isCollapsed && (
          <div className="conversations-header" style={{ margin: '12px 0 4px', padding: '0 8px' }}>
            <h3 className="sidebar-section-title" style={{ margin: 0 }}>
              {activeWorkspaceId ? 'Workspace runs' : 'Recent runs'}
            </h3>
          </div>
        )}

        <div className="sidebar-conversations">
          {tasksLoading && tasks.length === 0 ? (
            <div className="sidebar-loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              <div className="sidebar-journey-section">
                <div className="sidebar-journey-normal">
                  <div className="sidebar-start-journey-container" ref={sampleQuestionsRef}>
                    <button
                      className="sidebar-start-journey-btn"
                      onClick={() => setShowSampleQuestions(!showSampleQuestions)}
                    >
                      <Sparkles size={16} />
                      <span>Quick start</span>
                    </button>
                    <SampleQuestionsDropdown
                      isOpen={showSampleQuestions}
                      onToggle={() => setShowSampleQuestions(!showSampleQuestions)}
                      onQuestionSelect={handleSampleQuestionSelect}
                      questions={TRACK_STARTERS}
                      isCollapsed={isCollapsed}
                    />
                  </div>
                </div>
              </div>

              <div className="conversation-group-list">
                {workspaceTasks.length > 0 && !isCollapsed && (
                  <p className="sidebar-list-label">Runs</p>
                )}
                {workspaceTasks.map((task) => (
                  <TaskSidebarItem
                    key={task.task_id}
                    task={task}
                    isActive={task.task_id === activeRunId}
                    isCollapsed={isCollapsed}
                    onSelect={() => {
                      navigate(`/runs/${task.task_id}`);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ))}
                {!tasksLoading && workspaceTasks.length === 0 && !isCollapsed && (
                  <p className="sidebar-empty-tasks">No runs in this workspace yet</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(() => {
                const AvatarIcon = getAvatarIcon(user?.user_metadata?.avatar_icon);
                return <AvatarIcon size={16} />;
              })()}
            </div>
            {!isCollapsed && (
              <>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">
                    {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="sidebar-user-plan">{user?.email || 'Gantry'}</span>
                </div>
                <div className="sidebar-user-settings-container" ref={settingsMenuRef}>
                  <button
                    className="sidebar-user-settings"
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  >
                    <Settings size={18} />
                  </button>
                  {showSettingsMenu && (
                    <div className="sidebar-settings-menu">
                      <button
                        className="sidebar-settings-menu-item"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          setShowAccountSettings(true);
                        }}
                      >
                        <User size={14} />
                        <span>Profile</span>
                      </button>
                      <div className="sidebar-settings-menu-item-wrapper">
                        <button
                          className="sidebar-settings-menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLanguageMenu(!showLanguageMenu);
                          }}
                        >
                          <Globe size={14} />
                          <span>Language</span>
                          <ChevronRight size={12} className={`language-chevron ${showLanguageMenu ? 'open' : ''}`} />
                        </button>
                        {showLanguageMenu && (
                          <LanguageSubMenu
                            onSelect={() => {
                              setShowLanguageMenu(false);
                              setShowSettingsMenu(false);
                            }}
                          />
                        )}
                      </div>
                      <button className="sidebar-settings-menu-item delete" onClick={handleLogout}>
                        <LogOut size={14} />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <AccountSettingsModal
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
        />
      </aside>
    </>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espa\u00f1ol' },
  { code: 'fr', label: 'Fran\u00e7ais' },
];

function getActiveLanguage(): string {
  const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  return match ? match[1] : 'en';
}

function LanguageSubMenu({ onSelect }: { onSelect: () => void }) {
  const activeLang = getActiveLanguage();
  const handleLanguageClick = (langCode: string) => {
    document.cookie = `googtrans=/en/${langCode};path=/;`;
    onSelect();
    window.location.reload();
  };
  return (
    <div className="language-submenu">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          className={`language-submenu-item ${lang.code === activeLang ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleLanguageClick(lang.code);
          }}
        >
          <span>{lang.label}</span>
          {lang.code === activeLang && <Check size={14} className="language-check" />}
        </button>
      ))}
    </div>
  );
}

function TaskSidebarItem({
  task,
  isActive,
  isCollapsed,
  onSelect,
}: {
  task: GantryTaskSummary;
  isActive: boolean;
  isCollapsed?: boolean;
  onSelect: () => void;
}) {
  const status = task.status.toLowerCase();
  const isRunning = !['completed', 'failed', 'cancelled', 'terminated', 'timeout', 'canceled'].includes(status);
  const title = task.goal?.trim() || task.task_id.slice(0, 12);

  return (
    <button
      type="button"
      className={`conversation-item task-sidebar-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      title={title}
    >
      {isCollapsed ? (
        <MessageCirclePlus size={16} className="conversation-item-icon" />
      ) : (
        <>
          <span className={`task-status-dot status-${status}${isRunning ? ' pulsing' : ''}`} />
          <span className="conversation-item-title">{title}</span>
        </>
      )}
    </button>
  );
}
