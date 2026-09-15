import { describe, expect, it } from 'vitest';
import {
  composeGoalStripLabel,
  getComposeGoalContext,
  moreGoalSectionsForContext,
  primaryGoalSectionsForContext,
} from './composeGoalSections';

describe('composeGoalSections', () => {
  it('uses greenfield pills when no workspace is selected', () => {
    const ctx = getComposeGoalContext(null);
    const primary = primaryGoalSectionsForContext(ctx);

    expect(ctx.mode).toBe('greenfield');
    expect(primary.map((s) => s.id)).toEqual(['build', 'prototype']);
    expect(composeGoalStripLabel(ctx)).toBe('Explore a new build');
  });

  it('uses workspace pills when a workspace id is selected', () => {
    const ctx = getComposeGoalContext('ws-1', {
      name: 'Demo Hubspace',
      instructions: 'Keep auth changes minimal.',
      github_url: 'https://github.com/acme/demo',
    });
    const primary = primaryGoalSectionsForContext(ctx);

    expect(ctx.mode).toBe('workspace');
    expect(primary.map((s) => s.id)).toEqual(['fix', 'feature', 'quality']);
    expect(composeGoalStripLabel(ctx)).toBe('Tracks for Demo Hubspace');
  });

  it('stays in workspace mode even before workspace metadata loads', () => {
    const ctx = getComposeGoalContext('ws-1', null);
    const primary = primaryGoalSectionsForContext(ctx);

    expect(ctx.mode).toBe('workspace');
    expect(primary.map((s) => s.id)).toEqual(['fix', 'feature', 'quality']);
    expect(composeGoalStripLabel(ctx)).toBe('Tracks for this workspace');
  });

  it('personalizes workspace prompt bodies with the workspace name', () => {
    const ctx = getComposeGoalContext('ws-1', {
      name: 'Payments API',
      instructions: null,
      github_url: null,
    });
    const fix = primaryGoalSectionsForContext(ctx).find((s) => s.id === 'fix');

    expect(fix?.prompts[0]?.body).toContain('Payments API');
    expect(fix?.hint).toContain('Payments API');
  });

  it('prepends workspace brief as the first feature prompt', () => {
    const ctx = getComposeGoalContext('ws-1', {
      name: 'Demo Hubspace',
      instructions: 'Ship dark mode first.',
      github_url: null,
    });
    const feature = primaryGoalSectionsForContext(ctx).find((s) => s.id === 'feature');

    expect(feature?.prompts[0]).toEqual({
      title: 'Follow workspace brief',
      body: 'Ship dark mode first.',
    });
  });

  it('shows PR prompts only for linked workspaces', () => {
    const linked = getComposeGoalContext('ws-linked', {
      name: 'Linked',
      instructions: null,
      github_url: 'https://github.com/acme/linked',
    });
    const local = getComposeGoalContext('ws-local', {
      name: 'Local',
      instructions: null,
      github_url: null,
    });

    const linkedFix = primaryGoalSectionsForContext(linked).find((s) => s.id === 'fix');
    const localFix = primaryGoalSectionsForContext(local).find((s) => s.id === 'fix');

    expect(linkedFix?.prompts.some((p) => p.title === 'Merge-ready PR')).toBe(true);
    expect(localFix?.prompts.some((p) => p.title === 'Merge-ready PR')).toBe(false);
  });

  it('keeps greenfield and workspace more-menu prompts separate', () => {
    const greenfieldMore = moreGoalSectionsForContext(getComposeGoalContext(null));
    const workspaceMore = moreGoalSectionsForContext(
      getComposeGoalContext('ws-1', { name: 'Demo', instructions: null, github_url: null }),
    );

    const greenfieldBodies = greenfieldMore.flatMap((s) => s.prompts.map((p) => p.body));
    const workspaceBodies = workspaceMore.flatMap((s) => s.prompts.map((p) => p.body));

    expect(greenfieldBodies.some((body) => body.includes('Vite app'))).toBe(true);
    expect(workspaceBodies.some((body) => body.includes('Vite app'))).toBe(false);
    expect(workspaceBodies.some((body) => body.includes('Demo'))).toBe(true);
  });
});
