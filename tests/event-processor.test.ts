import { describe, expect, it, vi } from 'vitest'
import { processEvents } from '../src/ui/event-processor'
import { createNewGame } from '../src/game/state'

describe('event-processor', () => {
  it('triggers endgame hooks only for BigBoardWon and Draw events', () => {
    const state = createNewGame()

    const onSmallBoardWon = vi.fn()
    const onBigBoardWon = vi.fn()
    const onDraw = vi.fn()

    processEvents(
      [
        { type: 'CellMarked', board: 0, cell: 0, player: 'X' },
        { type: 'SmallBoardWon', board: 0, winner: 'X' },
        { type: 'BigBoardWon', winner: 'X' },
      ],
      state,
      { onSmallBoardWon, onBigBoardWon, onDraw },
    )

    expect(onSmallBoardWon).toHaveBeenCalledWith(0, 'X')
    expect(onBigBoardWon).toHaveBeenCalledWith('X', state)
    expect(onDraw).not.toHaveBeenCalled()

    onSmallBoardWon.mockClear()
    onBigBoardWon.mockClear()
    onDraw.mockClear()

    processEvents([{ type: 'Draw' }], state, { onSmallBoardWon, onBigBoardWon, onDraw })

    expect(onSmallBoardWon).not.toHaveBeenCalled()
    expect(onBigBoardWon).not.toHaveBeenCalled()
    expect(onDraw).toHaveBeenCalledWith(state)
  })
})
