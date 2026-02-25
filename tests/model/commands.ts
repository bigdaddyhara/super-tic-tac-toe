/**
 * Command catalogue for stateful model-based testing.
 *
 * Each command implements fast-check's Command<Model, Real> interface:
 *   check(m)  → boolean  : precondition; false = skip this command
 *   run(m, r) → void     : execute on both model and real, then assert
 *   toString()           : for fast-check shrink/report output
 *
 * Model = GameModelWrapper  (game: GameModel, trace: TraceStep[])
 * Real  = RealSystemWrapper (state: GameState)
 */

import type { Command } from 'fast-check'
import { GameState, Move } from '../../src/types/game-types'
import { applyMove } from '../../src/game/engine'
import { getLegalMoves } from '../../src/game/legal-moves'
import { createNewGame } from '../../src/game/state'
import { GameModel } from './GameModel'
import { assertAllAgreements, assertBothRejected } from './agreements'
import {
  assertPlayerCountConsistency,
  assertTurnMonotonicity,
  assertGameStatusConsistency,
  assertNoDoubleOccupancy,
  assertOccupancyDecreasedByOne,
  assertNoOccupiedCellOverwrite,
  assertForcedBoardConstraintEnforcement,
  assertFreeMoveConstraintValidity,
  assertConstraintAdvanceLogic,
  assertClosedBoardsHaveZeroMoves,
  assertTerminalGameRejectsMoves,
} from '../pbt/invariants'
import { TraceStep, gameStatusFromState } from './traceFormatter'

// ─── Shared wrapper types ──────────────────────────────────────────────────────

export interface GameModelWrapper {
  game: GameModel
  trace: TraceStep[]
}

export interface RealSystemWrapper {
  state: GameState
}

// ─── PlayLegalMoveCommand ──────────────────────────────────────────────────────

/**
 * Pick the (movePickIndex % legalMoves.length)-th legal move and apply it to
 * both model and real engine.  After the move assert:
 *   • All 5 model/SUT agreements
 *   • Turn-level invariants (player count, monotonicity, …)
 *   • Cell-level invariants (no double-occupancy, …)
 *   • Constraint-routing invariants on the post-move real state
 */
export class PlayLegalMoveCommand
  implements Command<GameModelWrapper, RealSystemWrapper>
{
  constructor(private readonly movePickIndex: number) {}

  check(m: Readonly<GameModelWrapper>): boolean {
    return !m.game.isTerminal() && m.game.getLegalMoves().length > 0
  }

  run(m: GameModelWrapper, r: RealSystemWrapper): void {
    const legalMoves = m.game.getLegalMoves()
    const move = legalMoves[this.movePickIndex % legalMoves.length]
    const stepIndex = m.trace.length
    const stateBefore = r.state
    const constraintBefore = m.game.getConstraint()

    // Apply on model
    const modelResult = m.game.applyMove(move)
    if (!modelResult.ok) {
      throw new Error(
        `[PlayLegalMoveCommand step ${stepIndex}] Model rejected a move from its own legal set: ${modelResult.reason}`,
      )
    }

    // Apply on real engine
    const { nextState } = applyMove(r.state, move)
    r.state = nextState
    const stateAfter = r.state

    // 5 model/SUT agreements
    assertAllAgreements(m.game, stateAfter)

    // Turn-level invariants
    assertPlayerCountConsistency(stateAfter)
    assertTurnMonotonicity(stateBefore, stateAfter)
    assertGameStatusConsistency(stateAfter)

    // Cell-level invariants
    assertNoDoubleOccupancy(stateBefore, stateAfter)
    assertOccupancyDecreasedByOne(stateBefore, stateAfter)
    assertNoOccupiedCellOverwrite(stateBefore, stateAfter, move)

    // Constraint-routing invariants on post-state
    assertForcedBoardConstraintEnforcement(stateAfter)
    assertFreeMoveConstraintValidity(stateAfter)
    assertConstraintAdvanceLogic(stateBefore, stateAfter, move)
    assertClosedBoardsHaveZeroMoves(stateAfter)
    if (stateAfter.winner !== null) assertTerminalGameRejectsMoves(stateAfter)

    m.trace.push({
      stepIndex,
      commandName: 'PlayLegalMove',
      moveAttempted: move,
      constraintBefore,
      constraintAfter: m.game.getConstraint(),
      playerBefore: stateBefore.currentPlayer,
      playerAfter: stateAfter.currentPlayer,
      statusBefore: gameStatusFromState(stateBefore),
      statusAfter: gameStatusFromState(stateAfter),
      legalMovesAfter: getLegalMoves(stateAfter).length,
      errorThrown: null,
      agreementsOk: true,
    })
  }

  toString(): string {
    return `PlayLegalMove(pick=${this.movePickIndex})`
  }
}

// ─── AttemptIllegalMoveCommand ─────────────────────────────────────────────────

/**
 * Attempt a move that is NOT in the model's current legal-move set.
 *
 * Strategies (controlled by illegalKind):
 *   WRONG_FORCED_BOARD — target a different board when forced board is open
 *   CLOSED_BOARD       — target a WON or DRAW small board
 *   OCCUPIED_CELL      — target a cell already marked
 *   OUT_OF_BOUNDS      — board or cell index outside 0-8
 *
 * check() verifies the generated move is not legal at the current model state;
 * if state evolved so it became legal, fast-check skips the command.
 */
export type IllegalMoveKind =
  | 'WRONG_FORCED_BOARD'
  | 'CLOSED_BOARD'
  | 'OCCUPIED_CELL'
  | 'OUT_OF_BOUNDS'

export class AttemptIllegalMoveCommand
  implements Command<GameModelWrapper, RealSystemWrapper>
{
  constructor(
    private readonly kind: IllegalMoveKind,
    private readonly board: number,
    private readonly cell: number,
  ) {}

  check(m: Readonly<GameModelWrapper>): boolean {
    if (m.game.isTerminal()) return false
    const legal = m.game.getLegalMoves()
    return !legal.some(lm => lm.board === this.board && lm.cell === this.cell)
  }

  run(m: GameModelWrapper, r: RealSystemWrapper): void {
    const move: Move = { board: this.board, cell: this.cell }
    const stepIndex = m.trace.length
    const stateBefore = JSON.parse(JSON.stringify(r.state)) as GameState
    const constraintBefore = m.game.getConstraint()

    // Attempt on model — expect rejection
    const modelResult = m.game.applyMove(move)

    // Attempt on real engine — expect error thrown
    let realThrewError = false
    let realErrorMsg: string | null = null
    try {
      applyMove(r.state, move)
    } catch (e) {
      realThrewError = true
      realErrorMsg = e instanceof Error ? e.constructor.name : String(e)
    }

    // Both must reject
    assertBothRejected(modelResult.ok, realThrewError, move)

    // Real state must be unchanged after rejected move
    if (JSON.stringify(r.state) !== JSON.stringify(stateBefore)) {
      throw new Error(
        `[AttemptIllegalMoveCommand step ${stepIndex}] SUT state mutated after rejecting illegal move B${move.board}C${move.cell}`,
      )
    }

    m.trace.push({
      stepIndex,
      commandName: 'AttemptIllegalMove',
      moveAttempted: move,
      constraintBefore,
      constraintAfter: m.game.getConstraint(),
      playerBefore: stateBefore.currentPlayer,
      playerAfter: r.state.currentPlayer,
      statusBefore: gameStatusFromState(stateBefore),
      statusAfter: gameStatusFromState(r.state),
      legalMovesAfter: getLegalMoves(r.state).length,
      errorThrown: realErrorMsg,
      agreementsOk: true,
    })
  }

  toString(): string {
    return `AttemptIllegalMove(${this.kind} B${this.board}C${this.cell})`
  }
}

// ─── ResetGameCommand ──────────────────────────────────────────────────────────

/**
 * Reset both model and real to the canonical initial state.
 * Always applicable (no preconditions).
 * Clears move history and asserts full agreement on the fresh state.
 */
export class ResetGameCommand
  implements Command<GameModelWrapper, RealSystemWrapper>
{
  check(_m: Readonly<GameModelWrapper>): boolean {
    return true
  }

  run(m: GameModelWrapper, r: RealSystemWrapper): void {
    const stateBefore = r.state
    const constraintBefore = m.game.getConstraint()

    // Reset both sides
    m.game.reset()
    m.trace = []
    r.state = createNewGame()

    // Assert all 5 agreements on fresh state
    assertAllAgreements(m.game, r.state)

    const fresh = r.state
    if (fresh.currentPlayer !== 'X')
      throw new Error(`[ResetGameCommand] currentPlayer should be X, got ${fresh.currentPlayer}`)
    if (fresh.winner !== null)
      throw new Error(`[ResetGameCommand] winner should be null, got ${fresh.winner}`)
    if (fresh.nextBoardIndex !== null)
      throw new Error(`[ResetGameCommand] nextBoardIndex should be null, got ${fresh.nextBoardIndex}`)
    const occupied = fresh.bigBoard.flat().filter(c => c !== null).length
    if (occupied !== 0)
      throw new Error(`[ResetGameCommand] Expected 0 occupied cells, got ${occupied}`)

    m.trace.push({
      stepIndex: 0,
      commandName: 'ResetGame',
      moveAttempted: null,
      constraintBefore,
      constraintAfter: m.game.getConstraint(),
      playerBefore: stateBefore.currentPlayer,
      playerAfter: fresh.currentPlayer,
      statusBefore: gameStatusFromState(stateBefore),
      statusAfter: gameStatusFromState(fresh),
      legalMovesAfter: getLegalMoves(fresh).length,
      errorThrown: null,
      agreementsOk: true,
    })
  }

  toString(): string {
    return 'ResetGame()'
  }
}
