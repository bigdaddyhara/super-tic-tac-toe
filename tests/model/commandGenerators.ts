/**
 * Command generators: fast-check arbitraries for stateful commands.
 *
 * These generate sequences of commands that fast-check uses to drive
 * the stateful model-based tests.
 */

import * as fc from 'fast-check'
import type { Command } from 'fast-check'
import {
  PlayLegalMoveCommand,
  AttemptIllegalMoveCommand,
  ResetGameCommand,
  IllegalMoveKind,
  GameModelWrapper,
  RealSystemWrapper,
} from './commands'

/**
 * Generate a PlayLegalMove command.
 * The movePickIndex is used to select from legal moves (via modulo).
 */
export function playLegalMoveArbitrary(): fc.Arbitrary<PlayLegalMoveCommand> {
  return fc.integer({ min: 0, max: 1000 }).map(idx => new PlayLegalMoveCommand(idx))
}

/**
 * Generate an AttemptIllegalMove command.
 * Parametrized by illegal move kind and target coordinates.
 */
export function attemptIllegalMoveArbitrary(): fc.Arbitrary<AttemptIllegalMoveCommand> {
  return fc
    .tuple(
      fc.constantFrom<IllegalMoveKind>(
        'WRONG_FORCED_BOARD',
        'CLOSED_BOARD',
        'OCCUPIED_CELL',
        'OUT_OF_BOUNDS',
      ),
      fc.integer({ min: -1, max: 10 }), // board (including out-of-bounds)
      fc.integer({ min: -1, max: 10 }), // cell (including out-of-bounds)
    )
    .map(([kind, board, cell]) => new AttemptIllegalMoveCommand(kind, board, cell))
}

/**
 * Generate a ResetGame command.
 */
export function resetGameArbitrary(): fc.Arbitrary<ResetGameCommand> {
  return fc.constant(new ResetGameCommand())
}

/**
 * Generate a mixed sequence of commands with weighted distribution.
 *
 * Default weights:
 * - PlayLegalMove: 70%
 * - AttemptIllegalMove: 20%
 * - ResetGame: 10%
 *
 * These weights ensure most commands are valid moves (to explore state space),
 * with occasional illegal attempts and resets.
 */
export function mixedCommandArbitrary(
  weightLegal: number = 70,
  weightIllegal: number = 20,
  weightReset: number = 10,
): fc.Arbitrary<Command<GameModelWrapper, RealSystemWrapper>> {
  // Normalize weights to probabilities
  const total = weightLegal + weightIllegal + weightReset
  const pLegal = weightLegal / total
  const pIllegal = weightIllegal / total
  
  return fc.nat({ max: 99 }).chain(n => {
    if (n < pLegal * 100) return playLegalMoveArbitrary()
    if (n < (pLegal + pIllegal) * 100) return attemptIllegalMoveArbitrary()
    return resetGameArbitrary()
  })
}

/**
 * Generate a command sequence (array of mixed commands).
 *
 * @param maxLength Maximum sequence length
 * @param minLength Minimum sequence length
 * @param weights Custom weights for command distribution
 */
export function commandSequenceArbitrary(
  maxLength: number = 50,
  minLength: number = 1,
  weights?: { legal?: number; illegal?: number; reset?: number },
): fc.Arbitrary<Command<GameModelWrapper, RealSystemWrapper>[]> {
  const commandArbitrary = weights
    ? mixedCommandArbitrary(weights.legal, weights.illegal, weights.reset)
    : mixedCommandArbitrary()

  return fc.array(commandArbitrary, { minLength, maxLength })
}

/**
 * Generate a command sequence focused on legal moves only (no illegal/reset).
 * Useful for exploring deep state space without disruption.
 */
export function legalMoveSequenceArbitrary(
  maxLength: number = 100,
  minLength: number = 1,
): fc.Arbitrary<Command<GameModelWrapper, RealSystemWrapper>[]> {
  return fc.array(playLegalMoveArbitrary(), { minLength, maxLength })
}

/**
 * Generate a command sequence with frequent resets (stress-test reset logic).
 */
export function resetHeavySequenceArbitrary(
  maxLength: number = 30,
  minLength: number = 1,
): fc.Arbitrary<Command<GameModelWrapper, RealSystemWrapper>[]> {
  return commandSequenceArbitrary(maxLength, minLength, {
    legal: 50,
    illegal: 10,
    reset: 40,
  })
}

/**
 * Generate a command sequence with frequent illegal attempts.
 * Useful for testing error handling and constraint enforcement.
 */
export function illegalHeavySequenceArbitrary(
  maxLength: number = 30,
  minLength: number = 1,
): fc.Arbitrary<Command<GameModelWrapper, RealSystemWrapper>[]> {
  return commandSequenceArbitrary(maxLength, minLength, {
    legal: 50,
    illegal: 45,
    reset: 5,
  })
}
