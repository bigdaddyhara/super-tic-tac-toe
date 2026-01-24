import { describe, it, expect } from 'vitest'
import { createSeededRng } from '../src/ai/rng'
import { mctsCoreChooseMove } from '../src/ai/mcts.core'
import { gameStateFromBig } from '../src/game/engine'
import { startAIMove, cancelAIMove } from '../src/ui/ai-manager'
import { TurnTimer } from '../src/ui/turn-timer'

function emptyBig() {
  return Array.from({ length: 9 }).map(() => Array.from({ length: 9 }).map(() => null))
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

describe('AI performance & cancellation', () => {
  it('respects time budget (approx)', async () => {
    const state = gameStateFromBig(emptyBig() as any)
    const rng = createSeededRng('budget-test')
    const budget = 50
    const res = await mctsCoreChooseMove(state as any, { timeBudgetMs: budget }, rng, new AbortController().signal)
    // allow modest scheduling tolerance
    expect(res.stats.elapsedMs).toBeLessThanOrEqual(budget + 200)
  })

  it('stops early when aborted via signal', async () => {
    const state = gameStateFromBig(emptyBig() as any)
    const rng = createSeededRng('abort-test')
    const ctrl = new AbortController()
    const p = mctsCoreChooseMove(state as any, { timeBudgetMs: 5000 }, rng, ctrl.signal)
    setTimeout(() => ctrl.abort(), 10)
    const res = await p
    // aborted run should complete quickly (we allow generous tolerance)
    expect(res.stats.elapsedMs).toBeLessThanOrEqual(1000)
  })

  it('ui cancel (undo) aborts thinking and clears thinking indicator', async () => {
    const state = gameStateFromBig(emptyBig() as any)
    const tt = new TurnTimer(1000)
    let thinking = false
    const p = startAIMove(state as any, 'X', tt as any, { difficulty: 'hard', timeBudgetMs: 2000 }, (t) => (thinking = t))
    // give it a moment to start
    await sleep(20)
    cancelAIMove()
    try { await p } catch (e) {}
    expect(thinking).toBe(false)
  })

})
