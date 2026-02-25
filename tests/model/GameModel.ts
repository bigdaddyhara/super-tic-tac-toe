/**
 * GameModel: Lightweight game state model for stateful model-based testing.
 *
 * Responsibilities:
 * - Track minimal game state (board, player, constraint, small board status)
 * - Validate & apply moves (replicate engine logic, simpler implementation)
 * - Compute legal moves (replicate legal-moves logic)
 * - Provide constraint & terminal state info for assertions
 *
 * This model is the "oracle" for validating the real engine's behavior.
 * It should be simpler than the real engine but still correct for the rules.
 */

import {
  GameState,
  Move,
  Player,
  SmallBoard,
  BigBoard,
  Cell,
} from '../../src/types/game-types'
import { createNewGame } from '../../src/game/state'
import { ConstraintState, SimpleBoardStatus, MoveResult } from './types'

// Win lines (rows, columns, diagonals) for 3x3 grid
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
]

/**
 * Check if a small board has a 3-in-a-row win.
 */
function checkWin(board: SmallBoard): Player | null {
  for (const [a, b, c] of WIN_LINES) {
    const v = board[a]
    if (v && v === board[b] && v === board[c]) return v
  }
  return null
}

/**
 * Evaluate small board status: OPEN, WON, or DRAW.
 */
function evaluateBoardStatus(board: SmallBoard): {
  status: SimpleBoardStatus
  winner: Player | null
} {
  const winner = checkWin(board)
  if (winner) return { status: 'WON', winner }
  if (board.every(c => c !== null)) return { status: 'DRAW', winner: null }
  return { status: 'OPEN', winner: null }
}

/**
 * Check if the big board (meta-grid of small board winners) has a win.
 */
function checkBigWin(smallBoardWinners: (Player | null)[]): Player | null {
  for (const [a, b, c] of WIN_LINES) {
    const v = smallBoardWinners[a]
    if (v && v === smallBoardWinners[b] && v === smallBoardWinners[c]) return v
  }
  return null
}

/**
 * GameModel: minimal state oracle for testing the real engine.
 */
export class GameModel {
  private state: GameState
  private smallBoardStatesCache: {
    status: SimpleBoardStatus
    winner: Player | null
  }[]

  constructor(initialState?: GameState) {
    this.state = initialState ? this.deepClone(initialState) : createNewGame()
    this.smallBoardStatesCache = this.computeSmallBoardStates()
  }

  /**
   * Deep clone a game state to avoid mutation.
   */
  private deepClone(state: GameState): GameState {
    return {
      bigBoard: state.bigBoard.map(board => [...board]),
      currentPlayer: state.currentPlayer,
      nextBoardIndex: state.nextBoardIndex,
      winner: state.winner,
    }
  }

  /**
   * Compute status for all 9 small boards.
   */
  private computeSmallBoardStates() {
    return this.state.bigBoard.map(board => evaluateBoardStatus(board))
  }

  /**
   * Apply a move to the model.
   * Returns { ok: true } if successful, { ok: false, reason: <error> } if invalid.
   */
  applyMove(move: Move): MoveResult {
    const { board: boardIdx, cell: cellIdx } = move

    // Validate bounds
    if (boardIdx < 0 || boardIdx > 8 || cellIdx < 0 || cellIdx > 8) {
      return { ok: false, reason: 'OUT_OF_BOUNDS' }
    }

    // Game must be ongoing
    if (this.state.winner !== null) {
      return { ok: false, reason: 'GAME_FINISHED' }
    }

    // Cell must be empty
    if (this.state.bigBoard[boardIdx][cellIdx] !== null) {
      return { ok: false, reason: 'CELL_OCCUPIED' }
    }

    // Check constraint: forced board routing
    const forcedBoardIdx = this.state.nextBoardIndex
    if (forcedBoardIdx !== null) {
      const forcedBoardStatus = this.smallBoardStatesCache[forcedBoardIdx].status
      // If forced board is OPEN, move must target that board
      if (forcedBoardStatus === 'OPEN' && boardIdx !== forcedBoardIdx) {
        return { ok: false, reason: 'FORCED_BOARD_MISMATCH' }
      }
      // If forced board is closed (WON/DRAW), free choice applies (no constraint)
    }

    // Target board must be OPEN
    if (this.smallBoardStatesCache[boardIdx].status !== 'OPEN') {
      return { ok: false, reason: 'BOARD_CLOSED' }
    }

    // Apply move (mutate state)
    this.state.bigBoard[boardIdx][cellIdx] = this.state.currentPlayer

    // Re-evaluate small board states
    this.smallBoardStatesCache = this.computeSmallBoardStates()

    // Check for big board win
    const smallBoardWinners = this.smallBoardStatesCache.map(s => s.winner)
    const bigWinner = checkBigWin(smallBoardWinners)
    if (bigWinner) {
      this.state.winner = bigWinner
    } else if (this.smallBoardStatesCache.every(s => s.status !== 'OPEN')) {
      // All small boards closed, no winner -> draw
      this.state.winner = 'Draw' as any // GameState.winner type issue
    }

    // Compute next constraint
    const nextBoardIdx = cellIdx
    if (this.smallBoardStatesCache[nextBoardIdx].status === 'OPEN') {
      this.state.nextBoardIndex = nextBoardIdx
    } else {
      this.state.nextBoardIndex = null // forced board closed -> free choice
    }

    // Toggle player
    this.state.currentPlayer = this.state.currentPlayer === 'X' ? 'O' : 'X'

    return { ok: true }
  }

  /**
   * Get current legal moves.
   */
  getLegalMoves(): Move[] {
    if (this.state.winner !== null) return []

    const moves: Move[] = []
    const forcedBoardIdx = this.state.nextBoardIndex

    // If forced board is set and OPEN, only that board
    if (forcedBoardIdx !== null) {
      const forcedBoardStatus = this.smallBoardStatesCache[forcedBoardIdx].status
      if (forcedBoardStatus === 'OPEN') {
        for (let cell = 0; cell < 9; cell++) {
          if (this.state.bigBoard[forcedBoardIdx][cell] === null) {
            moves.push({ board: forcedBoardIdx, cell })
          }
        }
        return moves
      }
      // Forced board closed -> fall through to free choice
    }

    // Free choice: any open board
    for (let board = 0; board < 9; board++) {
      if (this.smallBoardStatesCache[board].status === 'OPEN') {
        for (let cell = 0; cell < 9; cell++) {
          if (this.state.bigBoard[board][cell] === null) {
            moves.push({ board, cell })
          }
        }
      }
    }

    return moves
  }

  /**
   * Get current constraint state.
   */
  getConstraint(): ConstraintState {
    const forcedBoardIdx = this.state.nextBoardIndex
    if (forcedBoardIdx !== null) {
      const forcedBoardStatus = this.smallBoardStatesCache[forcedBoardIdx].status
      if (forcedBoardStatus === 'OPEN') {
        return { type: 'FORCED', forcedBoardId: forcedBoardIdx }
      }
    }
    return { type: 'FREE' }
  }

  /**
   * Check if game is terminal (win or draw).
   */
  isTerminal(): boolean {
    return this.state.winner !== null
  }

  /**
   * Get snapshot of current state (deep clone).
   */
  stateSnapshot(): GameState {
    return this.deepClone(this.state)
  }

  /**
   * Get small board states (status + winner for each of 9 boards).
   */
  getSmallBoardStates(): { status: SimpleBoardStatus; winner: Player | null }[] {
    return [...this.smallBoardStatesCache]
  }

  /**
   * Reset model to initial state.
   */
  reset(): void {
    this.state = createNewGame()
    this.smallBoardStatesCache = this.computeSmallBoardStates()
  }
}
