import type { SSEEvent } from '@/shared/types';
import type { TaskMessage } from '@/features/ide/swarmUtils';

export function chunkToTaskMessage(text: string): TaskMessage {
  return { content: { type: 'text', content: text } };
}

/** Parse `[status: running]` lines emitted by gantryStream status mapping. */
export function parseStatusFromChunk(content: string): string | null {
  const match = content.trim().match(/^\[status:\s*(.+?)\]$/);
  return match?.[1]?.trim() ?? null;
}

export function isTerminalStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === 'completed' ||
    s === 'failed' ||
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'terminated' ||
    s === 'timeout'
  );
}

export type RunStreamHandlers = {
  onChunk: (message: TaskMessage) => void;
  onChecklist: () => void;
  onStatus: (status: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

export function applyRunStreamEvent(event: SSEEvent, handlers: RunStreamHandlers): void {
  switch (event.type) {
    case 'chunk': {
      handlers.onChunk(chunkToTaskMessage(event.content));
      const status = parseStatusFromChunk(event.content);
      if (status) handlers.onStatus(status);
      break;
    }
    case 'checklist':
      handlers.onChecklist();
      break;
    case 'done':
      handlers.onDone();
      break;
    case 'error':
      handlers.onError(event.error);
      break;
    default:
      break;
  }
}
