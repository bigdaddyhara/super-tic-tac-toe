/**
 * Example regression test template.
 * 
 * When a PBT failure is discovered and fixed, create a regression test here
 * to ensure the bug never reoccurs.
 * 
 * This is a template showing the recommended format.
 */

import { describe, it, expect } from 'vitest'
import { createNewGame } from '../../src/game/state'
import { applyMove } from '../../src/game/engine'
import { getLegalMoves } from '../../src/game/legal-moves'
import { Move } from '../../src/types/game-types'

describe('Regression: Example Template', () => {
  it('example: forced board constraint transition (TEMPLATE)', () => {
    // This is a template test showing the format.
    // Real regression tests should replace this with actual bug reproductions.
    
    let state = createNewGame()
    
    // Minimal move sequence that triggered the bug (discovered by PBT, shrunk by fast-check)
    const moves: Move[] = [
      { board: 4, cell: 4 }, // X plays center of center board
      { board: 4, cell: 0 }, // O plays top-left of center board (forces board 0)
      // ... add more moves from actual failure artifact
    ]
    
    // Apply the sequence
    for (const move of moves) {
      const { nextState } = applyMove(state, move)
      state = nextState
    }
    
    // Assert the condition that failed in PBT
    const legalMoves = getLegalMoves(state)
    
    // Example assertion: if forced board is set, all moves must target it
    if (state.nextBoardIndex !== null) {
      for (const move of legalMoves) {
        expect(move.board).toBe(state.nextBoardIndex)
      }
    }
    
    // Or assert a specific state property
    expect(state.winner).toBe(null) // Game should still be ongoing
  })
  
  it('example: player count consistency (TEMPLATE)', () => {
    let state = createNewGame()
    
    const moves: Move[] = [
      { board: 0, cell: 0 },
      { board: 0, cell: 1 },
      { board: 1, cell: 0 },
    ]
    
    for (const move of moves) {
      const { nextState } = applyMove(state, move)
      state = nextState
    }
    
    // Count X and O cells
    let xCount = 0
    let oCount = 0
    for (const board of state.bigBoard) {
      for (const cell of board) {
        if (cell === 'X') xCount++
        if (cell === 'O') oCount++
      }
    }
    
    // Player counts should differ by at most 1
    expect(Math.abs(xCount - oCount)).toBeLessThanOrEqual(1)
    
    // If current player is X, O should have played same number of times
    if (state.currentPlayer === 'X') {
      expect(oCount).toBe(xCount)
    }
    
    // If current player is O, X should have played one more time
    if (state.currentPlayer === 'O') {
      expect(xCount).toBe(oCount + 1)
    }
  })
})
