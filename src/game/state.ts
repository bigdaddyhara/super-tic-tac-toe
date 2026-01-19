import { BigBoard, GameState, Player } from '../types/game-types'
import { checkSmallWin, checkBigWin } from './win-detection'

function emptySmall(): (Player | null)[] { return Array.from({length:9}).map(()=>null) }

export function createNewGame(): GameState {
  const big: BigBoard = Array.from({length:9}).map(()=> emptySmall())
  return {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null
  }
}

export function applyMove(state: GameState, smallIndex: number, cellIndex: number): GameState {
  if (state.winner) throw new Error('Game already finished')
  const player = state.currentPlayer
  const board = state.bigBoard[smallIndex]
  if (!board) throw new Error('Invalid small board')
  if (board[cellIndex] !== null) throw new Error('Cell not empty')
  const newBig = state.bigBoard.map((b, i) => i === smallIndex ? [...b] : [...b])
  newBig[smallIndex][cellIndex] = player

  // compute small win
  const smallWin = checkSmallWin(newBig[smallIndex])

  // compute big win
  const bigWin = checkBigWin(newBig)

  const nextBoard = newBig[cellIndex].every(c => c !== null) ? null : cellIndex

  return {
    bigBoard: newBig,
    currentPlayer: player === 'X' ? 'O' : 'X',
    nextBoardIndex: nextBoard,
    winner: bigWin
  }
}
