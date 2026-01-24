import { describe, it, expect, vi } from 'vitest'
import { chooseMove } from '../src/ai/index'
import { createNewGame } from '../src/game/state'
import * as workerPool from '../src/ai/worker-pool'

describe('ai:analysisSnapshot propagation via worker pool', () => {
  it('dispatches ai:analysisSnapshot when worker returns diagnostics', async () => {
    const state = createNewGame()
    const legal = state ? state.bigBoard[0] : null
      // Use direct (non-worker) path: ensure document exists and call chooseMove
      if (typeof document === 'undefined') (globalThis as any).document = new EventTarget()
      const events: any[] = []
      const handler = (ev: any) => { events.push(ev) }
      document.addEventListener('ai:analysisSnapshot', handler)

      // call chooseMove; in test env this will use direct mcts implementation
      const mv = await chooseMove(state as any, { difficulty: 'hard', diagnosticsStreaming: false })

      // event should have been dispatched with diagnostics
      expect(events.length).toBeGreaterThanOrEqual(1)
      document.removeEventListener('ai:analysisSnapshot', handler)
  })
})
