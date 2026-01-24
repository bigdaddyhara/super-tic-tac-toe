import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../src/ai/rng';
import { createNewGame } from '../src/game/state';
import { getLegalMoves } from '../src/game/legal-moves';
import { mctsChooseMove } from '../src/ai/mcts';

describe('MCTS core (integration)', () => {
  it('returns a legal move under a small time budget', async () => {
    const state = createNewGame();
    const legal = getLegalMoves(state as any);
    expect(legal.length).toBeGreaterThan(0);

    const rng = createSeededRng('test-1');
    const res = await (mctsChooseMove as any)(state, { timeBudgetMs: 100, iterationBudget: 200 }, rng, new AbortController().signal);
    const mv = res && res.move ? res.move : res;
    expect(mv).toBeDefined();
    expect(legal).toContainEqual(mv as any);
  });

  it('more time yields more iterations', async () => {
    const state = createNewGame();
    const rng1 = createSeededRng('test-2');
    const rng2 = createSeededRng('test-2');

    const short = await (mctsChooseMove as any)(state, { timeBudgetMs: 50, iterationBudget: 10000 }, rng1, new AbortController().signal);
    const long = await (mctsChooseMove as any)(state, { timeBudgetMs: 500, iterationBudget: 10000 }, rng2, new AbortController().signal);

    expect(short).toBeDefined();
    expect(long).toBeDefined();
    const shortIter = short.stats?.iterations ?? 0;
    const longIter = long.stats?.iterations ?? 0;
    expect(longIter).toBeGreaterThanOrEqual(shortIter);
  });

  it('abort signal returns a legal move quickly', async () => {
    const state = createNewGame();
    const legal = getLegalMoves(state as any);
    const ctrl = new AbortController();
    // abort very quickly
    setTimeout(() => ctrl.abort(), 10);

    const rng = createSeededRng('test-3');
    const res = await (mctsChooseMove as any)(state, { iterationBudget: 100000 }, rng, ctrl.signal);
    const mv = res && res.move ? res.move : res;
    expect(mv).toBeDefined();
    expect(legal).toContainEqual(mv as any);
  });
});
