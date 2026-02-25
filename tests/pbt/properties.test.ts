/**
 * Property-based tests for Ultimate Tic-Tac-Toe engine.
 * Tests 16 properties using fast-check with reachability-based state generation.
 * 
 * Run with:
 *   npm test -- tests/pbt/properties.test.ts
 * 
 * Set budget:
 *   PBT_BUDGET=CI npm test       # 300 runs, quick
 *   PBT_BUDGET=LOCAL npm test    # 5000 runs, thorough
 *   PBT_BUDGET=NIGHTLY npm test  # 3100 runs, stress
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { moveSequenceArbitrary, GeneratorError, MoveSequenceResult } from './generators'
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
  assertNoIllegalMovesReturned,
  assertClosedBoardsHaveZeroMoves,
  assertBoardClosureConsistency,
  assertTerminalGameRejectsMoves,
  assertMoveSequenceTerminatesCorrectly,
  assertAllPostMoveInvariants,
  InvariantViolation,
} from './invariants'
import { captureFailure, prettyPrint, prettyPrintMoveSequence } from './logging'
import { getActiveBudget } from './config'

const config = getActiveBudget()

/**
 * Helper to run a property test with failure capture.
 */
function runPropertyTest(
  testName: string,
  invariantName: string,
  testFn: (result: MoveSequenceResult) => void
) {
  fc.assert(
    fc.property(moveSequenceArbitrary, (result) => {
      try {
        testFn(result)
      } catch (error) {
        // Skip generator errors (they're not property failures)
        if (error instanceof GeneratorError) {
          console.warn(`Generator error in ${testName}: ${error.message}`)
          return
        }
        
        // Capture invariant violations
        if (error instanceof InvariantViolation) {
          // Find the failing step
          let failingStepIndex = result.length - 1
          let stateBefore = result.stateHistory[failingStepIndex]
          let stateAfter = result.stateHistory[failingStepIndex + 1] || result.finalState
          let failingMove = result.moveSequence[failingStepIndex] || null
          
          // Capture the failure
          captureFailure({
            testName,
            timestamp: new Date().toISOString(),
            seed: (fc as any).configuredParameters?.seed || 0,
            path: (fc as any).configuredParameters?.path || '',
            shrunkSequenceLength: result.length,
            initialState: result.initialState,
            moveSequence: result.moveSequence,
            stateHistory: result.stateHistory,
            failingStepIndex,
            failingMove,
            stateBefore,
            stateAfter: stateAfter || null,
            invariantName,
            errorMessage: error.message,
            stackTrace: error.stack || '',
          })
        }
        
        // Re-throw to fail the test
        throw error
      }
    }),
    {
      numRuns: config.numRuns,
      verbose: config.verbose,
    }
  )
}

describe('Property-Based Tests: Ultimate Tic-Tac-Toe Engine', () => {
  it(`should run with budget: ${process.env.PBT_BUDGET || 'CI'} (${config.numRuns} runs, ${config.maxSequenceLength} max length)`, () => {
    expect(config).toBeDefined()
  })
  
  // ==========================================================================
  // TURN & PLAYER INVARIANTS
  // ==========================================================================
  
  describe('Turn & Player Invariants', () => {
    it('Property 1: Player Count Consistency', () => {
      runPropertyTest(
        'Property.1-PlayerCountConsistency',
        'PlayerCountConsistency',
        (result) => {
          // Check after every move
          for (let i = 1; i < result.stateHistory.length; i++) {
            assertPlayerCountConsistency(result.stateHistory[i])
          }
        }
      )
    })
    
    it('Property 2: Turn Monotonicity', () => {
      runPropertyTest(
        'Property.2-TurnMonotonicity',
        'TurnMonotonicity',
        (result) => {
          // Check transition between each state
          for (let i = 0; i < result.moveSequence.length; i++) {
            const stateBefore = result.stateHistory[i]
            const stateAfter = result.stateHistory[i + 1]
            assertTurnMonotonicity(stateBefore, stateAfter)
          }
        }
      )
    })
    
    it('Property 3: Game Status Consistency with Winner', () => {
      runPropertyTest(
        'Property.3-GameStatusConsistency',
        'GameStatusConsistency',
        (result) => {
          // Check final state (and any intermediate terminal states)
          for (const state of result.stateHistory) {
            assertGameStatusConsistency(state)
          }
        }
      )
    })
  })
  
  // ==========================================================================
  // MOVE APPLICATION INVARIANTS
  // ==========================================================================
  
  describe('Move Application Invariants', () => {
    it('Property 4: No Double-Occupancy', () => {
      runPropertyTest(
        'Property.4-NoDoubleOccupancy',
        'NoDoubleOccupancy',
        (result) => {
          for (let i = 0; i < result.moveSequence.length; i++) {
            const stateBefore = result.stateHistory[i]
            const stateAfter = result.stateHistory[i + 1]
            assertNoDoubleOccupancy(stateBefore, stateAfter)
          }
        }
      )
    })
    
    it('Property 5: Occupancy Decreases by 1', () => {
      runPropertyTest(
        'Property.5-OccupancyDecreasedByOne',
        'OccupancyDecreasedByOne',
        (result) => {
          for (let i = 0; i < result.moveSequence.length; i++) {
            const stateBefore = result.stateHistory[i]
            const stateAfter = result.stateHistory[i + 1]
            assertOccupancyDecreasedByOne(stateBefore, stateAfter)
          }
        }
      )
    })
    
    it('Property 6: Cell Never Overwrites', () => {
      runPropertyTest(
        'Property.6-NoOccupiedCellOverwrite',
        'NoOccupiedCellOverwrite',
        (result) => {
          for (let i = 0; i < result.moveSequence.length; i++) {
            const stateBefore = result.stateHistory[i]
            const stateAfter = result.stateHistory[i + 1]
            const move = result.moveSequence[i]
            assertNoOccupiedCellOverwrite(stateBefore, stateAfter, move)
          }
        }
      )
    })
  })
  
  // ==========================================================================
  // CONSTRAINT ROUTING INVARIANTS
  // ==========================================================================
  
  describe('Constraint Routing Invariants', () => {
    it('Property 7: Forced-Board Constraint Enforcement', () => {
      runPropertyTest(
        'Property.7-ForcedBoardConstraintEnforcement',
        'ForcedBoardConstraintEnforcement',
        (result) => {
          for (const state of result.stateHistory) {
            assertForcedBoardConstraintEnforcement(state)
          }
        }
      )
    })
    
    it('Property 8: Free-Move Constraint Validity', () => {
      runPropertyTest(
        'Property.8-FreeMoveConstraintValidity',
        'FreeMoveConstraintValidity',
        (result) => {
          for (const state of result.stateHistory) {
            assertFreeMoveConstraintValidity(state)
          }
        }
      )
    })
    
    it('Property 9: Constraint Advance Logic', () => {
      runPropertyTest(
        'Property.9-ConstraintAdvanceLogic',
        'ConstraintAdvanceLogic',
        (result) => {
          for (let i = 0; i < result.moveSequence.length; i++) {
            const stateBefore = result.stateHistory[i]
            const stateAfter = result.stateHistory[i + 1]
            const move = result.moveSequence[i]
            assertConstraintAdvanceLogic(stateBefore, stateAfter, move)
          }
        }
      )
    })
    
    it('Property 10: No Illegal Moves Returned', () => {
      runPropertyTest(
        'Property.10-NoIllegalMovesReturned',
        'NoIllegalMovesReturned',
        (result) => {
          for (const state of result.stateHistory) {
            assertNoIllegalMovesReturned(state)
          }
        }
      )
    })
  })
  
  // ==========================================================================
  // BOARD CLOSURE INVARIANTS
  // ==========================================================================
  
  describe('Board Closure Invariants', () => {
    it('Property 11: Closed Boards Have Zero Legal Moves', () => {
      runPropertyTest(
        'Property.11-ClosedBoardsHaveZeroMoves',
        'ClosedBoardsHaveZeroMoves',
        (result) => {
          for (const state of result.stateHistory) {
            assertClosedBoardsHaveZeroMoves(state)
          }
        }
      )
    })
    
    it('Property 12: Board Closure Consistency with Win/Draw', () => {
      runPropertyTest(
        'Property.12-BoardClosureConsistency',
        'BoardClosureConsistency',
        (result) => {
          for (const state of result.stateHistory) {
            for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
              assertBoardClosureConsistency(state, boardIdx)
            }
          }
        }
      )
    })
  })
  
  // ==========================================================================
  // TERMINAL STATE INVARIANTS
  // ==========================================================================
  
  describe('Terminal State Invariants', () => {
    it('Property 13: Terminal Game Rejects Moves', () => {
      runPropertyTest(
        'Property.13-TerminalGameRejectsMoves',
        'TerminalGameRejectsMoves',
        (result) => {
          for (const state of result.stateHistory) {
            assertTerminalGameRejectsMoves(state)
          }
        }
      )
    })
    
    it('Property 14: Move Sequence Terminates Correctly', () => {
      runPropertyTest(
        'Property.14-MoveSequenceTerminatesCorrectly',
        'MoveSequenceTerminatesCorrectly',
        (result) => {
          assertMoveSequenceTerminatesCorrectly(result.finalState)
        }
      )
    })
  })
  
  // ==========================================================================
  // COMBINED INVARIANT CHECK (ALL AT ONCE)
  // ==========================================================================
  
  describe('Combined Invariant Check', () => {
    it('Property 15: All Post-Move Invariants Hold', () => {
      runPropertyTest(
        'Property.15-AllPostMoveInvariants',
        'AllPostMoveInvariants',
        (result) => {
          for (let i = 0; i < result.moveSequence.length; i++) {
            const stateBefore = result.stateHistory[i]
            const stateAfter = result.stateHistory[i + 1]
            const move = result.moveSequence[i]
            
            try {
              assertAllPostMoveInvariants(stateBefore, stateAfter, move)
            } catch (error) {
              if (error instanceof InvariantViolation) {
                // Enrich error with move context
                throw new InvariantViolation(
                  error.invariantName,
                  `At move ${i + 1}/${result.moveSequence.length}: ${error.message}`,
                  { ...error.context, moveIndex: i, move }
                )
              }
              throw error
            }
          }
        }
      )
    })
    
    it('Property 16: Long Sequence Completeness (50+ moves)', () => {
      // This property specifically targets long games to catch cascading errors
      fc.assert(
        fc.property(moveSequenceArbitrary, (result) => {
          // Only test sequences that are at least 50 moves or terminal
          if (result.length < 50 && !result.isTerminal) {
            return // Skip short non-terminal sequences
          }
          
          try {
            for (let i = 0; i < result.moveSequence.length; i++) {
              const stateBefore = result.stateHistory[i]
              const stateAfter = result.stateHistory[i + 1]
              const move = result.moveSequence[i]
              assertAllPostMoveInvariants(stateBefore, stateAfter, move)
            }
          } catch (error) {
            if (error instanceof GeneratorError) {
              return // Skip generator errors
            }
            
            if (error instanceof InvariantViolation) {
              captureFailure({
                testName: 'Property.16-LongSequenceCompleteness',
                timestamp: new Date().toISOString(),
                seed: (fc as any).configuredParameters?.seed || 0,
                path: (fc as any).configuredParameters?.path || '',
                shrunkSequenceLength: result.length,
                initialState: result.initialState,
                moveSequence: result.moveSequence,
                stateHistory: result.stateHistory,
                failingStepIndex: result.length - 1,
                failingMove: result.moveSequence[result.length - 1] || null,
                stateBefore: result.stateHistory[result.length - 1],
                stateAfter: result.finalState,
                invariantName: 'LongSequenceCompleteness',
                errorMessage: error.message,
                stackTrace: error.stack || '',
              })
            }
            
            throw error
          }
        }),
        {
          numRuns: Math.floor(config.numRuns * 0.5), // Half the budget for long sequences
          verbose: config.verbose,
        }
      )
    })
  })
})
