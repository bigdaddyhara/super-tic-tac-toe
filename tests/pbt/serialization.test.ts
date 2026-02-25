/**
 * Property-based tests for state serialization.
 * Tests that serialize → deserialize → apply move yields identical behavior.
 * 
 * Run with:
 *   npm test -- tests/pbt/serialization.test.ts
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { moveSequenceArbitrary, GeneratorError } from './generators'
import { serializeState, deserializeState, stateIdFromState } from '../../src/ai/serialize'
import { getLegalMoves } from '../../src/game/legal-moves'
import { applyMove } from '../../src/game/engine'
import { captureFailure } from './logging'
import { getActiveBudget } from './config'
import { GameState, Move } from '../../src/types/game-types'

const config = getActiveBudget()

/**
 * Compare two game states for equality (deep comparison).
 */
function statesEqual(s1: GameState, s2: GameState): boolean {
  // Compare basic fields
  if (s1.currentPlayer !== s2.currentPlayer) return false
  if (s1.nextBoardIndex !== s2.nextBoardIndex) return false
  if (s1.winner !== s2.winner) return false
  
  // Compare bigBoard (deep)
  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      if (s1.bigBoard[b][c] !== s2.bigBoard[b][c]) return false
    }
  }
  
  return true
}

/**
 * Compare two move arrays for equality.
 */
function movesEqual(m1: Move[], m2: Move[]): boolean {
  if (m1.length !== m2.length) return false
  
  // Convert to sorted strings for comparison (order-agnostic)
  const s1 = m1.map(m => `${m.board},${m.cell}`).sort()
  const s2 = m2.map(m => `${m.board},${m.cell}`).sort()
  
  return JSON.stringify(s1) === JSON.stringify(s2)
}

describe('Property-Based Tests: Serialization', () => {
  it(`should run with budget: ${process.env.PBT_BUDGET || 'CI'} (${config.numRuns} runs)`, () => {
    expect(config).toBeDefined()
  })
  
  describe('Serialization Round-Trip', () => {
    it('Property S1: Serialize → Deserialize preserves state identity', () => {
      fc.assert(
        fc.property(moveSequenceArbitrary, (result) => {
          try {
            // Test every state in the history
            for (let i = 0; i < result.stateHistory.length; i++) {
              const original = result.stateHistory[i]
              const serialized = serializeState(original)
              const deserialized = deserializeState(serialized)
              
              // States should be equal
              if (!statesEqual(original, deserialized)) {
                throw new Error(
                  `State at index ${i} changed after serialize→deserialize:\n` +
                  `Original winner: ${original.winner}\n` +
                  `Deserialized winner: ${deserialized.winner}\n` +
                  `Original nextBoardIndex: ${original.nextBoardIndex}\n` +
                  `Deserialized nextBoardIndex: ${deserialized.nextBoardIndex}`
                )
              }
            }
          } catch (error) {
            if (error instanceof GeneratorError) {
              return // Skip generator errors
            }
            throw error
          }
        }),
        {
          numRuns: config.numRuns,
          verbose: config.verbose,
        }
      )
    })
    
    it('Property S2: Serialize → Deserialize preserves getLegalMoves', () => {
      fc.assert(
        fc.property(moveSequenceArbitrary, (result) => {
          try {
            // Test every state in the history
            for (let i = 0; i < result.stateHistory.length; i++) {
              const original = result.stateHistory[i]
              const serialized = serializeState(original)
              const deserialized = deserializeState(serialized)
              
              const legalMovesOriginal = getLegalMoves(original)
              const legalMovesDeserialized = getLegalMoves(deserialized)
              
              // Legal moves should be identical (order-agnostic)
              if (!movesEqual(legalMovesOriginal, legalMovesDeserialized)) {
                throw new Error(
                  `Legal moves differ after serialize→deserialize at index ${i}:\n` +
                  `Original: ${legalMovesOriginal.length} moves\n` +
                  `Deserialized: ${legalMovesDeserialized.length} moves\n` +
                  `Original nextBoardIndex: ${original.nextBoardIndex}\n` +
                  `Deserialized nextBoardIndex: ${deserialized.nextBoardIndex}`
                )
              }
            }
          } catch (error) {
            if (error instanceof GeneratorError) {
              return
            }
            throw error
          }
        }),
        {
          numRuns: config.numRuns,
          verbose: config.verbose,
        }
      )
    })
    
    it('Property S3: Applying same move to original and deserialized yields identical results', () => {
      fc.assert(
        fc.property(moveSequenceArbitrary, (result) => {
          try {
            // Test every transition
            for (let i = 0; i < result.moveSequence.length; i++) {
              const original = result.stateHistory[i]
              const move = result.moveSequence[i]
              
              // Serialize and deserialize the original state
              const serialized = serializeState(original)
              const deserialized = deserializeState(serialized)
              
              // Apply the same move to both
              const { nextState: nextOriginal } = applyMove(original, move)
              const { nextState: nextDeserialized } = applyMove(deserialized, move)
              
              // Results should be identical
              if (!statesEqual(nextOriginal, nextDeserialized)) {
                throw new Error(
                  `Applying move ${i} (board=${move.board}, cell=${move.cell}) to ` +
                  `original vs deserialized yielded different results:\n` +
                  `Original next winner: ${nextOriginal.winner}\n` +
                  `Deserialized next winner: ${nextDeserialized.winner}\n` +
                  `Original next constraint: ${nextOriginal.nextBoardIndex}\n` +
                  `Deserialized next constraint: ${nextDeserialized.nextBoardIndex}`
                )
              }
            }
          } catch (error) {
            if (error instanceof GeneratorError) {
              return
            }
            throw error
          }
        }),
        {
          numRuns: config.numRuns,
          verbose: config.verbose,
        }
      )
    })
    
    it('Property S4: State ID (hash) is deterministic and consistent', () => {
      fc.assert(
        fc.property(moveSequenceArbitrary, (result) => {
          try {
            // Test every state
            for (let i = 0; i < result.stateHistory.length; i++) {
              const state = result.stateHistory[i]
              
              // Compute hash twice
              const hash1 = stateIdFromState(state)
              const hash2 = stateIdFromState(state)
              
              // Should be identical
              if (hash1 !== hash2) {
                throw new Error(
                  `State ID is non-deterministic at index ${i}:\n` +
                  `Hash 1: ${hash1}\n` +
                  `Hash 2: ${hash2}`
                )
              }
              
              // Serialize → deserialize → hash should be identical
              const serialized = serializeState(state)
              const deserialized = deserializeState(serialized)
              const hash3 = stateIdFromState(deserialized)
              
              if (hash1 !== hash3) {
                throw new Error(
                  `State ID changed after serialize→deserialize at index ${i}:\n` +
                  `Original hash: ${hash1}\n` +
                  `Deserialized hash: ${hash3}`
                )
              }
            }
          } catch (error) {
            if (error instanceof GeneratorError) {
              return
            }
            throw error
          }
        }),
        {
          numRuns: config.numRuns,
          verbose: config.verbose,
        }
      )
    })
    
    it('Property S5: Serialization round-trip is idempotent', () => {
      fc.assert(
        fc.property(moveSequenceArbitrary, (result) => {
          try {
            // Test final state
            const state = result.finalState
            
            // First round-trip
            const s1 = serializeState(state)
            const d1 = deserializeState(s1)
            
            // Second round-trip
            const s2 = serializeState(d1)
            const d2 = deserializeState(s2)
            
            // Should be identical
            if (!statesEqual(d1, d2)) {
              throw new Error(
                `Serialization round-trip is not idempotent:\n` +
                `After 1 round-trip winner: ${d1.winner}\n` +
                `After 2 round-trips winner: ${d2.winner}`
              )
            }
            
            // Serialized forms should also be identical
            if (JSON.stringify(s1) !== JSON.stringify(s2)) {
              throw new Error(
                `Serialized forms differ after multiple round-trips`
              )
            }
          } catch (error) {
            if (error instanceof GeneratorError) {
              return
            }
            throw error
          }
        }),
        {
          numRuns: config.numRuns,
          verbose: config.verbose,
        }
      )
    })
  })
})
