import { describe, it, expect } from 'vitest'
import { easyChooseMove } from '../src/ai/baseline/easy'
import { mediumChooseMove } from '../src/ai/baseline/medium'
import { createNewGame } from '../src/game/state'
import { getLegalMoves } from '../src/game/legal-moves'

describe('Baseline AI (easy/medium) legality', () => {
  it('easy returns a legal move on fresh game', async () => {
    const s = createNewGame()
    const legal = getLegalMoves(s as any)
    const mv = await easyChooseMove(s as any, { seed: 't1' })
    expect(legal).toContainEqual(mv as any)
  })

  it('medium returns a legal move on fresh game', async () => {
    const s = createNewGame()
    const legal = getLegalMoves(s as any)
    const mv = await mediumChooseMove(s as any, { seed: 't2' })
    expect(legal).toContainEqual(mv as any)
  })

  it('easy respects forced board constraints', async () => {
    const s = createNewGame()
    // simulate a move that forces nextBoardIndex to 4 (center)
    // apply a move to set nextBoardIndex by marking board 0 cell 4
    // use engine applyMove via state helper
    const res = (await import('../src/game/state')).applyMoveToState(s as any, { board: 0, cell: 4 } as any)
    const legal = getLegalMoves(res as any)
    const mv = await easyChooseMove(res as any, { seed: 't3' })
    expect(legal).toContainEqual(mv as any)
  })

  it('medium respects forced board constraints', async () => {
    const s = createNewGame()
    const res = (await import('../src/game/state')).applyMoveToState(s as any, { board: 0, cell: 4 } as any)
    const legal = getLegalMoves(res as any)
    const mv = await mediumChooseMove(res as any, { seed: 't4' })
    expect(legal).toContainEqual(mv as any)
  })
})
