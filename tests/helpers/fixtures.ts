/**
 * Test fixture builders for Ultimate Tic-Tac-Toe engine verification.
 *
 * All helpers return plain GameState objects (immutable snapshots).
 * Every factory self-validates its output so fixture bugs surface immediately.
 */

import { GameState, Move, Player, SmallBoard, BigBoard, BoardIndex, CellIndex } from '../../src/types/game-types'
import { evaluateSmall } from '../../src/game/engine'
import { applyMove as engineApplyMove } from '../../src/game/state'

// ─── Primitive builders ──────────────────────────────────────────

/** Returns an empty small board (9 nulls). */
export function emptyBoard(): SmallBoard {
  return [null, null, null, null, null, null, null, null, null]
}

/**
 * Sparse cell assignment on an empty small board.
 * @example boardWith({ 0: 'X', 1: 'X', 2: 'X' }) → X wins top row
 */
export function boardWith(marks: Record<number, Player>): SmallBoard {
  const b = emptyBoard()
  for (const [k, v] of Object.entries(marks)) {
    const idx = Number(k)
    if (idx < 0 || idx > 8) throw new Error(`boardWith: index ${idx} out of range`)
    b[idx] = v
  }
  return b
}

/**
 * Returns a minimal small board won by the given player (top row filled).
 * Self-validates via evaluateSmall.
 */
export function wonBoard(winner: Player): SmallBoard {
  // Top row is the winner, remaining cells null
  const b: SmallBoard = [winner, winner, winner, null, null, null, null, null, null]
  const ev = evaluateSmall(b)
  if (ev.status !== 'Won' || ev.winner !== winner) {
    throw new Error(`wonBoard fixture broken: expected Won/${winner}, got ${ev.status}/${ev.winner}`)
  }
  return b
}

/**
 * Returns a full small board with no 3-in-a-row (drawn).
 * Pattern: X O X | O X X | O X O
 * Self-validates via evaluateSmall.
 */
export function drawnBoard(): SmallBoard {
  const b: SmallBoard = ['X', 'O', 'X', 'O', 'X', 'X', 'O', 'X', 'O']
  const ev = evaluateSmall(b)
  if (ev.status !== 'Draw') {
    throw new Error(`drawnBoard fixture broken: expected Draw, got ${ev.status}`)
  }
  return b
}

// ─── State builders ──────────────────────────────────────────────

/**
 * Merges overrides onto a fresh game state.
 */
export function stateWith(overrides: Partial<GameState>): GameState {
  const base = freshState()
  const s: GameState = { ...base, ...overrides }
  if (overrides.bigBoard) {
    // deep-copy big board so callers can't share references
    s.bigBoard = overrides.bigBoard.map(b => [...b])
  }
  validateFixture(s)
  return s
}

/**
 * Returns a fresh initial game state (all empty, X to play, no constraint, no winner).
 */
export function freshState(): GameState {
  const big: BigBoard = Array.from({ length: 9 }, () => emptyBoard())
  return {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null,
  }
}

/**
 * Replaces specific small boards within a fresh state.
 */
export function setBigBoard(boardMap: Record<number, SmallBoard>, player: Player = 'X', nextBoard: number | null = null): GameState {
  const s = freshState()
  for (const [k, v] of Object.entries(boardMap)) {
    s.bigBoard[Number(k)] = [...v]
  }
  s.currentPlayer = player
  s.nextBoardIndex = nextBoard
  validateFixture(s)
  return s
}

/**
 * Fresh state with small board k replaced by wonBoard(winner).
 */
export function closeBoard(k: number, winner: Player): GameState {
  return setBigBoard({ [k]: wonBoard(winner) })
}

/**
 * Fresh state with small board k replaced by drawnBoard().
 */
export function fillBoardNoWin(k: number): GameState {
  return setBigBoard({ [k]: drawnBoard() })
}

/**
 * Full manual constructor for a game state.
 */
export function makeState(
  bigBoardMap: Record<number, SmallBoard>,
  player: Player,
  nextBoard: number | null,
  winner: Player | null = null,
): GameState {
  const big: BigBoard = Array.from({ length: 9 }, () => emptyBoard())
  for (const [k, v] of Object.entries(bigBoardMap)) {
    big[Number(k)] = [...v]
  }
  const s: GameState = {
    bigBoard: big,
    currentPlayer: player,
    nextBoardIndex: nextBoard,
    winner,
  }
  validateFixture(s)
  return s
}

/**
 * Sets boards at specified indices to wonBoard(winner).
 * currentPlayer and nextBoardIndex are set to safe defaults.
 */
export function winThreeBoards(boards: [number, number, number], winner: Player): GameState {
  const map: Record<number, SmallBoard> = {}
  for (const b of boards) {
    map[b] = wonBoard(winner)
  }
  // Find a non-closed board for nextBoardIndex (or null if all closed)
  const closedSet = new Set(boards)
  let safeBoard: number | null = null
  for (let i = 0; i < 9; i++) {
    if (!closedSet.has(i)) { safeBoard = i; break }
  }
  const player: Player = winner === 'X' ? 'O' : 'X'
  return setBigBoard(map, player, safeBoard)
}

/**
 * Feeds each move through applyMove sequentially.
 * Throws a descriptive error if any move is illegal (includes move index + state snapshot).
 * Returns the final state.
 */
export function playSequence(moves: Move[]): { finalState: GameState; states: GameState[]; allEvents: any[][] } {
  let state = freshState()
  const states: GameState[] = [state]
  const allEvents: any[][] = []
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    try {
      const { nextState, events } = engineApplyMove(state, move)
      state = nextState
      states.push(state)
      allEvents.push(events)
    } catch (err: any) {
      throw new Error(
        `playSequence failed at move index #${i}: { board: ${move.board}, cell: ${move.cell} }\n` +
        `Player: ${state.currentPlayer}, nextBoardIndex: ${state.nextBoardIndex}\n` +
        `Error: ${err.message}`
      )
    }
  }
  return { finalState: state, states, allEvents }
}

// ─── Structural validator ────────────────────────────────────────

/**
 * Asserts structural invariants on a GameState.
 * Called at the bottom of every fixture factory.
 */
export function validateFixture(state: GameState): void {
  if (state.bigBoard.length !== 9) {
    throw new Error(`validateFixture: bigBoard.length = ${state.bigBoard.length}, expected 9`)
  }
  for (let i = 0; i < 9; i++) {
    if (state.bigBoard[i].length !== 9) {
      throw new Error(`validateFixture: bigBoard[${i}].length = ${state.bigBoard[i].length}, expected 9`)
    }
  }
  if (state.currentPlayer !== 'X' && state.currentPlayer !== 'O') {
    throw new Error(`validateFixture: invalid currentPlayer '${state.currentPlayer}'`)
  }
  if (state.winner !== null && state.winner !== 'X' && state.winner !== 'O') {
    throw new Error(`validateFixture: invalid winner '${state.winner}'`)
  }
  if (state.nextBoardIndex !== null && (state.nextBoardIndex < 0 || state.nextBoardIndex > 8)) {
    throw new Error(`validateFixture: nextBoardIndex ${state.nextBoardIndex} out of range`)
  }
}
