export type PixelDustCell = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  hueShift: number;
  /** 0–1 animation phase offset for staggered Jarvis pulse */
  phase: number;
  /** Normalized radial drift direction */
  driftX: number;
  driftY: number;
};

export type BlobDensity = 'compact' | 'normal';

const GRID_NORMAL = 12;
const GRID_COMPACT = 8;
const blobCache = new Map<string, PixelDustCell[]>();

export function getBlobGrid(density: BlobDensity = 'normal'): number {
  return density === 'compact' ? GRID_COMPACT : GRID_NORMAL;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildPixelDustBlob(seed: string, density: BlobDensity = 'normal'): PixelDustCell[] {
  const cacheKey = `${density}:${seed}`;
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;

  const GRID = getBlobGrid(density);
  const rng = mulberry32(hashSeed(seed));
  const cx = (GRID - 1) / 2;
  const cy = (GRID - 1) / 2;
  const maxDist = Math.hypot(cx, cy);
  const cells: PixelDustCell[] = [];

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const falloff = 1 - dist / maxDist;
      const noise = rng();
      const threshold = density === 'compact'
        ? 0.52 + rng() * 0.3
        : 0.46 + rng() * 0.28;

      if (falloff * 0.78 + noise * 0.42 > threshold) {
        const driftX = maxDist > 0 ? dx / maxDist : 0;
        const driftY = maxDist > 0 ? dy / maxDist : 0;
        cells.push({
          x,
          y,
          size: density === 'compact'
            ? 0.46 + rng() * 0.18
            : 0.5 + rng() * 0.22,
          opacity: 0.45 + falloff * 0.4 + rng() * 0.15,
          hueShift: (rng() - 0.5) * 0.18,
          phase: (dist / maxDist) * 0.65 + rng() * 0.35,
          driftX,
          driftY,
        });
      }
    }
  }

  if (cells.length === 0) {
    cells.push({
      x: Math.floor(cx),
      y: Math.floor(cy),
      size: 1,
      opacity: 0.9,
      hueShift: 0,
      phase: 0,
      driftX: 0,
      driftY: 0,
    });
  }

  blobCache.set(cacheKey, cells);
  return cells;
}

export function hexToHsl(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw;
  const n = parseInt(full, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s * 100, l * 100];
}

export function hslString(h: number, s: number, l: number, alpha = 1): string {
  return alpha < 1
    ? `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${alpha.toFixed(3)})`
    : `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

export function dustColor(baseHex: string, hueShift: number, lightnessDelta: number, alpha: number): string {
  const [h, s, l] = hexToHsl(baseHex);
  return hslString(h + hueShift * 40, Math.min(92, s + 8), Math.max(18, Math.min(78, l + lightnessDelta)), alpha);
}

export const BLOB_GRID = GRID_NORMAL;
