import { describe, it, expect } from 'vitest'
import { createNewGame, applyMove } from '../src/game/state'
import { getLegalMoves, isLegalMove, getNextConstraint } from '../src/game/legal-moves'

function fillBoardWithDraw() {
  // X O X O X O X O X (no winner)
  return ['X','O','X','O','X','O','X','O','X']
}

describe('legal-moves edge cases', () => {
  it('first move: all open cells legal', () => {
    const g = createNewGame()
    const moves = getLegalMoves(g)
    expect(moves.length).toBe(81)
    expect(moves.every(m => m.board >= 0 && m.board <= 8 && m.cell >= 0 && m.cell <= 8)).toBe(true)
  })

  it('forced board is won/full: free move', () => {
    let g = createNewGame()
    // fill board 4
    g.bigBoard[4] = fillBoardWithDraw()
    g.nextBoardIndex = 4
    const moves = getLegalMoves(g)
    // should not include any moves in board 4
    expect(moves.every(m => m.board !== 4)).toBe(true)
    // should include moves in other open boards
    expect(moves.length).toBeGreaterThan(0)
  })

  it('all boards closed: no legal moves', () => {
    let g = createNewGame()
    for (let i = 0; i < 9; ++i) g.bigBoard[i] = fillBoardWithDraw()
    g.nextBoardIndex = null
    const moves = getLegalMoves(g)
    expect(moves.length).toBe(0)
  })

  it('move in closed board is illegal', () => {
    let g = createNewGame()
    g.bigBoard[2] = fillBoardWithDraw()
    g.nextBoardIndex = null
    expect(isLegalMove(g, { board: 2, cell: 0 })).toBe(false)
  })

  it('move in occupied cell is illegal', () => {
    let g = createNewGame()
    g.bigBoard[1][3] = 'X'
    g.nextBoardIndex = null
    expect(isLegalMove(g, { board: 1, cell: 3 })).toBe(false)
  })

  it('getNextConstraint: returns forced board or null', () => {
    let g = createNewGame()
    // play in (0, 4) -> next forced board is 4
    g = applyMove(g, { board: 0, cell: 4 }).nextState
    expect(getNextConstraint(g, { board: 0, cell: 4 })).toBe(4)
    // fill board 4, now move to (0, 4) should result in free move
    g.bigBoard[4] = fillBoardWithDraw()
    expect(getNextConstraint(g, { board: 0, cell: 4 })).toBe(null)
  })
})
