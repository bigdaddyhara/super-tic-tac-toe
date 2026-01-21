import { describe, test, expect } from 'vitest'
import { createNewGame, applyMoveToState } from '../src/game/state'
import { getRenderableState } from '../src/ui/view-model-adapter'

describe('renderableFromGameState mapping', () => {
  test('after a single move the board content and next forced board are reflected', () => {
    let s = createNewGame()
    const move = { board: 0, cell: 4 }
    const res = applyMoveToState(s, move)
    s = res

    const vm = getRenderableState(s, { lastMove: { smallIndex: 0, cellIndex: 4 } })
    expect(vm.bigBoard[0][4]).toBe('X')
    // after playing cell 4, next forced board should be 4
    expect(vm.activeSmallIndex).toBe(4)
  })

  test('small board win is reported in smallBoardStatus', () => {
    // Construct a game state where small board 0 is already won by X
    const big = Array.from({ length: 9 }).map(() => Array.from({ length: 9 }).map(() => null))
    big[0][0] = 'X'
    big[0][1] = 'X'
    big[0][2] = 'X'
    const st = { bigBoard: big, currentPlayer: 'O', nextBoardIndex: null, winner: null }
    const vm = getRenderableState(st as any)
    expect(vm.smallBoardStatus[0].kind).toBe('won')
    expect((vm.smallBoardStatus[0] as any).winner).toBe('X')
  })
})
