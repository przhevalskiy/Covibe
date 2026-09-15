import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  AGENT_ROLE_COLORS,
  BUILDER_RING_COLORS,
  type AgentAvatarMotion,
  type SwarmRole,
} from './agentTheme';
import {
  BLOB_GRID,
  buildPixelDustBlob,
  dustColor,
} from './pixelDustBlob';
import './ChibiAvatar.css';

export type { SwarmRole, AgentAvatarMotion };
export { BUILDER_RING_COLORS };

function resolveSeed(role: SwarmRole | undefined, variation: number | undefined): string {
  const safeRole = role ?? 'agent';
  const safeVariation = variation ?? 0;
  return `${safeRole}:${safeVariation}`;
}

function PixelDustBlob({
  seed,
  baseColor,
  size,
  motion,
}: {
  seed: string;
  baseColor: string;
  size: number;
  motion: AgentAvatarMotion;
}) {
  const cells = useMemo(() => buildPixelDustBlob(seed), [seed]);
  const cellSize = 100 / BLOB_GRID;
  const animated = motion !== 'still';

  return (
    <svg
      className="pixel-dust-avatar__svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {cells.map((cell, i) => {
        const w = cellSize * cell.size;
        const cx = cell.x * cellSize + cellSize / 2;
        const cy = cell.y * cellSize + cellSize / 2;
        const fill = dustColor(
          baseColor,
          cell.hueShift,
          (cell.opacity - 0.5) * 16,
          cell.opacity,
        );

        const cellStyle = animated
          ? ({
              '--phase': cell.phase,
              '--drift-x': cell.driftX,
              '--drift-y': cell.driftY,
              '--pixel-o': cell.opacity,
            } as CSSProperties)
          : undefined;

        return (
          <g key={i} transform={`translate(${cx - w / 2} ${cy - w / 2})`}>
            <rect
              className={animated ? 'pixel-dust-cell' : undefined}
              style={cellStyle}
              width={w}
              height={w}
              fill={fill}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ChibiAvatar({
  role,
  size = 32,
  avatarN,
  spriteIdx,
  motion = 'still',
  style,
}: {
  role?: SwarmRole;
  size?: number;
  avatarN?: number;
  spriteIdx?: number;
  motion?: AgentAvatarMotion;
  style?: CSSProperties;
}) {
  const variation = avatarN ?? spriteIdx ?? 0;
  const seed = resolveSeed(role, variation);
  const baseColor = role ? AGENT_ROLE_COLORS[role] : AGENT_ROLE_COLORS.foreman;

  const rootClass = [
    'pixel-dust-avatar',
    motion === 'speaking' ? 'pixel-dust-avatar--speaking' : '',
    motion === 'idle' ? 'pixel-dust-avatar--idle' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={rootClass}
      role="img"
      aria-label={role ?? 'agent'}
      style={{
        width: size,
        height: size,
        ...style,
      }}
    >
      <PixelDustBlob seed={seed} baseColor={baseColor} size={size} motion={motion} />
    </span>
  );
}

export function spriteStyleForIdx(idx: number, size = 32): CSSProperties {
  return {
    width: size,
    height: size,
    flexShrink: 0,
  };
}
