import { describe, it, expect } from 'vitest';
import { chooseMove } from '../src/ai/index';
import { createNewGame } from '../src/game/state';
import { getLegalMoves } from '../src/game/legal-moves';

describe('AI.chooseMove (integration smoke)', () => {
  it('returns a legal move for a fresh game with seed and small budget', async () => {
    const state = createNewGame();
    const legal = getLegalMoves(state as any);
    expect(legal.length).toBeGreaterThan(0);

    const move = await chooseMove(state as any, {
      seed: 'test-seed-1',
      iterationBudget: 200,
      timeBudgetMs: 200,
      difficulty: 'easy',
    });

    expect(move).toBeDefined();
    expect(legal).toContainEqual(move as any);
  });
});
