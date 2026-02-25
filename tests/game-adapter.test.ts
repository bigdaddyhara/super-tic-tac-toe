import { describe, it, expect } from 'vitest'
import { createNewGame } from '../src/game/state'
import { getActiveForcedBoard, isDraw, isFreeMove, isGameOver } from '../src/ui/game-adapter'

describe('game-adapter createNewGame', () => {
  it('returns expected initial state properties', () => {
    const state = createNewGame()
    expect(isGameOver(state)).toBe(false)
    expect(isDraw(state)).toBe(false)
    expect(getActiveForcedBoard(state)).toBeNull()
    expect(isFreeMove(state)).toBe(true)
  })
})