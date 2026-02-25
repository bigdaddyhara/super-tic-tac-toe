import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/state'
import { computeHighlightState } from '../src/ui/highlight-state'

describe('highlight-state', () => {
  it('returns no legal highlights for terminal states', () => {
    const state = createNewGame()
    state.winner = 'X'

    const highlights = computeHighlightState(
      state,
      { board: 0, cell: 0 },
      { board: 0, cell: 0 },
      null,
    )

    expect(highlights.legalMoves).toEqual([])
    expect(highlights.forcedBoard).toBeNull()
    expect(highlights.isFreeMove).toBe(false)
    expect(highlights.hoverMove).toBeNull()
  })

  it('filters out illegal hover move in constrained state', () => {
    const state = createNewGame()
    state.nextBoardIndex = 0

    const highlights = computeHighlightState(state, { board: 1, cell: 0 }, null, null)

    expect(highlights.isFreeMove).toBe(false)
    expect(highlights.forcedBoard).toBe(0)
    expect(highlights.hoverMove).toBeNull()
    expect(highlights.legalMoves.length).toBe(9)
    expect(highlights.legalMoves.every((move) => move.board === 0)).toBe(true)
  })
})
