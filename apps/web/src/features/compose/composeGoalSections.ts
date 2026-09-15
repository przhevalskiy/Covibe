import type { LucideIcon } from 'lucide-react';
import {
  Hammer,
  LayoutTemplate,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
  MoreHorizontal,
} from 'lucide-react';

export type ComposeGoalScope = 'greenfield' | 'workspace';

export type ComposeGoalPrompt = {
  title: string;
  body: string;
  /** When set, prompt only appears in these compose modes. */
  scopes?: ComposeGoalScope[];
  /** When true, only shown for workspaces linked to GitHub. */
  githubOnly?: boolean;
};

export type ComposeGoalSection = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  prompts: ComposeGoalPrompt[];
  scopes: ComposeGoalScope[];
  /** Primary pill in the given compose modes */
  primaryIn?: ComposeGoalScope[];
};

export type ComposeGoalContext = {
  mode: ComposeGoalScope;
  workspaceName?: string;
  workspaceBrief?: string;
  githubLinked?: boolean;
};

type WorkspaceLike = {
  name: string;
  instructions?: string | null;
  github_url?: string | null;
};

export const COMPOSE_GOAL_SECTIONS: ComposeGoalSection[] = [
  {
    id: 'build',
    label: 'Build app',
    hint: 'Start something new from scratch',
    icon: Hammer,
    scopes: ['greenfield'],
    primaryIn: ['greenfield'],
    prompts: [
      {
        title: 'React app',
        body: 'Build a chess game in React with TypeScript — playable in the browser',
      },
      {
        title: 'Python CLI',
        body: 'Create a CLI todo app in Python with JSON persistence and unit tests',
      },
      {
        title: 'FastAPI service',
        body: 'Scaffold a REST API in FastAPI with health check and one CRUD resource',
      },
    ],
  },
  {
    id: 'prototype',
    label: 'Prototype',
    hint: 'Demos and landing pages',
    icon: LayoutTemplate,
    scopes: ['greenfield'],
    primaryIn: ['greenfield'],
    prompts: [
      {
        title: 'SaaS landing',
        body: 'Build a landing page for a SaaS analytics product with a pricing section',
      },
      {
        title: 'Notes app',
        body: 'Create a markdown notes app with local storage and dark mode',
      },
      {
        title: 'Game of Life',
        body: "Implement Conway's Game of Life with start/stop controls",
      },
    ],
  },
  {
    id: 'fix',
    label: 'Fix & ship',
    hint: 'Repairs and small diffs in {workspace}',
    icon: Wrench,
    scopes: ['workspace'],
    primaryIn: ['workspace'],
    prompts: [
      {
        title: 'Fix failing tests',
        body: 'Fix the failing tests in {workspace} and explain what broke',
      },
      {
        title: 'Bug fix',
        body: 'Investigate and fix the reported bug in {workspace} without changing unrelated behavior',
      },
      {
        title: 'Dependency update',
        body: 'Update the outdated dependency in {workspace}, fix breakages, and keep tests green',
      },
      {
        title: 'Merge-ready PR',
        body: 'Fix the failing CI checks in {workspace} and open a merge-ready PR',
        githubOnly: true,
      },
    ],
  },
  {
    id: 'feature',
    label: 'Add feature',
    hint: 'Extend {workspace}',
    icon: Sparkles,
    scopes: ['workspace'],
    primaryIn: ['workspace'],
    prompts: [
      {
        title: 'Small feature',
        body: 'Add a dark mode toggle to {workspace} and persist the preference in localStorage',
      },
      {
        title: 'API endpoint',
        body: 'Add a /health endpoint to {workspace} that returns ok and cover it with a test',
      },
      {
        title: 'UI polish',
        body: 'Add consistent error boundaries and toast notifications across {workspace}',
      },
    ],
  },
  {
    id: 'quality',
    label: 'Quality gates',
    hint: 'Tests, lint, and a11y in {workspace}',
    icon: ShieldCheck,
    scopes: ['workspace'],
    primaryIn: ['workspace'],
    prompts: [
      {
        title: 'Test coverage',
        body: 'Add unit tests for the core modules in {workspace} and keep lint clean',
      },
      {
        title: 'Accessibility',
        body: 'Fix WCAG 2.1 AA contrast and keyboard focus issues on primary flows in {workspace}',
      },
      {
        title: 'Type safety',
        body: 'Fix TypeScript errors and add types to the API client layer in {workspace}',
      },
    ],
  },
  {
    id: 'ship',
    label: 'Open PR',
    hint: 'Verified, merge-ready output',
    icon: Rocket,
    scopes: ['workspace', 'greenfield'],
    prompts: [
      {
        title: 'Feature + PR',
        body: 'Add rate limiting to POST /v1/tasks in {workspace}, run tests, and open a PR',
        scopes: ['workspace'],
      },
      {
        title: 'Dev server',
        body: 'Build a minimal Vite app, run npm run dev, and log the localhost URL',
        scopes: ['greenfield'],
      },
      {
        title: 'CI tooling',
        body: 'Build a small GitHub Action that runs tests on pull requests',
      },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    hint: 'Try a new idea without a preset repo',
    icon: LayoutTemplate,
    scopes: ['greenfield'],
    prompts: [
      {
        title: 'Spike an idea',
        body: 'Prototype the core interaction for a collaborative whiteboard app',
      },
      {
        title: 'Compare stacks',
        body: 'Scaffold the same todo app in React and Svelte and summarize tradeoffs',
      },
    ],
  },
  {
    id: 'maintain',
    label: 'Maintain',
    hint: 'Hardening tracks for {workspace}',
    icon: ShieldCheck,
    scopes: ['workspace'],
    prompts: [
      {
        title: 'Refactor',
        body: 'Refactor the data layer in {workspace} to remove duplication without changing behavior',
      },
      {
        title: 'Observability',
        body: 'Add structured logging and error reporting to the main request path in {workspace}',
      },
      {
        title: 'Docs pass',
        body: 'Update README and inline docs for the public API surface in {workspace}',
      },
    ],
  },
];

export type ComposeGoalMode = ComposeGoalScope;

export type ResolvedComposeGoalSection = Omit<ComposeGoalSection, 'prompts'> & {
  prompts: Array<{ title: string; body: string }>;
};

export function getComposeGoalMode(hasWorkspace: boolean): ComposeGoalMode {
  return hasWorkspace ? 'workspace' : 'greenfield';
}

export function getComposeGoalContext(
  activeWorkspaceId: string | null | undefined,
  workspace?: WorkspaceLike | null,
): ComposeGoalContext {
  if (!activeWorkspaceId) {
    return { mode: 'greenfield' };
  }

  return {
    mode: 'workspace',
    workspaceName: workspace?.name ?? 'this workspace',
    workspaceBrief: workspace?.instructions?.trim() || undefined,
    githubLinked: !!workspace?.github_url,
  };
}

function interpolate(text: string, ctx: ComposeGoalContext): string {
  const target = ctx.workspaceName ?? 'this workspace';
  return text.replaceAll('{workspace}', target);
}

function promptVisible(prompt: ComposeGoalPrompt, ctx: ComposeGoalContext): boolean {
  if (prompt.scopes && !prompt.scopes.includes(ctx.mode)) return false;
  if (prompt.githubOnly && !ctx.githubLinked) return false;
  return true;
}

function resolveSection(
  section: ComposeGoalSection,
  ctx: ComposeGoalContext,
): ResolvedComposeGoalSection {
  const prompts = section.prompts
    .filter((prompt) => promptVisible(prompt, ctx))
    .map(({ title, body }) => ({
      title: interpolate(title, ctx),
      body: interpolate(body, ctx),
    }));

  if (ctx.workspaceBrief && section.id === 'feature' && ctx.mode === 'workspace') {
    prompts.unshift({
      title: 'Follow workspace brief',
      body: ctx.workspaceBrief,
    });
  }

  return {
    ...section,
    hint: interpolate(section.hint, ctx),
    prompts,
  };
}

export function resolveGoalSections(ctx: ComposeGoalContext): ResolvedComposeGoalSection[] {
  return COMPOSE_GOAL_SECTIONS.filter((section) => section.scopes.includes(ctx.mode)).map(
    (section) => resolveSection(section, ctx),
  );
}

export function primaryGoalSectionsForContext(
  ctx: ComposeGoalContext,
): ResolvedComposeGoalSection[] {
  return resolveGoalSections(ctx).filter((section) => section.primaryIn?.includes(ctx.mode));
}

export function moreGoalSectionsForContext(
  ctx: ComposeGoalContext,
): ResolvedComposeGoalSection[] {
  return resolveGoalSections(ctx).filter((section) => !section.primaryIn?.includes(ctx.mode));
}

export function composeGoalStripLabel(ctx: ComposeGoalContext): string {
  if (ctx.mode === 'greenfield') {
    return 'Explore a new build';
  }
  return `Tracks for ${ctx.workspaceName ?? 'this workspace'}`;
}

/** @deprecated Use primaryGoalSectionsForContext */
export function goalSectionsForMode(mode: ComposeGoalMode): ComposeGoalSection[] {
  return COMPOSE_GOAL_SECTIONS.filter((section) => section.scopes.includes(mode));
}

/** @deprecated Use primaryGoalSectionsForContext */
export function primaryGoalSectionsForMode(mode: ComposeGoalMode): ComposeGoalSection[] {
  return goalSectionsForMode(mode).filter((section) => section.primaryIn?.includes(mode));
}

/** @deprecated Use moreGoalSectionsForContext */
export function moreGoalSectionsForMode(mode: ComposeGoalMode): ComposeGoalSection[] {
  return goalSectionsForMode(mode).filter((section) => !section.primaryIn?.includes(mode));
}

export const MORE_GOAL_ICON = MoreHorizontal;
