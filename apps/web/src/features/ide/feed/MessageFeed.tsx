import { useEffect, useMemo, useRef } from 'react';
import type { TaskMessage } from '../swarmUtils';
import { getTextContent } from '../swarmUtils';
import { BuilderProgressCtx, computeBuilderProgress } from './builder-progress';
import { ToolUseCard } from './builder-cards';
import { PlanReadyCard, LaunchCard, StrategyCard, KickoffCard, FollowUpCard, TextBubble } from './plan-cards';
import { ApprovalCard, ClarificationCard } from './hitl-cards';
import { PulsingDot, ThinkingIndicator, WorkflowTerminalBanner } from './status-indicators';
import { AgentRow } from './agent-row';
import {
  type MsgContent,
  TAGGED_RE,
  PLAN_READY_RE,
  LAUNCH_RE,
  STRATEGY_RE,
  KICKOFF_RE,
  FOLLOWUP_RE,
  parseTaggedMessage,
  parseApprovalRequest,
  parseApprovalResolved,
  parseClarificationRequest,
  CLARIFICATION_RESOLVED_PREFIX,
  APPROVAL_RESOLVED_PREFIX,
} from './agent-utils';
import './MessageFeed.css';

export { TAGGED_RE };
export type { AgentType } from './agent-utils';

function MessageRow({
  message,
  taskId,
  autoApprove,
  allMessages,
  speaking = false,
  isRunning = false,
}: {
  message: TaskMessage;
  taskId: string;
  autoApprove: boolean;
  allMessages: TaskMessage[];
  speaking?: boolean;
  isRunning?: boolean;
}) {
  const c = message.content as unknown as MsgContent;
  if (!c) return null;
  const msgType = c.type;

  if (msgType === 'tool_request') {
    return <ToolUseCard name={c.name ?? ''} args={(c.arguments ?? {}) as Record<string, unknown>} />;
  }
  if (msgType === 'tool_response') return null;

  if (msgType === 'text' || !msgType) {
    const text = typeof c.content === 'string' ? c.content : '';
    if (!text.trim()) return null;

    const approvalPayload = parseApprovalRequest(text);
    if (approvalPayload) {
      const resolvedMsg = allMessages.find(m => {
        const mc = m.content as unknown as MsgContent;
        const mt = typeof mc?.content === 'string' ? mc.content : '';
        const resolved = parseApprovalResolved(mt);
        return resolved?.workflow_id === approvalPayload.workflow_id;
      });
      const resolvedPayload = resolvedMsg
        ? parseApprovalResolved((resolvedMsg.content as unknown as MsgContent)?.content as string)
        : null;
      return (
        <ApprovalCard
          payload={approvalPayload}
          taskId={taskId}
          autoApprove={autoApprove}
          resolvedState={
            resolvedPayload?.approved === true
              ? 'approved'
              : resolvedPayload?.approved === false
                ? 'rejected'
                : null
          }
        />
      );
    }
    if (text.startsWith(APPROVAL_RESOLVED_PREFIX)) return null;

    const clarifyPayload = parseClarificationRequest(text);
    if (clarifyPayload) {
      const resolvedMsg = allMessages.find(m => {
        const mc = m.content as unknown as MsgContent;
        const mt = typeof mc?.content === 'string' ? mc.content : '';
        if (!mt.startsWith(CLARIFICATION_RESOLVED_PREFIX)) return false;
        try {
          const r = JSON.parse(mt.slice(CLARIFICATION_RESOLVED_PREFIX.length));
          return r.workflow_id === clarifyPayload.workflow_id;
        } catch {
          return false;
        }
      });
      return (
        <ClarificationCard
          payload={clarifyPayload}
          taskId={taskId}
          autoApprove={autoApprove}
          resolvedFromStream={resolvedMsg != null}
        />
      );
    }
    if (text.startsWith(CLARIFICATION_RESOLVED_PREFIX)) return null;

    if (text.startsWith('## Swarm Factory Report')) return null;
    if (FOLLOWUP_RE.test(text)) return <FollowUpCard text={text} />;
    if (KICKOFF_RE.test(text)) return <KickoffCard text={text} />;
    if (STRATEGY_RE.test(text)) return <StrategyCard text={text} />;
    if (TAGGED_RE.test(text)) {
      const parsed = parseTaggedMessage(text);
      if (parsed?.type === 'foreman' && LAUNCH_RE.test(parsed.body)) {
        return <LaunchCard text={parsed.body} />;
      }
      return <AgentRow text={text} speaking={speaking} isRunning={isRunning} />;
    }
    if (PLAN_READY_RE.test(text)) return <PlanReadyCard text={text} />;
    if (LAUNCH_RE.test(text)) return <LaunchCard text={text} />;
    return <TextBubble text={text} />;
  }

  return null;
}

export function MessageFeed({
  messages,
  isRunning,
  taskId,
  autoApprove = false,
  taskStatus = 'RUNNING',
}: {
  messages: TaskMessage[];
  isRunning: boolean;
  taskId: string;
  autoApprove?: boolean;
  taskStatus?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const builderProgress = useMemo(() => computeBuilderProgress(messages), [messages]);

  const lastSpeakingIndex = useMemo(() => {
    if (!isRunning) return -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const text = getTextContent(messages[i]);
      if (!text || !TAGGED_RE.test(text)) continue;
      const parsed = parseTaggedMessage(text);
      if (parsed?.type === 'foreman' && LAUNCH_RE.test(parsed.body)) continue;
      return i;
    }
    return -1;
  }, [messages, isRunning]);

  const openClarification = useMemo(() => {
    const resolvedIds = new Set<string>();
    for (const msg of messages) {
      const text = getTextContent(msg);
      if (!text?.startsWith(CLARIFICATION_RESOLVED_PREFIX)) continue;
      try {
        const resolved = JSON.parse(text.slice(CLARIFICATION_RESOLVED_PREFIX.length)) as { workflow_id?: string };
        if (resolved.workflow_id) resolvedIds.add(resolved.workflow_id);
      } catch {
        /* ignore malformed resolved payloads */
      }
    }
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const text = getTextContent(messages[i]);
      if (!text) continue;
      const payload = parseClarificationRequest(text);
      if (payload && !resolvedIds.has(payload.workflow_id)) return payload;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (isRunning) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isRunning]);

  if (messages.length === 0) {
    return (
      <div className="message-feed-empty">
        {isRunning && <PulsingDot />}
        <p>{isRunning ? 'Agent starting up…' : 'No activity recorded.'}</p>
      </div>
    );
  }

  return (
    <BuilderProgressCtx.Provider value={builderProgress}>
      <div className="message-feed">
        {openClarification && isRunning && (
          <div className="message-feed-pause-banner" role="status">
            Run paused — answer the PM questions below to continue.
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={msg.id ?? `msg-${index}`} className="message-feed-row">
            <MessageRow
              message={msg}
              taskId={taskId}
              autoApprove={autoApprove}
              allMessages={messages}
              speaking={index === lastSpeakingIndex}
              isRunning={isRunning}
            />
          </div>
        ))}
        {isRunning && (
          <ThinkingIndicator
            messages={messages}
            taskStatus={taskStatus}
            waitingForInput={!!openClarification}
          />
        )}
        {!isRunning && taskStatus !== 'COMPLETED' && taskStatus !== 'RUNNING' && (
          <WorkflowTerminalBanner status={taskStatus} />
        )}
        <div ref={bottomRef} />
      </div>
    </BuilderProgressCtx.Provider>
  );
}
