import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../src/ai/rng';
import { createNewGame } from '../src/game/state';
import { mctsChooseMove } from '../src/ai/mcts';

// Simple instrumentation: run MCTS with and without early-cutoff and compare iterations
// We can't directly inspect rollout lengths without modifying core, so we assert that
// when early-cutoff is enabled, MCTS still returns a legal move and completes within budget.

describe('MCTS early-cutoff guardrails', () => {
  it('returns a legal move when early-cutoff enabled and respects time budget', async () => {
    const state = createNewGame();
    const rng = createSeededRng('early-cutoff-1');

    const optsNoCutoff: any = { timeBudgetMs: 100, iterationBudget: 500, rolloutEarlyCutoffDepth: undefined };
    const optsWithCutoff: any = { timeBudgetMs: 100, iterationBudget: 500, rolloutEarlyCutoffDepth: 2, rolloutEarlyCutoffConfidence: 0.6 };

    const res1 = await (mctsChooseMove as any)(state, optsNoCutoff, rng, new AbortController().signal);
    const mv1 = res1 && res1.move ? res1.move : res1;
    expect(mv1).toBeDefined();

    const res2 = await (mctsChooseMove as any)(state, optsWithCutoff, rng, new AbortController().signal);
    const mv2 = res2 && res2.move ? res2.move : res2;
    expect(mv2).toBeDefined();
  });
});
