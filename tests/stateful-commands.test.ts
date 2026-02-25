/**
 * Stateful model-based testing for Ultimate Tic-Tac-Toe.
 *
 * This test suite uses fast-check's command-driven approach where a lightweight
 * game model and the real SUT (engine) execute the same command sequence. After
 * every command, assertions verify that both state machines agree on:
 * - Full game state (bigBoard, currentPlayer, nextBoardIndex, winner)
 * - Constraint routing (FORCED vs FREE, forced board id)
 * - Legal move set (count and exact moves)
 * - Terminal status transitions
 * - Small board status (OPEN/WON/DRAW for each of 9 boards)
 *
 * Tests run with configurable budgets (CI/LOCAL/NIGHTLY) via PBT_BUDGET env variable.
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { GameModel } from './model/GameModel'
import { createNewGame } from '../src/game/state'
import { getActiveBudget } from './pbt/config'
import {
  commandSequenceArbitrary,
  legalMoveSequenceArbitrary,
  resetHeavySequenceArbitrary,
  illegalHeavySequenceArbitrary,
} from './model/commandGenerators'
import { prettyPrintTrace } from './model/traceFormatter'
import type { GameModelWrapper, RealSystemWrapper } from './model/commands'
import type { Command } from 'fast-check'

const budget = getActiveBudget()
const verbose = process.env.VERBOSE === 'true' || budget.verbose

describe('Stateful Model-Based Testing: Ultimate Tic-Tac-Toe', () => {
  // ─── TEST 1: Legal Moves Only (Deep State Exploration) ─────────────────────
  
  describe(`1. Legal Moves Only - Deep State Exploration (budget: ${process.env.PBT_BUDGET || 'CI'})`, () => {
    it(`should maintain all agreements across legal move sequences [${budget.numRuns} runs]`, () => {
      fc.assert(
        fc.property(legalMoveSequenceArbitrary(budget.maxSequenceLength), commands => {
          const model: GameModelWrapper = {
            game: new GameModel(createNewGame()),
            trace: [],
          }
          const real: RealSystemWrapper = {
            state: createNewGame(),
          }

          try {
            fc.modelRun(() => ({ model, real }), commands)
          } catch (error) {
            // On failure, log trace for debugging
            if (verbose) {
              console.error('\n' + '═'.repeat(70))
              console.error('FAILURE: Legal Move Sequence')
              console.error('═'.repeat(70))
              console.error(prettyPrintTrace(model.trace))
              console.error('Error:', error)
            }
            throw error
          }
        }),
        {
          numRuns: budget.numRuns,
          verbose,
        },
      )
    })

    it(`should reach terminal states correctly through legal play [${Math.floor(budget.numRuns / 3)} runs]`, () => {
      fc.assert(
        fc.property(
          legalMoveSequenceArbitrary(Math.min(150, budget.maxSequenceLength)),
          commands => {
            const model: GameModelWrapper = {
              game: new GameModel(createNewGame()),
              trace: [],
            }
            const real: RealSystemWrapper = {
              state: createNewGame(),
            }

            try {
              fc.modelRun(() => ({ model, real }), commands)

              // If game reached terminal state, verify no further moves possible
              if (model.game.isTerminal()) {
                const legalMoves = model.game.getLegalMoves()
                if (legalMoves.length !== 0) {
                  throw new Error(
                    `Terminal state but ${legalMoves.length} legal moves exist`,
                  )
                }
              }
            } catch (error) {
              if (verbose) {
                console.error('\n' + '═'.repeat(70))
                console.error('FAILURE: Terminal State Detection')
                console.error('═'.repeat(70))
                console.error(prettyPrintTrace(model.trace))
                console.error('Error:', error)
              }
              throw error
            }
          },
        ),
        {
          numRuns: Math.floor(budget.numRuns / 3),
          verbose,
        },
      )
    })
  })

  // ─── TEST 2: Illegal Moves (Error Handling) ────────────────────────────────
  
  describe('2. Illegal Moves - Error Handling', () => {
    it(`should reject illegal moves identically on model and real [${budget.numRuns} runs]`, () => {
      fc.assert(
        fc.property(illegalHeavySequenceArbitrary(30), commands => {
          const model: GameModelWrapper = {
            game: new GameModel(createNewGame()),
            trace: [],
          }
          const real: RealSystemWrapper = {
            state: createNewGame(),
          }

          try {
            fc.modelRun(() => ({ model, real }), commands)
          } catch (error) {
            if (verbose) {
              console.error('\n' + '═'.repeat(70))
              console.error('FAILURE: Illegal Move Rejection')
              console.error('═'.repeat(70))
              console.error(prettyPrintTrace(model.trace))
              console.error('Error:', error)
            }
            throw error
          }
        }),
        {
          numRuns: budget.numRuns,
          verbose,
        },
      )
    })

    it(`should leave state unchanged after rejected moves [${Math.floor(budget.numRuns / 2)} runs]`, () => {
      fc.assert(
        fc.property(illegalHeavySequenceArbitrary(20), commands => {
          const model: GameModelWrapper = {
            game: new GameModel(createNewGame()),
            trace: [],
          }
          const real: RealSystemWrapper = {
            state: createNewGame(),
          }

          try {
            fc.modelRun(() => ({ model, real }), commands)
          } catch (error) {
            if (verbose) {
              console.error('\n' + '═'.repeat(70))
              console.error('FAILURE: State Unchanged After Rejection')
              console.error('═'.repeat(70))
              console.error(prettyPrintTrace(model.trace))
              console.error('Error:', error)
            }
            throw error
          }
        }),
        {
          numRuns: Math.floor(budget.numRuns / 2),
          verbose,
        },
      )
    })
  })

  // ─── TEST 3: Resets (State Reset Logic) ────────────────────────────────────
  
  describe('3. Resets - State Reset Logic', () => {
    it(`should reset both model and real to initial state [${budget.numRuns} runs]`, () => {
      fc.assert(
        fc.property(resetHeavySequenceArbitrary(30), commands => {
          const model: GameModelWrapper = {
            game: new GameModel(createNewGame()),
            trace: [],
          }
          const real: RealSystemWrapper = {
            state: createNewGame(),
          }

          try {
            fc.modelRun(() => ({ model, real }), commands)
          } catch (error) {
            if (verbose) {
              console.error('\n' + '═'.repeat(70))
              console.error('FAILURE: Reset Sequence')
              console.error('═'.repeat(70))
              console.error(prettyPrintTrace(model.trace))
              console.error('Error:', error)
            }
            throw error
          }
        }),
        {
          numRuns: budget.numRuns,
          verbose,
        },
      )
    })
  })

  // ─── TEST 4: Mixed Sequences (Combined Commands) ───────────────────────────
  
  describe('4. Mixed Sequences - Combined Commands', () => {
    it(`should maintain all invariants across mixed commands [${budget.numRuns} runs]`, () => {
      fc.assert(
        fc.property(
          commandSequenceArbitrary(budget.maxSequenceLength),
          (commands: Command<GameModelWrapper, RealSystemWrapper>[]) => {
            const model: GameModelWrapper = {
              game: new GameModel(createNewGame()),
              trace: [],
            }
            const real: RealSystemWrapper = {
              state: createNewGame(),
            }

            try {
              fc.modelRun(() => ({ model, real }), commands)
            } catch (error) {
              if (verbose) {
                console.error('\n' + '═'.repeat(70))
                console.error('FAILURE: Mixed Command Sequence')
                console.error('═'.repeat(70))
                console.error(prettyPrintTrace(model.trace))
                console.error('Error:', error)
              }
              throw error
            }
          },
        ),
        {
          numRuns: budget.numRuns,
          verbose,
        },
      )
    })
  })

  // ─── TEST 5: Constraint Routing (Specific Checks) ──────────────────────────
  
  describe('5. Constraint Routing - Forced Board Transitions', () => {
    it(`should correctly transition between FORCED and FREE constraints [${budget.numRuns} runs]`, () => {
      fc.assert(
        fc.property(
          commandSequenceArbitrary(Math.min(100, budget.maxSequenceLength)),
          (commands: Command<GameModelWrapper, RealSystemWrapper>[]) => {
            const model: GameModelWrapper = {
              game: new GameModel(createNewGame()),
              trace: [],
            }
            const real: RealSystemWrapper = {
              state: createNewGame(),
            }

            try {
              fc.modelRun(() => ({ model, real }), commands)
            } catch (error) {
              if (verbose) {
                console.error('\n' + '═'.repeat(70))
                console.error('FAILURE: Constraint Routing Transitions')
                console.error('═'.repeat(70))
                console.error(prettyPrintTrace(model.trace))
                console.error('Error:', error)
              }
              throw error
            }
          },
        ),
        {
          numRuns: budget.numRuns,
          verbose,
        },
      )
    })

    it(`should enforce forced board constraints strictly [${Math.floor(budget.numRuns / 2)} runs]`, () => {
      fc.assert(
        fc.property(
          commandSequenceArbitrary(50, 10, { legal: 80, illegal: 15, reset: 5 }),
          (commands: Command<GameModelWrapper, RealSystemWrapper>[]) => {
            const model: GameModelWrapper = {
              game: new GameModel(createNewGame()),
              trace: [],
            }
            const real: RealSystemWrapper = {
              state: createNewGame(),
            }

            try {
              fc.modelRun(() => ({ model, real }), commands)

              // Count constraint violations (should be 0)
              const violations = model.trace.filter(
                step =>
                  step.constraintBefore.type === 'FORCED' &&
                  step.commandName === 'PlayLegalMove' &&
                  step.moveAttempted &&
                  step.moveAttempted.board !== step.constraintBefore.forcedBoardId,
              )

              if (violations.length > 0) {
                throw new Error(
                  `Found ${violations.length} constraint violations in trace`,
                )
              }
            } catch (error) {
              if (verbose) {
                console.error('\n' + '═'.repeat(70))
                console.error('FAILURE: Forced Board Constraint Enforcement')
                console.error('═'.repeat(70))
                console.error(prettyPrintTrace(model.trace))
                console.error('Error:', error)
              }
              throw error
            }
          },
        ),
        {
          numRuns: Math.floor(budget.numRuns / 2),
          verbose,
        },
      )
    })
  })

  // ─── TEST 6: Terminal States (End-Game Logic) ──────────────────────────────
  
  describe('6. Terminal States - End-Game Logic', () => {
    it(`should detect terminal states correctly [${Math.floor(budget.numRuns / 2)} runs]`, () => {
      fc.assert(
        fc.property(
          legalMoveSequenceArbitrary(Math.min(150, budget.maxSequenceLength)),
          commands => {
            const model: GameModelWrapper = {
              game: new GameModel(createNewGame()),
              trace: [],
            }
            const real: RealSystemWrapper = {
              state: createNewGame(),
            }

            try {
              fc.modelRun(() => ({ model, real }), commands)

              // Once terminal, no legal moves should exist
              if (model.game.isTerminal()) {
                const legalMoves = model.game.getLegalMoves()
                if (legalMoves.length !== 0) {
                  throw new Error(
                    `Terminal state has ${legalMoves.length} legal moves (should be 0)`,
                  )
                }
              }
            } catch (error) {
              if (verbose) {
                console.error('\n' + '═'.repeat(70))
                console.error('FAILURE: Terminal State Detection')
                console.error('═'.repeat(70))
                console.error(prettyPrintTrace(model.trace))
                console.error('Error:', error)
              }
              throw error
            }
          },
        ),
        {
          numRuns: Math.floor(budget.numRuns / 2),
          verbose,
        },
      )
    })
  })
})
