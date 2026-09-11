import { describe, expect, it } from 'vitest';
import {
  applyRunStreamEvent,
  chunkToTaskMessage,
  isTerminalStatus,
  parseStatusFromChunk,
} from './runStreamMessages';

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
  it('routes chunk and status events', () => {
    const chunks: string[] = [];
    let status = '';

    applyRunStreamEvent(
      { type: 'chunk', content: '[status: queued]\n', provider: 'gantry' },
      {
        onChunk: (msg) => chunks.push(String((msg.content as { content: string }).content)),
        onChecklist: () => {},
        onStatus: (s) => { status = s; },
        onDone: () => {},
        onError: () => {},
      },
    );

    expect(chunks).toHaveLength(1);
    expect(status).toBe('queued');
  });

  it('builds task messages from chunks', () => {
    const msg = chunkToTaskMessage('hello');
    expect(msg.content).toEqual({ type: 'text', content: 'hello' });
  });
});
