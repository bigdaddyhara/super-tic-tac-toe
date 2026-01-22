// src/ui/view-model-adapter.ts
// View-model adapter: supplies a read-only RenderableState used by the renderer.

import { GameState } from '../types/game-types'
import { evaluateSmall } from '../game/engine'
import { getLegalMoves } from '../game/legal-moves'
import { findTwoInRow } from '../game/win-detection'

export type CellValue = 'X' | 'O' | null

export type SmallBoardStatus =
  | { kind: 'open' }
  | { kind: 'won'; winner: 'X' | 'O' }
  | { kind: 'full' }

export interface LastMove {
  smallIndex: number
  cellIndex: number
}
// Extras for replay UI
export interface ReplayExtras {
  replayAvailable?: boolean
  inReplayMode?: boolean
  replayIndex?: number | null
  historyLength?: number
  historyEntries?: { move?: { board: number; cell: number }; ts?: number }[]
  replayPlaying?: boolean
  replaySpeedMs?: number
}

export interface RenderableState extends ReplayExtras {
  bigBoard: CellValue[][] // 9 arrays of 9 cells each
  smallBoardStatus: SmallBoardStatus[] // length 9
  activeSmallIndex: number | null
  lastMove: LastMove | null
  currentPlayer: 'X' | 'O'
  hoverCell: { smallIndex: number; cellIndex: number } | null
  hoverAlpha?: number
  illegal?: { smallIndex: number; cellIndex: number } | null
  gameOver?: boolean
  winner?: 'X' | 'O' | null
  draw?: boolean
  shake?: { x: number; y: number } | null
  animatingMove?: { smallIndex: number; cellIndex: number; start: number; duration: number } | null
  boardWinAnim?: { smallIndex: number; start: number; duration: number } | null
  // Analysis mode flag: when true the renderer may draw additional overlays
  analysisEnabled?: boolean
  // Computed analysis data (cheap, cached per state change)
  analysis?: {
    forcedBoard: number | null
    legalMoves: { board: number; cell: number }[]
    threatLines?: { board: number; a: number; b: number; target: number }[]
  }
  // Turn timer UI fields
  turnTimerRemainingMs?: number | null
  turnTimerRunning?: boolean
  turnTimeoutMs?: number
  // UI settings snapshot (persisted)
  settings?: {
    analysisEnabled?: boolean
    turnTimerEnabled?: boolean
    turnTimeoutSec?: number
    autoExpiryBehavior?: 'auto-random' | 'auto-loss'
    showLastMoveHighlight?: boolean
    forcedBoardIntensity?: number
    visuals?: { animations?: boolean }
  }
}

// Produce a default, empty renderable state. In later parts this will map from
// the real engine state. Keep this module purely read-only for the renderer.
// getRenderableState: if passed an authoritative GameState, produce the
// RenderableState mapping from the engine. If passed no state, return a
// sensible default. This hooks the engine "read model" into the renderer.
export function getRenderableState(stateOrPartial?: GameState | Partial<RenderableState>, extras?: Partial<RenderableState>): RenderableState {
  // If a GameState is provided, delegate to renderableFromGameState
  if (stateOrPartial && (stateOrPartial as GameState).bigBoard) {
    return renderableFromGameState(stateOrPartial as GameState, extras as any)
  }

  const partial = (stateOrPartial || {}) as Partial<RenderableState>
  const emptyRow: CellValue[] = Array(9).fill(null)
  const bigBoard = Array.from({ length: 9 }, () => [...emptyRow])
  const smallBoardStatus: SmallBoardStatus[] = Array.from({ length: 9 }, () => ({ kind: 'open' }))

  return {
    bigBoard,
    smallBoardStatus,
    activeSmallIndex: null,
    lastMove: null,
    currentPlayer: 'X',
    hoverCell: null,
    ...(partial || {}),
  }
}

// Map an authoritative GameState from the engine into the RenderableState used by the renderer.
export function renderableFromGameState(state: GameState, extras?: Partial<RenderableState> & { illegal?: { smallIndex: number; cellIndex: number } | null, gameOver?: boolean, winner?: 'X' | 'O' | null, draw?: boolean }): RenderableState {
  const emptyRow: CellValue[] = Array(9).fill(null)
  const bigBoard: CellValue[][] = state.bigBoard.map((b) => b.map((c) => (c === null ? null : c)))

  const smallBoardStatus: SmallBoardStatus[] = state.bigBoard.map((b) => {
    const ev = evaluateSmall(b)
    if (ev.status === 'Won') return { kind: 'won', winner: ev.winner! }
    if (ev.status === 'Draw') return { kind: 'full' }
    return { kind: 'open' }
  })

  const activeSmallIndex = state.nextBoardIndex

  // Compute lightweight analysis (cheap: uses engine helpers and small-board evals)
  const legalMoves = getLegalMoves(state)
  let forcedBoard: number | null = null
  if (state.nextBoardIndex !== null) {
    const nb = state.nextBoardIndex
    const st = evaluateSmall(state.bigBoard[nb]).status
    if (st === 'Open') forcedBoard = nb
  }

  // Threat-line detection (2-in-a-row) for the current player only (cheap)
  const threatLines: { board: number; a: number; b: number; target: number }[] = []
  for (let sb = 0; sb < 9; sb++) {
    // only consider open small-boards
    const st = evaluateSmall(state.bigBoard[sb]).status
    if (st !== 'Open') continue
    const found = findTwoInRow(state.bigBoard[sb], state.currentPlayer)
    for (const f of found) threatLines.push({ board: sb, a: f.cells[0], b: f.cells[1], target: f.target })
  }

  return {
    bigBoard,
    smallBoardStatus,
    activeSmallIndex,
    lastMove: extras?.lastMove ?? null,
    currentPlayer: state.currentPlayer,
    hoverCell: extras?.hoverCell ?? null,
    // include analysis and flag - extras may override analysisEnabled
    analysisEnabled: extras?.analysisEnabled ?? false,
    analysis: { forcedBoard, legalMoves, threatLines },
    // include any UI settings snapshot passed through extras
    settings: (extras as any)?.settings ?? undefined,
    ...(extras || {}),
  }
}
