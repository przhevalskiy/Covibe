import { describe, expect, it } from 'vitest';
import {
  applyRunStreamEvent,
  chunkToTaskMessage,
  isTerminalStatus,
  parseStatusFromChunk,
} from './runStreamMessages';
import { mergeTaskMessages, sortTaskMessages } from './taskMessages';

describe('parseStatusFromChunk', () => {
  it('parses status lines', () => {
    expect(parseStatusFromChunk('[status: running]')).toBe('running');
  });

  it('returns null for other chunks', () => {
    expect(parseStatusFromChunk('▸ lifecycle')).toBeNull();
  });
});

describe('isTerminalStatus', () => {
  it('recognizes terminal states', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('Running')).toBe(false);
  });
});

describe('applyRunStreamEvent', () => {
  it('routes status without appending feed noise', () => {
    const messages: unknown[] = [];
    let status = '';

    applyRunStreamEvent(
      { type: 'chunk', content: '[status: queued]\n', provider: 'gantry' },
      {
        onTaskMessage: (msg) => messages.push(msg),
        onChecklist: () => {},
        onStatus: (s) => { status = s; },
        onDone: () => {},
        onError: () => {},
      },
    );

    expect(messages).toHaveLength(0);
    expect(status).toBe('queued');
  });

  it('routes structured task messages', () => {
    const messages: unknown[] = [];

    applyRunStreamEvent(
      {
        type: 'task_message',
        provider: 'gantry',
        message: {
          id: '1',
          created_at: '2026-09-11T15:39:24.573000',
          content: { type: 'text', content: 'hello' },
        },
      },
      {
        onTaskMessage: (msg) => messages.push(msg),
        onChecklist: () => {},
        onStatus: () => {},
        onDone: () => {},
        onError: () => {},
      },
    );

    expect(messages).toHaveLength(1);
  });

  it('builds task messages from chunks', () => {
    const msg = chunkToTaskMessage('hello');
    expect(msg.content).toEqual({ type: 'text', content: 'hello' });
  });
});

describe('sortTaskMessages', () => {
  it('orders oldest-first by created_at', () => {
    const sorted = sortTaskMessages([
      { id: 'b', created_at: '2026-09-11T15:40:21.637000', content: { type: 'text', content: 'new' } },
      { id: 'a', created_at: '2026-09-11T15:39:24.573000', content: { type: 'text', content: 'old' } },
    ]);
    expect(sorted.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('mergeTaskMessages', () => {
  it('dedupes and keeps chronological order', () => {
    const merged = mergeTaskMessages(
      [{ id: 'a', created_at: '2026-09-11T15:39:24.573000', content: { type: 'text', content: 'old' } }],
      [
        { id: 'a', created_at: '2026-09-11T15:39:24.573000', content: { type: 'text', content: 'old' } },
        { id: 'b', created_at: '2026-09-11T15:40:21.637000', content: { type: 'text', content: 'new' } },
      ],
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
