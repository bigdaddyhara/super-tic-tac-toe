import { GameState } from '../types/game-types'

export function isValidMove(state: GameState, smallIndex: number, cellIndex: number): boolean {
  if (state.winner) return false
  if (smallIndex < 0 || smallIndex > 8 || cellIndex < 0 || cellIndex > 8) return false
  const small = state.bigBoard[smallIndex]
  if (!small) return false
  if (small[cellIndex] !== null) return false
  if (state.nextBoardIndex === null) return true
  return state.nextBoardIndex === smallIndex
}
