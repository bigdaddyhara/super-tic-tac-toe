import { applyMove as engineApply } from './engine'
import { GameState, BigBoard } from '../types/game-types'

export function createNewGame(): GameState {
  const big: BigBoard = Array.from({length:9}).map(()=> Array.from({length:9}).map(()=>null))
  return {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null
  }
}

export const applyMove = engineApply
