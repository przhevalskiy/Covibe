import { useMemo } from 'react';
import { MessageFeed } from './feed/MessageFeed';
import { RunFollowUpComposer } from './RunFollowUpComposer';
import type { HitlPrompt, TaskMessage } from './swarmUtils';
import { mergeTaskMessages } from '@/shared/gantry/taskMessages';
import './RunActivityFeed.css';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'terminated', 'timeout', 'canceled', 'canceled']);

type PendingHitlItem = {
  checkpoint: string;
  workflow_id: string;
  description?: string;
  questions?: string[];
};

export function RunActivityFeed({
  taskId,
  messages,
  status = 'running',
  effectivelyDone = false,
  pendingHitl = [],
  messageHitl = [],
  onFollowUpSent,
  onTerminated,
}: {
  taskId: string;
  messages: TaskMessage[];
  status?: string;
  effectivelyDone?: boolean;
  pendingHitl?: PendingHitlItem[];
  messageHitl?: HitlPrompt[];
  onHitlResolved?: () => void;
  onFollowUpSent?: () => void;
  onTerminated?: () => void;
}) {
  const isRunning = useMemo(() => !TERMINAL.has(status.toLowerCase()), [status]);

  // Merge API pending HITL into stream as synthetic messages when not already present.
  const feedMessages = useMemo(() => {
    const synthetics: TaskMessage[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      const c = msg.content as { content?: string } | undefined;
      const text = typeof c?.content === 'string' ? c.content : '';
      if (text.includes('__clarification_request__') || text.includes('__approval_request__')) {
        const m = text.match(/"workflow_id"\s*:\s*"([^"]+)"/);
        if (m?.[1]) seen.add(m[1]);
      }
    }
    for (const item of [...pendingHitl, ...messageHitl]) {
      if (seen.has(item.workflow_id)) continue;
      seen.add(item.workflow_id);
      if (item.checkpoint === 'pm_clarification' || item.checkpoint.includes('clarification')) {
        synthetics.push({
          created_at: new Date().toISOString(),
          content: {
            type: 'text',
            content: `__clarification_request__${JSON.stringify({
              questions: item.questions?.length
                ? item.questions
                : [item.description ?? 'Please clarify the project scope.'],
              context: item.description,
              workflow_id: item.workflow_id,
            })}`,
          },
        });
      }
    }
    return mergeTaskMessages(messages, synthetics);
  }, [messages, pendingHitl, messageHitl]);

  return (
    <div className="run-activity-feed">
      <div className="run-activity-log">
        <MessageFeed
          messages={feedMessages}
          isRunning={isRunning}
          taskId={taskId}
          taskStatus={status.toUpperCase()}
        />
      </div>

      <RunFollowUpComposer
        taskId={taskId}
        status={status}
        effectivelyDone={effectivelyDone}
        onSent={onFollowUpSent}
        onTerminated={onTerminated}
      />
    </div>
  );
}
