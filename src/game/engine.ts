import { Cell, Player, SmallBoard, BigBoard, CellIndex, BoardIndex, SmallBoardStatus, GameStatus, SmallBoardState, BigBoardState, GameState } from '../types/game-types'
import { checkSmallWin, checkBigWin } from './win-detection'

function emptySmall(): SmallBoard { return Array.from({length:9}).map(()=>null) }

export function initialSmallState(): SmallBoardState {
  return { cells: emptySmall(), status: 'Open', winner: null }
}

export function initialBigState(): BigBoardState {
  return { boards: Array.from({length:9}).map(() => initialSmallState()) }
}

export function gameStateFromBig(big: BigBoard): GameState {
  return {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null
  }
}

export function evaluateSmall(cells: SmallBoard): { status: SmallBoardStatus, winner: Player | null } {
  const w = checkSmallWin(cells)
  if (w) return { status: 'Won', winner: w }
  if (cells.every(c => c !== null)) return { status: 'Draw', winner: null }
  return { status: 'Open', winner: null }
}

export function evaluateBigFromSmallStates(states: SmallBoardState[]): GameStatus {
  const winners = states.map(s => s.winner)
  // reuse check via winner mapping
  const bigWin = checkBigWin(winners.map(w => {
    // represent as small board with all cells equal to winner for detection
    if (!w) return Array.from({length:9}).map(()=>null) as SmallBoard
    return Array.from({length:9}).map(()=>w) as SmallBoard
  }))
  if (bigWin) return bigWin
  if (states.every(s => s.status !== 'Open')) return 'Draw'
  return 'Ongoing'
}

export function isValidMove(state: GameState, smallIndex: BoardIndex, cellIndex: CellIndex): boolean {
  if (state.winner) return false
  if (smallIndex < 0 || smallIndex > 8 || cellIndex < 0 || cellIndex > 8) return false
  const board = state.bigBoard[smallIndex]
  if (!board) return false
  if (board[cellIndex] !== null) return false
  if (state.nextBoardIndex === null) return true
  return state.nextBoardIndex === smallIndex
}

export function applyMove(state: GameState, smallIndex: BoardIndex, cellIndex: CellIndex): GameState {
  if (!isValidMove(state, smallIndex, cellIndex)) throw new Error('Invalid move')
  const player = state.currentPlayer
  const newBig: BigBoard = state.bigBoard.map((b, i) => i === smallIndex ? [...b] : [...b])
  newBig[smallIndex][cellIndex] = player

  // evaluate small board
  const smallEval = evaluateSmall(newBig[smallIndex])

  // build small states for big evaluation
  const smallStates: SmallBoardState[] = newBig.map(b => {
    const ev = evaluateSmall(b)
    return { cells: b, status: ev.status, winner: ev.winner }
  })

  const bigStatus = evaluateBigFromSmallStates(smallStates)

  const nextBoard = (smallStates[cellIndex].status === 'Open') ? cellIndex : null

  return {
    bigBoard: newBig,
    currentPlayer: player === 'X' ? 'O' : 'X',
    nextBoardIndex: nextBoard,
    winner: bigStatus === 'Ongoing' || bigStatus === 'Draw' ? (bigStatus === 'Draw' ? null : null) : (bigStatus as Player)
  }
}
