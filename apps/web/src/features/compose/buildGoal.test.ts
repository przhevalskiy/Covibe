import { describe, expect, it } from 'vitest';
import { buildGoalWithContext } from './buildGoal';

describe('buildGoalWithContext', () => {
  it('returns goal only when no specs', () => {
    expect(buildGoalWithContext('  Fix auth  ', [])).toBe('Fix auth');
  });

  it('appends spec blocks', () => {
    const result = buildGoalWithContext('Ship feature', [
      { id: '1', filename: 'spec.md', text: 'Must use JWT' },
    ]);
    expect(result).toContain('Ship feature');
    expect(result).toContain('--- Attached: spec.md ---');
    expect(result).toContain('Must use JWT');
  });
});
