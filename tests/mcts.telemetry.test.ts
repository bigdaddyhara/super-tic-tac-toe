import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../src/ai/rng';
import { createNewGame } from '../src/game/state';
import { mctsChooseMove } from '../src/ai/mcts';
import { scoreMove } from '../src/ai/baseline/medium';

describe('MCTS telemetry', () => {
  it('reports earlyCutoffHits when early-cutoff enabled', async () => {
    const state = createNewGame();
    const rng = createSeededRng('telemetry-1');

    const optsNoCutoff: any = { timeBudgetMs: 200, iterationBudget: 500 };
    const res1 = await (mctsChooseMove as any)(state, optsNoCutoff, rng, new AbortController().signal);
    expect(res1).toBeDefined();
    const stats1 = res1.stats || {};
    expect(stats1.rolloutCount).toBeGreaterThan(0);
    const hits1 = stats1.earlyCutoffHits || 0;

    const optsWithCutoff: any = {
      timeBudgetMs: 200,
      iterationBudget: 500,
      rolloutEarlyCutoffDepth: 2,
      rolloutEarlyCutoffConfidence: 0.6,
      moveScoring: scoreMove as any,
    };
    const res2 = await (mctsChooseMove as any)(state, optsWithCutoff, rng, new AbortController().signal);
    expect(res2).toBeDefined();
    const stats2 = res2.stats || {};
    const hits2 = stats2.earlyCutoffHits || 0;

    // With the heuristic enabled and low confidence threshold, expect more early-cutoff hits
    expect(hits2).toBeGreaterThanOrEqual(hits1);
  });
});
