import { Cell, Player, SmallBoard, BigBoard, CellIndex, BoardIndex, SmallBoardStatus, GameStatus, SmallBoardState, BigBoardState, GameState } from '../types/game-types'
import { checkSmallWin, checkBigWin } from './win-detection'

// Explicit error types for deterministic error handling
export class EngineError extends Error {}
export class OutOfBoundsError extends EngineError {}
export class GameFinishedError extends EngineError {}
export class CellOccupiedError extends EngineError {}
export class BoardClosedError extends EngineError {}
export class ForcedBoardMismatchError extends EngineError {}

function assertInvariant(cond: boolean, message: string) {
  if (!cond) throw new EngineError(`Invariant failed: ${message}`)
}

function emptySmall(): SmallBoard { return Array.from({ length: 9 }).map(() => null) }

export function initialSmallState(): SmallBoardState {
  return { cells: emptySmall(), status: 'Open', winner: null }
}

export function initialBigState(): BigBoardState {
  return { boards: Array.from({ length: 9 }).map(() => initialSmallState()) }
}

export function gameStateFromBig(big: BigBoard): GameState {
  return {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null,
  }
}

export function evaluateSmall(cells: SmallBoard): { status: SmallBoardStatus; winner: Player | null } {
  const w = checkSmallWin(cells)
  if (w) return { status: 'Won', winner: w }
  if (cells.every((c) => c !== null)) return { status: 'Draw', winner: null }
  return { status: 'Open', winner: null }
}

export function evaluateBigFromSmallStates(states: SmallBoardState[]): GameStatus {
  const winners = states.map((s) => s.winner)
  // represent winners as small boards for reuse of checkBigWin
  const mapped: SmallBoard[] = winners.map((w) => (w ? Array.from({ length: 9 }).map(() => w) : Array.from({ length: 9 }).map(() => null)))
  const bigWin = checkBigWin(mapped)
  if (bigWin) return bigWin
  if (states.every((s) => s.status !== 'Open')) return 'Draw'
  return 'Ongoing'
}

export function isValidMove(state: GameState, smallIndex: BoardIndex, cellIndex: CellIndex): boolean {
  if (state.winner) return false
  if (smallIndex < 0 || smallIndex > 8 || cellIndex < 0 || cellIndex > 8) return false
  const board = state.bigBoard[smallIndex]
  if (!board) return false
  if (board[cellIndex] !== null) return false

  // If forced board is set but closed, the next player has free choice
  if (state.nextBoardIndex !== null) {
    const forced = state.nextBoardIndex
    const forcedBoard = state.bigBoard[forced]
    if (forcedBoard) {
      const ev = evaluateSmall(forcedBoard)
      if (ev.status === 'Open') {
        return forced === smallIndex
      }
      // forced board closed -> free choice
      return true
    }
  }

  return true
}

export function applyMove(state: GameState, smallIndex: BoardIndex, cellIndex: CellIndex): GameState {
  // preconditions
  if (state.winner) throw new GameFinishedError('Game already finished')
  if (smallIndex < 0 || smallIndex > 8) throw new OutOfBoundsError('smallIndex out of range')
  if (cellIndex < 0 || cellIndex > 8) throw new OutOfBoundsError('cellIndex out of range')

  const board = state.bigBoard[smallIndex]
  if (!board) throw new OutOfBoundsError('small board missing')
  if (board[cellIndex] !== null) throw new CellOccupiedError('Cell already occupied')
  // If forced board set but closed, treat as free choice. Otherwise enforce constraint.
  if (state.nextBoardIndex !== null) {
    const forced = state.nextBoardIndex
    const forcedBoard = state.bigBoard[forced]
    if (forcedBoard) {
      const evForced = evaluateSmall(forcedBoard)
      if (evForced.status === 'Open' && forced !== smallIndex) {
        throw new ForcedBoardMismatchError('Move not allowed by forced-board constraint')
      }
      // if forced board closed, allow any smallIndex
    }
  }

  const player = state.currentPlayer
  const newBig: BigBoard = state.bigBoard.map((b, i) => (i === smallIndex ? [...b] : [...b]))
  newBig[smallIndex][cellIndex] = player

  // evaluate small boards
  const smallStates: SmallBoardState[] = newBig.map((b) => {
    const ev = evaluateSmall(b)
    return { cells: b, status: ev.status, winner: ev.winner }
  })

  const bigStatus = evaluateBigFromSmallStates(smallStates)

  const nextBoard = smallStates[cellIndex].status === 'Open' ? cellIndex : null

  // Postcondition invariants
  const countX = newBig.flat().filter((c) => c === 'X').length
  const countO = newBig.flat().filter((c) => c === 'O').length
  assertInvariant(Math.abs(countX - countO) <= 1, `move counts out of balance X:${countX} O:${countO}`)
  if (nextBoard !== null) {
    assertInvariant(nextBoard >= 0 && nextBoard <= 8, 'nextBoardIndex out of range')
    assertInvariant(smallStates[nextBoard].status === 'Open', 'nextBoard must be open')
  }

  const winner = bigStatus === 'Ongoing' || bigStatus === 'Draw' ? (bigStatus === 'Draw' ? null : null) : (bigStatus as Player)

  return {
    bigBoard: newBig,
    currentPlayer: player === 'X' ? 'O' : 'X',
    nextBoardIndex: nextBoard,
    winner,
  }
}
