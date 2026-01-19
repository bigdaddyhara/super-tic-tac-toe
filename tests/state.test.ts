import { describe, it, expect } from 'vitest'
import { createNewGame } from '../src/game/state'

describe('game state', () => {
  it('initializes empty big board', () => {
    const g = createNewGame()
    expect(g.bigBoard.length).toBe(9)
    expect(g.bigBoard[0].length).toBe(9)
    expect(g.currentPlayer).toBe('X')
    expect(g.winner).toBeNull()
  })
})
