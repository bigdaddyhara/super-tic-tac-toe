// Visual tokens mirrored from src/style.css :root
// Use these in canvas renderer and other TS UI code.
export const colors = {
  bg: '#050c18',
  panel: '#0d1626',
  surface2: '#070d19',

  accent: '#3b82f6',
  accentStrong: '#2563eb',
  muted: '#8ba4c4',

  grid: 'rgba(255,255,255,0.07)',
  gridStrong: 'rgba(255,255,255,0.12)',
  boardGrid: 'rgba(30,49,84,0.6)',
  boardGridStrong: 'rgba(30,49,84,0.85)',

  lastMove: 'rgba(250,204,21,0.16)',
  forced: '#facc15',
  winOverlay: 'rgba(249,115,22,0.08)',
  winLine: '#f97316',
  error: '#ff4757',
  draw: '#4a6280',
};

export const TOKENS = {
  colors: {
    background: '#050c18',
    bigGridLine: '#1e3154',
    smallGridLine: '#0f1e38',
    markX: '#ff6b6b',
    markO: '#4fc3f7',
    lastMoveHighlight: 'rgba(250,204,21,0.55)',
    illegalMoveFlash: 'rgba(255,71,87,0.65)',
    forcedBoardBorder: '#facc15',
    freeMoveAllBoardsBorder: '#4ade80',
    legalCellOverlay: 'rgba(74,222,128,0.1)',
    hoverCellOverlay: 'rgba(250,204,21,0.2)',
    illegalClickFlash: 'rgba(255,71,87,0.28)',
    closedBoardOverlayWon: 'rgba(255,255,255,0.05)',
    closedBoardOverlayDraw: 'rgba(0,0,0,0.4)',
    wonBoardSymbol: {
      X: 'rgba(255,107,107,0.22)',
      O: 'rgba(79,195,247,0.22)',
    },
  },
  lineWidth: {
    bigGrid: 3,
    smallGrid: 1,
    mark: 3,
    forcedBoardBorder: 3,
    freeMoveAllBoardsBorder: 2,
  },
  markPadding: 0.18,
  fontSize: {
    wonBoardSymbol: 0.7,
  },
} as const;

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
