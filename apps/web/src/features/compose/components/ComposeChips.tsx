import { X, FolderKanban, Gauge, FileText } from 'lucide-react';
import { playbookLabel, runSizeLabel } from '@/shared/constants/runConfig';
import { useWorkspaceCatalogStore } from '@/features/projects';
import { useWorkspaceStore } from '@/features/workspace';
import { useRunComposeStore } from '../store';
import './ComposeChips.css';

export function ComposeChips() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const specs = useRunComposeStore((s) => s.specs);
  const tier = useRunComposeStore((s) => s.tier);
  const playbook = useRunComposeStore((s) => s.playbook);
  const removeSpec = useRunComposeStore((s) => s.removeSpec);
  const { workspaces } = useWorkspaceCatalogStore();

  const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const workspaceLabel = workspace?.name ?? 'New project workspace';

  return (
    <div className="compose-chips">
      <span className="compose-chip compose-chip-hub" title="Runs in this workspace coordinate toward one project">
        <FolderKanban size={13} />
        {workspaceLabel}
      </span>
      <span className="compose-chip compose-chip-profile" title="Run profile">
        <Gauge size={13} />
        {runSizeLabel(tier)}
        {playbook ? ` · ${playbookLabel(playbook)}` : ''}
      </span>
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
