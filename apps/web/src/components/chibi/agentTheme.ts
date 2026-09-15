/** Agent visual theme — aligned with shell accent tokens (design/tokens.css). */
export type SwarmRole =
  | 'foreman'
  | 'pm'
  | 'architect'
  | 'builder'
  | 'inspector'
  | 'reviewer'
  | 'security'
  | 'devops'
  | 'scout'
  | 'analyst'
  | 'verifier'
  | 'critic';

/** Lavender-family role tints — distinct but cohesive with main shell. */
export const AGENT_ROLE_COLORS: Record<SwarmRole, string> = {
  foreman: '#b49cff',
  pm: '#8b7cf6',
  architect: '#7c6fe0',
  builder: '#a594ff',
  inspector: '#c4b5fd',
  reviewer: '#9d88ff',
  security: '#9580ff',
  devops: '#80a4ff',
  scout: '#8b7cf6',
  analyst: '#d8b4fe',
  verifier: '#a78bfa',
  critic: '#e9a8ff',
};

export const AGENT_ROLE_ACCENT = AGENT_ROLE_COLORS;

export const BUILDER_RING_COLORS = [
  '#8b7cf6',
  '#a594ff',
  '#7c6fe0',
  '#b49cff',
  '#d8b4fe',
  '#9d88ff',
];

export type AgentAvatarMotion = 'still' | 'idle' | 'speaking';
