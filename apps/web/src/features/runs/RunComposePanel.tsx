import { useLocation } from 'react-router-dom';
import type { Project } from '@/shared/types';
import { ChatInput } from '@/features/chat/components/chat/ChatInput';
import { EmptyState } from '@/features/chat/components/ui/EmptyState';
import './RunComposePanel.css';

interface RunComposePanelProps {
  workspace?: Project | null;
}

export function RunComposePanel({ workspace }: RunComposePanelProps) {
  const location = useLocation();
  const initialMessage = (location.state as { initialMessage?: string } | null)?.initialMessage;

  return (
    <div className="run-compose-panel">
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
        <ChatInput initialValue={initialMessage} />
      </div>
    </div>
  );
}
