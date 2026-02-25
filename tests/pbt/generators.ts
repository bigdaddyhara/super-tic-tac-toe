/**
 * Generators for property-based testing.
 * Creates reachable game states by generating sequences of legal moves.
 */

import * as fc from 'fast-check'
import { GameState, Move } from '../../src/types/game-types'
import { createNewGame } from '../../src/game/state'
import { applyMove } from '../../src/game/engine'
import { getLegalMoves, isLegalMove } from '../../src/game/legal-moves'
import { getActiveBudget } from './config'

/**
 * Result of a move sequence generation.
 */
export interface MoveSequenceResult {
  /** Initial state (fresh game) */
  initialState: GameState
  /** Sequence of moves applied */
  moveSequence: Move[]
  /** History of states after each move (includes initial state at index 0) */
  stateHistory: GameState[]
  /** Final state after all moves */
  finalState: GameState
  /** Total number of moves applied */
  length: number
  /** Whether the game reached a terminal state (winner != null or no legal moves) */
  isTerminal: boolean
}

/**
 * Generator error indicating the generator itself has a bug.
 * This should NOT count as a property failure; it means we sampled an invalid move.
 */
export class GeneratorError extends Error {
  constructor(message: string) {
    super(`Generator bug: ${message}`)
    this.name = 'GeneratorError'
  }
}

/**
 * Generate a reachable move sequence by starting from the initial state
 * and repeatedly sampling from getLegalMoves.
 * 
 * Strategy:
 * 1. Start with createNewGame()
 * 2. Get legal moves
 * 3. Sample one move uniformly
 * 4. Apply it via applyMove
 * 5. Append to state history
 * 6. Repeat until terminal or max length
 * 
 * This guarantees all generated states are legally reachable.
 */
export const moveSequenceArbitrary: fc.Arbitrary<MoveSequenceResult> = fc.integer({ min: 0, max: getActiveBudget().maxSequenceLength }).chain(targetLength => {
  // Generate exactly 'targetLength' moves (or until terminal)
  return fc.constant(null).map(() => {
    const initialState = createNewGame()
    const moveSequence: Move[] = []
    const stateHistory: GameState[] = [initialState]
    
    let currentState = initialState
    let moveCount = 0
    
    while (moveCount < targetLength) {
      const legalMoves = getLegalMoves(currentState)
      
      // Terminal condition: no legal moves or game finished
      if (legalMoves.length === 0 || currentState.winner !== null) {
        break
      }
      
      // Sample a random legal move uniformly
      const moveIndex = Math.floor(Math.random() * legalMoves.length)
      const move = legalMoves[moveIndex]
      
      // Generator validation: verify the sampled move is actually legal
      // (This catches bugs in getLegalMoves or our sampling logic)
      if (!isLegalMove(currentState, move)) {
        throw new GeneratorError(
          `Sampled move {board=${move.board}, cell=${move.cell}} is not legal according to isLegalMove. ` +
          `This indicates a bug in getLegalMoves or isLegalMove consistency.`
        )
      }
      
      // Apply the move
      try {
        const { nextState } = applyMove(currentState, move)
        
        // Record the move and state
        moveSequence.push(move)
        stateHistory.push(nextState)
        currentState = nextState
        moveCount++
      } catch (error) {
        // If applyMove throws even though isLegalMove passed, this is a generator bug
        throw new GeneratorError(
          `applyMove threw error for a move that passed isLegalMove: ${error}`
        )
      }
    }
    
    const isTerminal = currentState.winner !== null || getLegalMoves(currentState).length === 0
    
    return {
      initialState,
      moveSequence,
      stateHistory,
      finalState: currentState,
      length: moveSequence.length,
      isTerminal,
    }
  })
})

/**
 * Simplified arbitrary for testing short sequences (useful for debugging).
 */
export const shortMoveSequenceArbitrary: fc.Arbitrary<MoveSequenceResult> = fc.integer({ min: 1, max: 20 }).chain(targetLength => {
  return fc.constant(null).map(() => {
    const initialState = createNewGame()
    const moveSequence: Move[] = []
    const stateHistory: GameState[] = [initialState]
    
    let currentState = initialState
    let moveCount = 0
    
    while (moveCount < targetLength) {
      const legalMoves = getLegalMoves(currentState)
      
      if (legalMoves.length === 0 || currentState.winner !== null) {
        break
      }
      
      const moveIndex = Math.floor(Math.random() * legalMoves.length)
      const move = legalMoves[moveIndex]
      
      if (!isLegalMove(currentState, move)) {
        throw new GeneratorError(
          `Sampled move {board=${move.board}, cell=${move.cell}} is not legal`
        )
      }
      
      try {
        const { nextState } = applyMove(currentState, move)
        moveSequence.push(move)
        stateHistory.push(nextState)
        currentState = nextState
        moveCount++
      } catch (error) {
        throw new GeneratorError(`applyMove threw: ${error}`)
      }
    }
    
    const isTerminal = currentState.winner !== null || getLegalMoves(currentState).length === 0
    
    return {
      initialState,
      moveSequence,
      stateHistory,
      finalState: currentState,
      length: moveSequence.length,
      isTerminal,
    }
  })
})

/**
 * Replay a specific move sequence (used for debugging and regression tests).
 */
export function replayMoveSequence(moves: Move[]): MoveSequenceResult {
  const initialState = createNewGame()
  const stateHistory: GameState[] = [initialState]
  
  let currentState = initialState
  
  for (const move of moves) {
    const { nextState } = applyMove(currentState, move)
    stateHistory.push(nextState)
    currentState = nextState
  }
  
  const isTerminal = currentState.winner !== null || getLegalMoves(currentState).length === 0
  
  return {
    initialState,
    moveSequence: moves,
    stateHistory,
    finalState: currentState,
    length: moves.length,
    isTerminal,
  }
}
