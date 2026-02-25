import { getLegalMoves, isLegalMove } from '../game/legal-moves'
import { BoardIndex, CellIndex, GameState } from '../types/game-types'
import { getActiveForcedBoard, isFreeMove } from './game-adapter'

export interface HighlightState {
  forcedBoard: BoardIndex | null
  isFreeMove: boolean
  legalMoves: Array<{ board: BoardIndex; cell: CellIndex }>
  hoverMove: { board: BoardIndex; cell: CellIndex } | null
  lastMove: { board: BoardIndex; cell: CellIndex } | null
  lastMoveAgeMs: number | null
}

export function computeHighlightState(
  state: GameState,
  hoverMove: { board: BoardIndex; cell: CellIndex } | null,
  lastMove: { board: BoardIndex; cell: CellIndex } | null,
  lastMoveAtMs: number | null,
): HighlightState {
  const legalMoves = getLegalMoves(state)

  if (state.winner !== null || legalMoves.length === 0) {
    return {
      forcedBoard: null,
      isFreeMove: false,
      legalMoves: [],
      hoverMove: null,
      lastMove: null,
      lastMoveAgeMs: null,
    }
  }

  const validHoverMove = hoverMove && isLegalMove(state, hoverMove) ? hoverMove : null

  return {
    forcedBoard: getActiveForcedBoard(state),
    isFreeMove: isFreeMove(state),
    legalMoves,
    hoverMove: validHoverMove,
    lastMove,
    lastMoveAgeMs: lastMove && typeof lastMoveAtMs === 'number' ? Math.max(0, Date.now() - lastMoveAtMs) : null,
  }
}
