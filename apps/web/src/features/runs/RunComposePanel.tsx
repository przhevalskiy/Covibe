import { useLocation } from 'react-router-dom';
import type { Project } from '@/shared/types';
import { ChatInput } from '@/features/chat/components/chat/ChatInput';
import { EmptyState } from '@/features/chat/components/ui/EmptyState';
import './RunComposePanel.css';

interface RunComposePanelProps {
  workspace?: Project | null;
  layout?: 'panel' | 'centered';
}

export function RunComposePanel({ workspace, layout = 'panel' }: RunComposePanelProps) {
  const location = useLocation();
  const initialMessage = (location.state as { initialMessage?: string } | null)?.initialMessage;
  const centered = layout === 'centered';

  return (
    <div className={`run-compose-panel ${centered ? 'run-compose-panel--centered' : ''}`}>
      {workspace?.instructions && (
        <div className="run-compose-brief">
          <strong>Workspace brief</strong>
          <p>{workspace.instructions}</p>
        </div>
      )}

      <div className="run-compose-main">
        <EmptyState />
      </div>

      <div className="run-compose-input">
        <ChatInput initialValue={initialMessage ?? ''} />
      </div>
    </div>
  );
}
