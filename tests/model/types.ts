/**
 * Type definitions for stateful model-based testing.
 *
 * These types support the command-driven test framework where a lightweight
 * game model and the real SUT (engine) execute the same command sequence.
 */

import { GameState, Move, Player } from '../../src/types/game-types'

/**
 * Constraint state: whether the next player has free choice or must play
 * in a specific forced board.
 */
export interface ConstraintState {
  type: 'FORCED' | 'FREE'
  forcedBoardId?: number // 0-8 if FORCED, undefined if FREE
}

/**
 * Small board status (simplified from engine's SmallBoardStatus).
 */
export type SimpleBoardStatus = 'OPEN' | 'WON' | 'DRAW'

/**
 * Game status for trace records (human-readable).
 */
export type TraceGameStatus = 'ONGOING' | 'WIN_X' | 'WIN_O' | 'DRAW'

/**
 * Result of attempting a move on the model.
 */
export interface MoveResult {
  ok: boolean
  reason?: string // error reason if !ok
}

/**
 * Error codes matching engine error types.
 */
export type ErrorCode =
  | 'OUT_OF_BOUNDS'
  | 'GAME_FINISHED'
  | 'CELL_OCCUPIED'
  | 'BOARD_CLOSED'
  | 'FORCED_BOARD_MISMATCH'
  | 'UNKNOWN'

/**
 * Trace record captured after each command execution.
 * Minimal by default; comprehensive diagnostics captured on failure.
 */
export interface TraceStep {
  stepIndex: number
  commandName: 'PlayLegalMove' | 'AttemptIllegalMove' | 'ResetGame'
  moveAttempted: Move | null
  constraintBefore: ConstraintState
  constraintAfter: ConstraintState
  playerBefore: Player
  playerAfter: Player
  statusBefore: TraceGameStatus
  statusAfter: TraceGameStatus
  legalMovesAfter: number // count only for performance
  errorThrown: string | null
  agreementsOk: boolean // true if all 5 agreements passed
}

/**
 * Full failure artifact saved to tests/failures/ on assertion failure.
 */
export interface FailureArtifact {
  metadata: {
    testName: string
    timestamp: string
    seed: number
    budget: string
    systemInfo: {
      os: string
      node: string
    }
  }
  failure: {
    stepIndex: number
    failingCommand: string
    failingMove: Move | null
    errorMessage: string
    agreementsFailed: string[]
    invariantsFailed: string[]
  }
  trace: TraceStep[]
  minimalTrace: TraceStep[]
  stateComparison: {
    model: GameState
    real: GameState
  }
}

/**
 * Command interface (extends fast-check's Command<M, R>).
 */
export interface StatefulCommand<M, R> {
  check(m: Readonly<M>): boolean
  run(m: M, r: R): void
  toString(): string
}
