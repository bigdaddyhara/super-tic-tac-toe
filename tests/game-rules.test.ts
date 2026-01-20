import { describe, it, expect } from 'vitest'
import { createNewGame, applyMove } from '../src/game/state'
import { isValidMove } from '../src/game/engine'

describe('game rules', () => {
  it('forces next board to cell index', () => {
    let g = createNewGame()
    // play in small 0, cell 4 -> nextBoard should be 4
    g = applyMove(g, { board: 0, cell: 4 }).nextState
    expect(g.nextBoardIndex).toBe(4)
    // move not allowed in other small boards
    expect(isValidMove(g, { board: 0, cell: 0 })).toBe(false)
  })
})
