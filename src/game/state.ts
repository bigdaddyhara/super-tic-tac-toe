import { applyMove as engineApplyMove } from './engine'
import { GameState, Move, BigBoard } from '../types/game-types'

export function createNewGame(): GameState {
  const big: BigBoard = Array.from({length:9}).map(()=> Array.from({length:9}).map(()=>null))
  return {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null
  }
}

export const applyMove = engineApplyMove

// Backwards-compatible function that returns only the next state
export function applyMoveToState(state: GameState, move: Move): GameState {
  return engineApplyMove(state, move).nextState
}
