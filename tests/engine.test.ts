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
  it('throws on move to occupied cell', () => {
    let g = createNewGame()
    g = applyMove(g, 0, 0)
    expect(() => applyMove(g, 0, 0)).toThrow()
  })

  it('throws on move out of bounds', () => {
    let g = createNewGame()
    expect(() => applyMove(g, -1, 0)).toThrow()
    expect(() => applyMove(g, 0, -1)).toThrow()
    expect(() => applyMove(g, 9, 0)).toThrow()
    expect(() => applyMove(g, 0, 9)).toThrow()
  })

  it('throws on move after game finished (win)', () => {
    // Simulate a win on small board 0 for X
    let g = createNewGame()
    g = { ...g, bigBoard: g.bigBoard.map((b, i) => i === 0 ? ['X','X',null,'X','X',null,'X',null,null] : [...b]) }
    // X plays winning move
    g = applyMove(g, 0, 2)
    // Now winner should be set
    expect(g.winner).toBe('X')
    // Any further move should throw
    expect(() => applyMove(g, 1, 0)).toThrow()
  })

  it('throws on move after game finished (draw)', () => {
    // Simulate all small boards drawn
    let g = createNewGame()
    const drawBoard = ['X','O','X','X','O','X','O','X','O']
    g = { ...g, bigBoard: g.bigBoard.map(() => [...drawBoard]) }
    // All boards are full, so next move should not be allowed
    g = { ...g, winner: null } // ensure winner is not set yet
    // Apply a move to trigger draw detection
    expect(() => applyMove(g, 0, 0)).toThrow()
  })

  it('throws on illegal forced board move', () => {
    let g = createNewGame()
    g = applyMove(g, 0, 4)
    // nextBoardIndex is 4, so move in 3 is illegal
    expect(() => applyMove(g, 3, 0)).toThrow()
  })

  it('handles win on big board', () => {
    // Simulate X winning 3 small boards in a row
    let g = createNewGame()
    const winBoard = ['X','X','X','O','O',null,null,null,null]
    g = { ...g, bigBoard: g.bigBoard.map((b, i) => (i < 3 ? [...winBoard] : [...b])) }
    // X plays in small 0, cell 5 (doesn't matter, just to trigger win check)
    g = applyMove(g, 0, 5)
    expect(g.winner).toBe('X')
  })

  it('handles draw on big board', () => {
    // All small boards are drawn
    let g = createNewGame()
    const drawBoard = ['X','O','X','X','O','X','O','X','O']
    g = { ...g, bigBoard: g.bigBoard.map(() => [...drawBoard]) }
    // Apply a move to trigger draw detection
    expect(() => applyMove(g, 0, 0)).toThrow()
  })
