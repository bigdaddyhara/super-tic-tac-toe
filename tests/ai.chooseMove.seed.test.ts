import { describe, it, expect } from 'vitest'
import { chooseMove } from '../src/ai'
import { createNewGame } from '../src/game/state'
import { getLegalMoves } from '../src/game/legal-moves'

describe('AI.chooseMove determinism', () => {
  it('chooseMove with same seed and difficulty returns same move', async () => {
    const state = createNewGame()
    const opts: any = { seed: 'deterministic-1', difficulty: 'medium', timeBudgetMs: 200, iterationBudget: 200 }
    const mv1 = await chooseMove(state as any, opts)
    const mv2 = await chooseMove(state as any, opts)
    expect(mv1).toBeDefined()
    expect(mv2).toBeDefined()
    const legal = getLegalMoves(state as any)
    expect(legal).toContainEqual(mv1 as any)
    expect(legal).toContainEqual(mv2 as any)
    expect(mv1).toEqual(mv2)
  })
})
