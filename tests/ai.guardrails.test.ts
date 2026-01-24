import { describe, it, expect } from 'vitest'
import { chooseMove } from '../src/ai'
import { createNewGame } from '../src/game/state'
import { getLegalMoves } from '../src/game/legal-moves'

describe('AI.chooseMove guardrails', () => {
  it('returns a legal move when abortSignal is already aborted', async () => {
    const state = createNewGame()
    const ctrl = new AbortController()
    ctrl.abort()
    const opts: any = { abortSignal: ctrl.signal, timeBudgetMs: 200, iterationBudget: 200 }
    const mv = await chooseMove(state as any, opts)
    const legal = getLegalMoves(state as any)
    expect(legal).toContainEqual(mv as any)
  })
})
