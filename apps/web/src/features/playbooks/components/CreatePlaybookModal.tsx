import { useState } from 'react';
import { Modal } from '@/components/ui';
import type { PlaybookCreate } from '@/shared/types';
import { usePlaybookStore } from '../store';
import './CreatePlaybookModal.css';

interface CreatePlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onCreated?: () => void;
}

export function CreatePlaybookModal({
  isOpen,
  onClose,
  workspaceId,
  onCreated,
}: CreatePlaybookModalProps) {
  const createPlaybook = usePlaybookStore(s => s.createPlaybook);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [goalPrefix, setGoalPrefix] = useState('');
  const [branchPrefix, setBranchPrefix] = useState('swarm');
  const [tierDefault, setTierDefault] = useState(1);
  const [architectOverlay, setArchitectOverlay] = useState('');
  const [inspectorOverlay, setInspectorOverlay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setLabel('');
    setDescription('');
    setGoalPrefix('');
    setBranchPrefix('swarm');
    setTierDefault(1);
    setArchitectOverlay('');
    setInspectorOverlay('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Give the skill a name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: PlaybookCreate = {
      label: label.trim(),
      description: description.trim() || null,
      workspace_id: workspaceId ?? null,
      config: {
        tier_default: tierDefault,
        branch_prefix: branchPrefix.trim() || 'swarm',
        goal_prefix: goalPrefix.trim(),
        pipeline: { max_parallel_tracks: tierDefault >= 2 ? 2 : 1, max_heal_cycles: 1 },
        ...(architectOverlay.trim() ? { architect_overlay: architectOverlay.trim() } : {}),
        ...(inspectorOverlay.trim() ? { inspector_overlay: inspectorOverlay.trim() } : {}),
      },
    };
    try {
      await createPlaybook(body);
      onCreated?.();
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New skill" size="md">
      <form className="create-playbook-form" onSubmit={handleSubmit}>
        <p className="create-playbook-lead">
          Skills are run presets — goal prefix, tier, branch, and agent prompt overlays for your platform.
        </p>

        <label className="cp-field">
          <span className="cp-label">Name</span>
          <input
            className="cp-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Mobile release, SOC2 audit"
            autoFocus
          />
        </label>

        <label className="cp-field">
          <span className="cp-label">Description</span>
          <input
            className="cp-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="When to use this skill"
          />
        </label>

        <label className="cp-field">
          <span className="cp-label">Goal prefix</span>
          <input
            className="cp-input"
            value={goalPrefix}
            onChange={e => setGoalPrefix(e.target.value)}
            placeholder="Prepended to every run goal, e.g. 'HIPAA-compliant API change — '"
          />
        </label>

        <div className="create-playbook-row">
          <label className="cp-field">
            <span className="cp-label">Default tier</span>
            <select
              className="cp-input"
              value={tierDefault}
              onChange={e => setTierDefault(Number(e.target.value))}
            >
              <option value={0}>Quick (0)</option>
              <option value={1}>Light (1)</option>
              <option value={2}>Standard (2)</option>
              <option value={3}>Full (3)</option>
            </select>
          </label>
          <label className="cp-field">
            <span className="cp-label">Branch prefix</span>
            <input
              className="cp-input"
              value={branchPrefix}
              onChange={e => setBranchPrefix(e.target.value)}
            />
          </label>
        </div>

        <label className="cp-field">
          <span className="cp-label">Architect overlay (optional)</span>
          <textarea
            className="cp-textarea"
            rows={3}
            value={architectOverlay}
            onChange={e => setArchitectOverlay(e.target.value)}
            placeholder="Planning rules injected into the Architect agent"
          />
        </label>

        <label className="cp-field">
          <span className="cp-label">Inspector overlay (optional)</span>
          <textarea
            className="cp-textarea"
            rows={3}
            value={inspectorOverlay}
            onChange={e => setInspectorOverlay(e.target.value)}
            placeholder="Extra QA / compliance checks for the Inspector oracle"
          />
        </label>

        {error && <p className="create-playbook-error">{error}</p>}

        <div className="create-playbook-actions">
          <button type="button" className="cp-btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="cp-btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create skill'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
