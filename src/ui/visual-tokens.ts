// Visual tokens mirrored from src/style.css :root
// Use these in canvas renderer and other TS UI code.
export const colors = {
  bg: '#0f1720',
  panel: '#0b1220',
  surface2: '#07121a',

  accent: '#3b82f6',
  accentStrong: '#2563eb',
  muted: '#94a3b8',

  grid: 'rgba(255,255,255,0.08)',
  gridStrong: 'rgba(255,255,255,0.14)',
  boardGrid: 'rgba(34,34,34,0.12)',
  boardGridStrong: 'rgba(34,34,34,0.22)',

  lastMove: 'rgba(250,204,21,0.16)',
  forced: '#6366f1',
  winOverlay: 'rgba(249,115,22,0.08)',
  winLine: '#f97316',
  error: '#ef4444',
  draw: '#6b7280',
};

export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  base: 14,
  small: 12,
  label: 13,
  banner: 20,
};

export const geometry = {
  boardPadding: 12,
  cellGap: 6,
  subboardGap: 10,
};

export const strokes = {
  cellLine: 1,
  subboardLine: 2.5,
  winLine: 4,
};

export const motion = {
  fast: 80,
  medium: 140,
};

export default { colors, typography, geometry, strokes, motion };
