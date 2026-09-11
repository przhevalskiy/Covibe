import { Link } from 'react-router-dom';
import { RotatingText } from './RotatingText';
import { useAuthStore } from '@/features/auth';
import './EmptyState.css';

export function EmptyState() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="empty-state">
      {firstName && (
        <p className="empty-state-greeting">Hi {firstName},</p>
      )}

      <h1 className="empty-state-title">
        <RotatingText
          texts={[
            'Describe what to build from scratch.',
            'Runs stream in the IDE with live HITL checkpoints.',
          ]}
          interval={4500}
        />
      </h1>

      <p className="empty-state-lead">
        Each run starts in a project workspace — multiple runs can coordinate toward the same goal.
        No repo link required to begin.
      </p>

      <p className="empty-state-hint">
        Use <strong>+</strong> for specs and run profile. Track runs under{' '}
        <Link to="/runs">Runs</Link> or your active workspace.
      </p>
    </div>
  );
}
