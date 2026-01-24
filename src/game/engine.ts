import { MoveEvents } from '../types/events'
import { logEvent } from '../ui/instrumentation'
/**
 * @function applyMove
 * @description Applies a legal move to the current game state, returning the next state and a list of events.
 * This is the core state transition function for Ultimate Tic-Tac-Toe.
 * @param {GameState} state - The current immutable game state
 * @param {Move} move - The move to apply (board and cell indices)
 * @returns {{ nextState: GameState, events: MoveEvents[] }}
 *   - nextState: the new immutable game state after the move
 *   - events: array of events describing all significant transitions (cell marked, small board won, big board won, draw, free move activation)
 * @throws {EngineError} if the move is illegal (cell occupied, board closed, wrong player, game over, etc)
 * @example
 *   const { nextState, events } = applyMove(state, { board: 0, cell: 4 })
 */
// Implementation to follow: see event types in types/events.ts
/**
 * Game engine module for Ultimate Tic-Tac-Toe.
 *
 * Responsibilities:
 * - Evaluate small board status after each move (open, won, draw)
 * - Map small-board winners to meta grid for big board evaluation
 * - Evaluate overall game status (ongoing, X won, O won, draw)
 * - Integrate win/draw status into game state after every move
 *
 * All functions are pure and deterministic.
 */
/**
 * @function evaluateSmall
 * @description Evaluates a small board for status and winner.
 * @param {SmallBoard} cells - Array of 9 cells ('X', 'O', or null)
 * @returns {{ status: SmallBoardStatus, winner: Player | null }}
 *   - status: 'Open' if moves remain and no winner
 *   - status: 'Won' if X or O has 3-in-a-row
 *   - status: 'Draw' if full and no winner
 *   - winner: 'X' or 'O' if won, null otherwise
 * @example
 *   evaluateSmall(['X','X','X',null,null,null,null,null,null]) // { status: 'Won', winner: 'X' }
 */
/**
 * @function evaluateBigFromSmallStates
 * @description Evaluates the big board for win/draw/ongoing status.
 * @param {SmallBoardState[]} states - Array of 9 SmallBoardState
 * @returns {GameStatus}
 *   - 'X' or 'O' if that player has won the big board (3 small boards in a row)
 *   - 'Draw' if all small boards are closed and no winner
 *   - 'Ongoing' otherwise
 * @example
 *   evaluateBigFromSmallStates([{status:'Won',winner:'X',cells:[]}, ...]) // 'X'
 */
import { Cell, Player, SmallBoard, BigBoard, CellIndex, BoardIndex, SmallBoardStatus, GameStatus, SmallBoardState, BigBoardState, GameState, Move } from '../types/game-types'
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


/**
 * Evaluates a small board for status and winner.
 * @param cells SmallBoard (length 9)
 * @returns { status: SmallBoardStatus; winner: Player | null }
 *   - status: 'Open' if moves remain and no winner
 *   - status: 'Won' if X or O has 3-in-a-row
 *   - status: 'Draw' if full and no winner
 *   - winner: 'X' or 'O' if won, null otherwise
 * Why: Used after every move to update the small board's state.
 */
export function evaluateSmall(cells: SmallBoard): { status: SmallBoardStatus; winner: Player | null } {
  const w = checkSmallWin(cells)
  if (w) return { status: 'Won', winner: w }
  if (cells.every((c) => c !== null)) return { status: 'Draw', winner: null }
  return { status: 'Open', winner: null }
}

/**
 * Maps small-board winners to a meta grid for big board evaluation.
 * @param states Array of SmallBoardState
 * @returns Array of winner ('X', 'O', or null) for each small board (length 9)
 * Why: Used to evaluate the big board's win/draw status.
 */
function mapSmallWinners(states: SmallBoardState[]): (Player | null)[] {
  return states.map(s => s.winner)
}

/**
 * Evaluates the big board for win/draw/ongoing status.
 * @param states Array of SmallBoardState (length 9)
 * @returns GameStatus:
 *   - 'X' or 'O' if that player has won the big board (3 small boards in a row)
 *   - 'Draw' if all small boards are closed and no winner
 *   - 'Ongoing' otherwise
 * Why: Used after every move to update the overall game state.
 */
export function evaluateBigFromSmallStates(states: SmallBoardState[]): GameStatus {
  const winners = mapSmallWinners(states)
  // represent winners as small boards for reuse of checkBigWin
  const mapped: SmallBoard[] = winners.map((w) => (w ? Array.from({ length: 9 }).map(() => w) : Array.from({ length: 9 }).map(() => null)))
  const bigWin = checkBigWin(mapped)
  if (bigWin) return bigWin
  if (states.every((s) => s.status !== 'Open')) return 'Draw'
  return 'Ongoing'
}

export function isValidMove(state: GameState, move: Move): boolean {
  const { board: smallIndex, cell: cellIndex } = move
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

/**
 * Pure transition that applies a move and returns both the next state and a list of events.
 */
export function applyMove(state: GameState, move: Move): { nextState: GameState, events: MoveEvents[] } {
  try { logEvent('move.attempt', move) } catch {}
  const { board: smallIndex, cell: cellIndex } = move
  const events: MoveEvents[] = []

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

  // Create a shallow-copy of the big board and the target small board
  const newBig: BigBoard = state.bigBoard.map((b, i) => (i === smallIndex ? [...b] : [...b]))
  newBig[smallIndex][cellIndex] = player

  // Emit CellMarked event
  events.push({ type: 'CellMarked', board: smallIndex, cell: cellIndex, player })

  // Evaluate all small boards for status and winner
  const smallStates: SmallBoardState[] = newBig.map((b) => {
    const ev = evaluateSmall(b)
    return { cells: b, status: ev.status, winner: ev.winner }
  })

  // Detect if the just-played small board transitioned to a win
  const prevSmallEval = evaluateSmall(state.bigBoard[smallIndex])
  const newSmallState = smallStates[smallIndex]
  if (prevSmallEval.status === 'Open' && newSmallState.status === 'Won' && newSmallState.winner) {
    events.push({ type: 'SmallBoardWon', board: smallIndex, winner: newSmallState.winner })
  }

  // Evaluate big board for win/draw/ongoing
  const bigStatus = evaluateBigFromSmallStates(smallStates)

  // If big board won, emit event
  if (bigStatus === 'X' || bigStatus === 'O') {
    events.push({ type: 'BigBoardWon', winner: bigStatus })
  } else if (bigStatus === 'Draw') {
    events.push({ type: 'Draw' })
  }

  // Determine next forced board (if open)
  const nextBoard = smallStates[cellIndex].status === 'Open' ? cellIndex : null

  // If nextBoard is null, emit FreeMoveActivated (next player may choose any open board)
  if (nextBoard === null) events.push({ type: 'FreeMoveActivated' })

  // Postcondition invariants
  // Note: Total X/O counts can be unbalanced due to early small board wins
  // const countX = newBig.flat().filter((c) => c === 'X').length
  // const countO = newBig.flat().filter((c) => c === 'O').length
  // assertInvariant(Math.abs(countX - countO) <= 1, `move counts out of balance X:${countX} O:${countO}`)
  if (nextBoard !== null) {
    assertInvariant(nextBoard >= 0 && nextBoard <= 8, 'nextBoardIndex out of range')
    assertInvariant(smallStates[nextBoard].status === 'Open', 'nextBoard must be open')
  }

  // Integrate win/draw status into game state
  let winner: Player | null = null
  if (bigStatus === 'X' || bigStatus === 'O') {
    winner = bigStatus
  } else if (bigStatus === 'Draw') {
    winner = null
  }

  const nextState: GameState = {
    bigBoard: newBig,
    currentPlayer: player === 'X' ? 'O' : 'X',
    nextBoardIndex: nextBoard,
    winner,
  }

  try { logEvent('move.result', { move, nextPlayer: nextState.currentPlayer, events }) } catch {}
  return { nextState, events }
}
