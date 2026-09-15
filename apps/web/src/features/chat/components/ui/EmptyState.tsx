import { HeroOrb } from '@/components/shell/HeroOrb';
import { useAuthStore } from '@/features/auth';
import './EmptyState.css';

export function EmptyState() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="empty-state">
      <HeroOrb />

      {firstName && (
        <p className="empty-state-greeting">Hello, {firstName}</p>
      )}

      <h1 className="empty-state-title">
        How can I assist you today?
      </h1>
    </div>
  );
}
