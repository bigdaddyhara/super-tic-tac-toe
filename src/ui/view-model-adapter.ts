// src/ui/view-model-adapter.ts
// View-model adapter: supplies a read-only RenderableState used by the renderer.

import { GameState } from '../types/game-types'
import { evaluateSmall } from '../game/engine'

export type CellValue = 'X' | 'O' | null

export type SmallBoardStatus =
  | { kind: 'open' }
  | { kind: 'won'; winner: 'X' | 'O' }
  | { kind: 'full' }

export interface LastMove {
  smallIndex: number
  cellIndex: number
}

export interface RenderableState {
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

  return {
    bigBoard,
    smallBoardStatus,
    activeSmallIndex,
    lastMove: extras?.lastMove ?? null,
    currentPlayer: state.currentPlayer,
    hoverCell: extras?.hoverCell ?? null,
    ...(extras || {}),
  }
}
