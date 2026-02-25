import { evaluateSmall } from '../game/engine'
import { getLegalMoves } from '../game/legal-moves'
import { BoardIndex, GameState, Player, SmallBoardStatus } from '../types/game-types'

export function getActiveForcedBoard(state: GameState): BoardIndex | null {
  const forcedBoard = state.nextBoardIndex
  if (forcedBoard === null) return null
  const forcedStatus = evaluateSmall(state.bigBoard[forcedBoard]).status
  return forcedStatus === 'Open' ? (forcedBoard as BoardIndex) : null
}

export function isFreeMove(state: GameState): boolean {
  getLegalMoves(state)
  if (state.nextBoardIndex === null) return true
  const forcedStatus = evaluateSmall(state.bigBoard[state.nextBoardIndex]).status
  return forcedStatus !== 'Open'
}

export function isGameOver(state: GameState): boolean {
  return state.winner !== null
}

export function isDraw(state: GameState): boolean {
  return state.winner === null && state.bigBoard.every((smallBoard) => evaluateSmall(smallBoard).status !== 'Open')
}

export function getAllBoardStatuses(state: GameState): Array<{ status: SmallBoardStatus; winner: Player | null }> {
  return state.bigBoard.map((smallBoard) => {
    const evaluated = evaluateSmall(smallBoard)
    return { status: evaluated.status, winner: evaluated.winner }
  })
}