import { describe, it, expect, vi } from 'vitest'

// Test ai-manager clamping behavior by mocking the AI entrypoint
describe('AI difficulty & clamping', () => {
  it('clamps timeBudgetMs to TurnTimer remaining and downgrades heavy presets', async () => {
    // spy on the real AI entrypoint's chooseMove to capture passed options
    const aiModule = await import('../src/ai')
    const chooseMock = vi.spyOn(aiModule, 'chooseMove').mockImplementation(async (_state: any, _opts: any) => ({ board: 0, cell: 0 }))
    const { startAIMove, cancelAIMove } = await import('../src/ui/ai-manager')
    // fake turn timer with small remaining time
    const fakeTimer: any = {
      startForPlayer: (_p: string, _onExpire: any) => {},
      getRemainingMs: () => 120,
      currentEpoch: () => 1,
      stop: () => {},
    }

    const state = { dummy: true }
    // call startAIMove with a heavy preset
    await startAIMove(state as any, 'X', fakeTimer as any, { difficulty: 'hard', timeBudgetMs: 5000 })

    // ensure chooseMove was called and options reflect clamping
    expect(chooseMock).toHaveBeenCalled()
    const passedOpts = chooseMock.mock.calls[0][1]
    expect(passedOpts.timeBudgetMs).toBeGreaterThanOrEqual(0)
    // effective should equal remaining (120) and difficulty should be downgraded to 'medium'
    expect(passedOpts.timeBudgetMs).toBe(120)
    expect(passedOpts.difficulty).toBe('medium')

    try { cancelAIMove() } catch (e) {}
    chooseMock.mockRestore()
  })

  it('routes insane difficulty to MCTS implementation', async () => {
    // ensure we get the real AI module (undo any prior mocks in this file)
    try { vi.unmock('../src/ai') } catch (e) {}
    const mcts = await import('../src/ai/mcts')
    const spy = vi.spyOn(mcts, 'mctsChooseMove').mockImplementation(async () => ({ move: { board: 1, cell: 1 } } as any))

    const { chooseMove } = await import('../src/ai/index')
    const state = (await import('../src/game/state')).createNewGame()

    const mv = await chooseMove(state as any, { difficulty: 'insane', seed: 's1', timeBudgetMs: 10 })
    expect(spy).toHaveBeenCalled()
    expect(mv).toBeDefined()
    spy.mockRestore()
  })
})
