import { useEffect, useState } from 'react';
import { Puzzle, Plus, Trash2, Zap } from 'lucide-react';
import { usePlaybookStore } from '../store';
import { useRunComposeStore } from '@/features/compose';
import { CreatePlaybookModal } from './CreatePlaybookModal';
import './WorkspaceSkillsPanel.css';

interface WorkspaceSkillsPanelProps {
  workspaceId: string;
}

export function WorkspaceSkillsPanel({ workspaceId }: WorkspaceSkillsPanelProps) {
  const { playbooks, isLoading, fetchPlaybooks, deletePlaybook } = usePlaybookStore();
  const applyProfile = useRunComposeStore(s => s.applyProfile);
  const activePlaybook = useRunComposeStore(s => s.playbook);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void fetchPlaybooks(workspaceId);
  }, [fetchPlaybooks, workspaceId]);

  const visible = playbooks.filter(
    p => !p.workspace_id || p.workspace_id === workspaceId,
  );

  return (
    <div className="pd-rail-card workspace-skills">
      <div className="workspace-skills-head">
        <h3 className="pd-rail-title"><Puzzle size={15} /> Skills</h3>
        <button
          type="button"
          className="workspace-skills-add"
          title="New skill"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={14} />
        </button>
      </div>
      <p className="pd-rail-body workspace-skills-lead">
        Platform-specific run presets — tier, branch, and agent overlays for this workspace.
      </p>

      {isLoading && visible.length === 0 ? (
        <p className="workspace-skills-empty">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="workspace-skills-empty">No skills yet — create one for your platform.</p>
      ) : (
        <ul className="workspace-skills-list">
          {visible.map(skill => (
            <li key={skill.id} className="workspace-skills-item">
              <button
                type="button"
                className={`workspace-skills-use ${activePlaybook === skill.slug ? 'active' : ''}`}
                onClick={() => applyProfile({ playbook: skill.slug })}
                title="Use as default for new runs"
              >
                <Zap size={13} />
                <span className="workspace-skills-name">{skill.label}</span>
                {skill.is_system && <span className="workspace-skills-badge">example</span>}
              </button>
              {!skill.is_system && (
                <button
                  type="button"
                  className="workspace-skills-delete"
                  title="Delete skill"
                  onClick={() => void deletePlaybook(skill.id)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreatePlaybookModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        workspaceId={workspaceId}
        onCreated={() => void fetchPlaybooks(workspaceId)}
      />
    </div>
  );
}
