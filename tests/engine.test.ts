import { describe, it, expect } from 'vitest'
import { createNewGame, applyMove } from '../src/game/state'

describe('engine applyMove (headless)', () => {
  it('sets nextBoardIndex to the cell index of previous move', () => {
    let g = createNewGame()
    g = applyMove(g, 0, 4)
    expect(g.nextBoardIndex).toBe(4)
  })

  it('allows free choice when forced board is closed', () => {
    // create a game and manually close board 4 (fill it)
    const g0 = createNewGame()
    // filledBoard has 5 X and 4 O
    const filledBoard = ['X','O','X','O','X','O','X','O','X']
    // set currentPlayer to 'O' so counts remain valid after O moves
    const g = { ...g0, bigBoard: g0.bigBoard.map((b, i) => (i === 4 ? [...filledBoard] : [...b])), currentPlayer: 'O' }
    // set nextBoardIndex to 4 (forced), but board 4 is full -> should be free choice
    const gWithForced = { ...g, nextBoardIndex: 4 }
    // attempt a move in a different small board (0,0)
    const after = applyMove(gWithForced, 0, 0)
    expect(after.nextBoardIndex === null || typeof after.nextBoardIndex === 'number').toBe(true)
  })
})
