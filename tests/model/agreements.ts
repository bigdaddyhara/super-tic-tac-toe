/**
 * Agreement assertions: verify model and real SUT match on key aspects.
 *
 * After every command, these assertions ensure:
 * 1. Full state equality (bigBoard, currentPlayer, nextBoardIndex, winner)
 * 2. Constraint type & forced board agreement
 * 3. Legal move set agreement (same moves, same count)
 * 4. Terminal status agreement
 * 5. Small board status agreement (each of 9 boards)
 */

import { GameState, Move } from '../../src/types/game-types'
import { getLegalMoves } from '../../src/game/legal-moves'
import { evaluateSmall } from '../../src/game/engine'
import { GameModel } from './GameModel'

/**
 * Assert full state equality between model and real.
 */
export function assertStateAgreement(model: GameModel, realState: GameState): void {
  const modelState = model.stateSnapshot()

  // Compare bigBoard (deep equality)
  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      if (modelState.bigBoard[b][c] !== realState.bigBoard[b][c]) {
        throw new Error(
          `State disagreement: bigBoard[${b}][${c}]: model=${modelState.bigBoard[b][c]}, real=${realState.bigBoard[b][c]}`,
        )
      }
    }
  }

  // Compare currentPlayer
  if (modelState.currentPlayer !== realState.currentPlayer) {
    throw new Error(
      `State disagreement: currentPlayer: model=${modelState.currentPlayer}, real=${realState.currentPlayer}`,
    )
  }

  // Compare nextBoardIndex
  if (modelState.nextBoardIndex !== realState.nextBoardIndex) {
    throw new Error(
      `State disagreement: nextBoardIndex: model=${modelState.nextBoardIndex}, real=${realState.nextBoardIndex}`,
    )
  }

  // Compare winner
  if (modelState.winner !== realState.winner) {
    throw new Error(
      `State disagreement: winner: model=${modelState.winner}, real=${realState.winner}`,
    )
  }
}

/**
 * Assert constraint agreement (FORCED vs FREE, and forced board id if FORCED).
 */
export function assertConstraintAgreement(
  model: GameModel,
  realState: GameState,
): void {
  const modelConstraint = model.getConstraint()

  // Compute real constraint
  let realConstraint: { type: 'FORCED' | 'FREE'; forcedBoardId?: number }
  if (realState.nextBoardIndex !== null) {
    const forcedBoard = realState.bigBoard[realState.nextBoardIndex]
    const forcedStatus = evaluateSmall(forcedBoard)
    if (forcedStatus.status === 'Open') {
      realConstraint = { type: 'FORCED', forcedBoardId: realState.nextBoardIndex }
    } else {
      realConstraint = { type: 'FREE' }
    }
  } else {
    realConstraint = { type: 'FREE' }
  }

  // Compare
  if (modelConstraint.type !== realConstraint.type) {
    throw new Error(
      `Constraint disagreement: type: model=${modelConstraint.type}, real=${realConstraint.type}`,
    )
  }

  if (modelConstraint.type === 'FORCED' && realConstraint.type === 'FORCED') {
    if (modelConstraint.forcedBoardId !== realConstraint.forcedBoardId) {
      throw new Error(
        `Constraint disagreement: forcedBoardId: model=${modelConstraint.forcedBoardId}, real=${realConstraint.forcedBoardId}`,
      )
    }
  }
}

/**
 * Assert legal move set agreement (same moves, same count).
 */
export function assertLegalMoveAgreement(
  model: GameModel,
  realLegalMoves: Move[],
): void {
  const modelMoves = model.getLegalMoves()

  // Count must match
  if (modelMoves.length !== realLegalMoves.length) {
    throw new Error(
      `Legal move count disagreement: model=${modelMoves.length}, real=${realLegalMoves.length}`,
    )
  }

  // Every model move must exist in real moves
  for (const mm of modelMoves) {
    const found = realLegalMoves.some(
      rm => rm.board === mm.board && rm.cell === mm.cell,
    )
    if (!found) {
      throw new Error(
        `Legal move disagreement: model has B${mm.board}C${mm.cell} but real does not`,
      )
    }
  }

  // Every real move must exist in model moves
  for (const rm of realLegalMoves) {
    const found = modelMoves.some(mm => mm.board === rm.board && mm.cell === rm.cell)
    if (!found) {
      throw new Error(
        `Legal move disagreement: real has B${rm.board}C${rm.cell} but model does not`,
      )
    }
  }
}

/**
 * Assert terminal status agreement.
 */
export function assertTerminalAgreement(
  model: GameModel,
  realState: GameState,
  realLegalMoves: Move[],
): void {
  const modelIsTerminal = model.isTerminal()
  const realIsTerminal = realState.winner !== null || realLegalMoves.length === 0

  if (modelIsTerminal !== realIsTerminal) {
    throw new Error(
      `Terminal status disagreement: model=${modelIsTerminal}, real=${realIsTerminal}`,
    )
  }
}

/**
 * Assert small board status agreement (for each of 9 boards).
 */
export function assertSmallBoardStatusAgreement(
  model: GameModel,
  realState: GameState,
): void {
  const modelStates = model.getSmallBoardStates()

  for (let b = 0; b < 9; b++) {
    const realBoard = realState.bigBoard[b]
    const realEval = evaluateSmall(realBoard)
    const modelStatus = modelStates[b].status
    const modelWinner = modelStates[b].winner

    // Map engine's status to model's status
    const realStatus =
      realEval.status === 'Open' ? 'OPEN' : realEval.status === 'Won' ? 'WON' : 'DRAW'

    if (modelStatus !== realStatus) {
      throw new Error(
        `Small board ${b} status disagreement: model=${modelStatus}, real=${realStatus}`,
      )
    }

    if (modelWinner !== realEval.winner) {
      throw new Error(
        `Small board ${b} winner disagreement: model=${modelWinner}, real=${realEval.winner}`,
      )
    }
  }
}

/**
 * Assert all 5 agreements in one call (convenience for commands).
 */
export function assertAllAgreements(model: GameModel, realState: GameState): void {
  const realLegalMoves = getLegalMoves(realState)

  assertStateAgreement(model, realState)
  assertConstraintAgreement(model, realState)
  assertLegalMoveAgreement(model, realLegalMoves)
  assertTerminalAgreement(model, realState, realLegalMoves)
  assertSmallBoardStatusAgreement(model, realState)
}

/**
 * Assert that both model and real rejected an illegal move.
 */
export function assertBothRejected(
  modelAccepted: boolean,
  realThrewError: boolean,
  move: Move,
): void {
  if (modelAccepted && !realThrewError) {
    throw new Error(
      `Illegal move B${move.board}C${move.cell}: both model and real ACCEPTED (should reject)`,
    )
  }
  if (modelAccepted && realThrewError) {
    throw new Error(
      `Illegal move B${move.board}C${move.cell}: model accepted but real rejected`,
    )
  }
  if (!modelAccepted && !realThrewError) {
    throw new Error(
      `Illegal move B${move.board}C${move.cell}: model rejected but real accepted`,
    )
  }
  // Both rejected: OK
}
