import { test, expect } from 'vitest'
import { mctsCoreChooseMove } from '../src/ai/mcts.core'
import { createNewGame } from '../src/game/state'

test('mcts emits diagnostics end-of-search and streaming when enabled', async () => {
  const state = createNewGame()
  const diagnosticsCalls: any[] = []
  const statsCalls: any[] = []

  const opts: any = {
    iterationBudget: 200,
    diagnosticsStreaming: true,
    diagnosticsThrottleMs: 1, // make streaming aggressive for test
    onDiagnostics: (d: any) => diagnosticsCalls.push(d),
    onStats: (s: any) => statsCalls.push(s),
  }

  const res = await mctsCoreChooseMove(state, opts, Math.random, new AbortController().signal)
  expect(res).toBeDefined()
  // final stats should include diagnostics attached
  expect((res as any).stats).toBeDefined()
  expect((res as any).stats.diagnostics).toBeDefined()
  // streaming diagnostics should have fired at least once
  expect(diagnosticsCalls.length).toBeGreaterThanOrEqual(1)
  // final diagnostics snapshot should have chosenMove
  expect((res as any).stats.diagnostics.chosenMove).toBeDefined()
})
