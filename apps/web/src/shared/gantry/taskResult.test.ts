import { describe, expect, it } from 'vitest';
import { resolveTaskBranch, resolveTaskPrUrl } from './taskResult';
import { taskIdFromSubmittedEvent } from './submittedEvent';

describe('resolveTaskPrUrl', () => {
  it('returns structured pr_url only', () => {
    expect(resolveTaskPrUrl({ result: { pr_url: ' https://github.com/o/r/pull/1 ' } } as never)).toBe(
      'https://github.com/o/r/pull/1',
    );
  });

  it('returns null when result is missing', () => {
    expect(resolveTaskPrUrl(null)).toBeNull();
    expect(resolveTaskPrUrl({ result: {} } as never)).toBeNull();
  });
});

describe('resolveTaskBranch', () => {
  it('returns structured branch only', () => {
    expect(resolveTaskBranch({ result: { branch: ' feat/x ' } } as never)).toBe('feat/x');
  });
});

describe('taskIdFromSubmittedEvent', () => {
  it('prefers task_id', () => {
    expect(
      taskIdFromSubmittedEvent({
        type: 'submitted',
        task_id: 'abc',
        hive_task_id: 'legacy',
        message: '',
      }),
    ).toBe('abc');
  });

  it('falls back to hive_task_id', () => {
    expect(
      taskIdFromSubmittedEvent({
        type: 'submitted',
        task_id: '',
        hive_task_id: 'legacy',
        message: '',
      }),
    ).toBe('legacy');
  });
});
