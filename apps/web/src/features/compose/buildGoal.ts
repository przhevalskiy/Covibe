import type { SpecAttachment } from './store';

/** Merge user goal with inline spec attachments for POST /v1/tasks. */
export function buildGoalWithContext(goal: string, specs: SpecAttachment[]): string {
  const trimmed = goal.trim();
  if (specs.length === 0) return trimmed;

  const blocks = specs.map(
    (s) => `--- Attached: ${s.filename} ---\n${s.text.trim()}`,
  );
  return `${trimmed}\n\n${blocks.join('\n\n')}`.trim();
}
