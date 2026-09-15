import { X, FolderKanban, Gauge, FileText } from 'lucide-react';
import { playbookLabel, runSizeLabel } from '@/shared/constants/runConfig';
import { useComposeWorkspace } from '../useComposeWorkspace';
import { openComposeContextMenu } from '../composeContextMenu';
import { useRunComposeStore } from '../store';
import './ComposeChips.css';

export function ComposeChips() {
  const { workspace } = useComposeWorkspace();
  const specs = useRunComposeStore((s) => s.specs);
  const tier = useRunComposeStore((s) => s.tier);
  const playbook = useRunComposeStore((s) => s.playbook);
  const removeSpec = useRunComposeStore((s) => s.removeSpec);

  const workspaceLabel = workspace?.name ?? 'New project workspace';
  const profileLabel = [
    runSizeLabel(tier),
    playbook ? playbookLabel(playbook) : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="compose-chips">
      <button
        type="button"
        className="compose-chip compose-chip-hub compose-chip-button"
        title="Switch workspace"
        onClick={() => openComposeContextMenu('workspaces')}
      >
        <FolderKanban size={13} />
        {workspaceLabel}
      </button>
      <button
        type="button"
        className="compose-chip compose-chip-profile compose-chip-button"
        title="Run profile — size and skill preset"
        onClick={() => openComposeContextMenu('profile')}
      >
        <Gauge size={13} />
        {profileLabel}
      </button>
      {specs.map((spec) => (
        <span key={spec.id} className="compose-chip compose-chip-spec">
          <FileText size={13} />
          {spec.filename}
          <button
            type="button"
            className="compose-chip-remove"
            onClick={() => removeSpec(spec.id)}
            aria-label={`Remove ${spec.filename}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
