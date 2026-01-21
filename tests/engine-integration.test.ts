import { describe, test, expect } from 'vitest'
import { createNewGame, applyMoveToState } from '../src/game/state'
import { getLegalMoves } from '../src/game/legal-moves'

describe('engine integration', () => {
  test('apply a legal move and update legal moves', () => {
    let state = createNewGame()
    const legal = getLegalMoves(state)
    expect(legal.length).toBeGreaterThan(0)
    // pick a move
    const mv = legal[0]
    state = applyMoveToState(state, mv)
    const legal2 = getLegalMoves(state)
    // after one move there should still be legal moves
    expect(legal2.length).toBeGreaterThan(0)
  })
})
