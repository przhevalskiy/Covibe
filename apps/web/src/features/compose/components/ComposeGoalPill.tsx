import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useComposeWorkspace } from '../useComposeWorkspace';
import { MORE_GOAL_ICON, type ResolvedComposeGoalSection } from '../composeGoalSections';
import './ComposeGoalPill.css';

type OpenMenu = 'more' | string | null;

type MenuPos = {
  bottom: number;
  left?: number;
  right?: number;
};

function computeMenuPos(anchorEl: HTMLElement, alignRight?: boolean): MenuPos {
  const rect = anchorEl.getBoundingClientRect();
  const gap = 8;
  const pos: MenuPos = {
    bottom: window.innerHeight - rect.top + gap,
  };
  if (alignRight) {
    pos.right = Math.max(8, window.innerWidth - rect.right);
  } else {
    pos.left = rect.left;
  }
  return pos;
}

function AnchoredMenu({
  open,
  anchorEl,
  alignRight,
  onClose,
  children,
}: {
  open: boolean;
  anchorEl: HTMLElement | null;
  alignRight?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPos | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setPos(null);
      return;
    }

    const update = () => setPos(computeMenuPos(anchorEl, alignRight));

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorEl, alignRight]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorEl?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    const frame = window.requestAnimationFrame(() => {
      document.addEventListener('mousedown', onPointerDown);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`compose-goal-menu ${alignRight ? 'compose-goal-menu--align-right' : ''}`}
      style={{
        position: 'fixed',
        bottom: pos.bottom,
        left: pos.left,
        right: pos.right,
        zIndex: 10000,
      }}
      role="menu"
    >
      {children}
    </div>,
    document.body,
  );
}

function GoalMenu({
  section,
  onSelect,
  onClose,
}: {
  section: ResolvedComposeGoalSection;
  onSelect: (body: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <p className="compose-goal-menu-heading">{section.hint}</p>
      {section.prompts.map((prompt) => (
        <button
          key={prompt.title}
          type="button"
          className="compose-goal-menu-item"
          role="menuitem"
          onClick={() => {
            onSelect(prompt.body);
            onClose();
          }}
        >
          <span className="compose-goal-menu-item-title">{prompt.title}</span>
          <span className="compose-goal-menu-item-body">{prompt.body}</span>
        </button>
      ))}
    </>
  );
}

function MoreMenu({
  sections,
  onSelect,
  onClose,
}: {
  sections: ResolvedComposeGoalSection[];
  onSelect: (body: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="compose-goal-menu--flat">
      {sections.map((section) => {
        const Icon = section.icon;
        return section.prompts.map((prompt) => (
          <button
            key={`${section.id}-${prompt.title}`}
            type="button"
            className="compose-goal-menu-row"
            role="menuitem"
            onClick={() => {
              onSelect(prompt.body);
              onClose();
            }}
          >
            <Icon size={16} aria-hidden />
            <span className="compose-goal-menu-row-text">
              <strong>{prompt.title}</strong>
              <span>{section.label}</span>
            </span>
          </button>
        ));
      })}
      <button
        type="button"
        className="compose-goal-menu-row compose-goal-menu-row--link"
        onClick={() => {
          onClose();
          navigate('/starters');
        }}
      >
        <MORE_GOAL_ICON size={16} aria-hidden />
        <span className="compose-goal-menu-row-text">
          <strong>Saved starters</strong>
          <span>Org playbooks & presets</span>
        </span>
      </button>
    </div>
  );
}

export function ComposeGoalPill({ onSelect }: { onSelect: (prompt: string) => void }) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const {
    activeWorkspaceId,
    workspaceRevision,
    label,
    primarySections,
    moreSections,
  } = useComposeWorkspace();

  useEffect(() => {
    setOpenMenu(null);
    setAnchorEl(null);
  }, [activeWorkspaceId, workspaceRevision]);

  const toggle = (id: OpenMenu, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu === id) {
      setOpenMenu(null);
      setAnchorEl(null);
      return;
    }
    setOpenMenu(id);
    setAnchorEl(event.currentTarget);
  };

  const close = () => {
    setOpenMenu(null);
    setAnchorEl(null);
  };

  const openSection = primarySections.find((section) => section.id === openMenu);

  return (
    <div className="compose-goal-strip">
      <p className="compose-goal-strip-label">{label}</p>
      <div className="compose-goal-pills">
        {primarySections.map((section) => {
          const Icon = section.icon;
          const isOpen = openMenu === section.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`compose-goal-pill ${isOpen ? 'open' : ''}`}
              onClick={(event) => toggle(section.id, event)}
              aria-expanded={isOpen}
              aria-haspopup="menu"
            >
              <Icon size={15} aria-hidden />
              <span>{section.label}</span>
            </button>
          );
        })}

        {moreSections.length > 0 && (
          <button
            type="button"
            className={`compose-goal-pill ${openMenu === 'more' ? 'open' : ''}`}
            onClick={(event) => toggle('more', event)}
            aria-expanded={openMenu === 'more'}
            aria-haspopup="menu"
          >
            <MORE_GOAL_ICON size={15} aria-hidden />
            <span>More</span>
          </button>
        )}
      </div>

      {openSection && (
        <AnchoredMenu open anchorEl={anchorEl} onClose={close}>
          <GoalMenu section={openSection} onSelect={onSelect} onClose={close} />
        </AnchoredMenu>
      )}

      {moreSections.length > 0 && (
        <AnchoredMenu
          open={openMenu === 'more'}
          anchorEl={openMenu === 'more' ? anchorEl : null}
          alignRight
          onClose={close}
        >
          <MoreMenu sections={moreSections} onSelect={onSelect} onClose={close} />
        </AnchoredMenu>
      )}
    </div>
  );
}
