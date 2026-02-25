import { GameState } from '../types/game-types'

/**
 * @deprecated Use `isLegalMove` from `../game/legal-moves` or `isValidMove` from `../game/engine` instead.
 * This copy does NOT handle the free-move rule (closed forced board → any open board)
 * and will produce incorrect results in that scenario.
 */
export function isValidMove(state: GameState, smallIndex: number, cellIndex: number): boolean {
  if (state.winner) return false
  if (smallIndex < 0 || smallIndex > 8 || cellIndex < 0 || cellIndex > 8) return false
  const small = state.bigBoard[smallIndex]
  if (!small) return false
  if (small[cellIndex] !== null) return false
  if (state.nextBoardIndex === null) return true
  return state.nextBoardIndex === smallIndex
}
