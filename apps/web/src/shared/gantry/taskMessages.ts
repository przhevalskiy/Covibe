import type { TaskMessage } from '@/features/ide/swarmUtils';

type RawTaskMessage = TaskMessage & {
  created_at?: string;
  createdAt?: string;
  timestamp?: string;
};

function parseTimestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim()) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function messageKey(message: TaskMessage, index = 0): string {
  const raw = message as RawTaskMessage;
  if (raw.id) return `id:${raw.id}`;

  const createdAt = raw.created_at ?? raw.createdAt ?? raw.timestamp;
  const text = typeof raw.content === 'object' && raw.content !== null
    ? JSON.stringify(raw.content)
    : String(raw.content ?? '');

  if (createdAt) return `ts:${createdAt}:${text}`;
  return `idx:${index}:${text}`;
}

export function normalizeTaskMessage(message: unknown): TaskMessage {
  if (!message || typeof message !== 'object') {
    return { content: { type: 'text', content: String(message ?? '') } };
  }

  const raw = message as RawTaskMessage;
  const createdAt = raw.created_at ?? raw.createdAt ?? raw.timestamp;

  return {
    id: raw.id,
    created_at: createdAt,
    content: raw.content,
  };
}

export function sortTaskMessages(messages: TaskMessage[]): TaskMessage[] {
  return messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const aTs = parseTimestamp(
        (a.message as RawTaskMessage).created_at
          ?? (a.message as RawTaskMessage).createdAt
          ?? (a.message as RawTaskMessage).timestamp,
      );
      const bTs = parseTimestamp(
        (b.message as RawTaskMessage).created_at
          ?? (b.message as RawTaskMessage).createdAt
          ?? (b.message as RawTaskMessage).timestamp,
      );
      if (aTs !== bTs) return aTs - bTs;
      return a.index - b.index;
    })
    .map(({ message }) => message);
}

export function mergeTaskMessages(
  existing: TaskMessage[],
  incoming: TaskMessage[],
): TaskMessage[] {
  const merged = new Map<string, TaskMessage>();

  existing.forEach((message, index) => {
    merged.set(messageKey(message, index), message);
  });

  incoming.forEach((message, index) => {
    const normalized = normalizeTaskMessage(message);
    merged.set(messageKey(normalized, existing.length + index), normalized);
  });

  return sortTaskMessages([...merged.values()]);
}

export function lastTaskMessage(messages: TaskMessage[]): TaskMessage | undefined {
  if (messages.length === 0) return undefined;
  return sortTaskMessages(messages)[messages.length - 1];
}
