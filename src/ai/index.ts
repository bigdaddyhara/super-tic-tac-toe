import { GameState, Move } from "../types/game-types";
import { ChooseOptions } from "./types";
import { runWithTimeBudget } from "./worker-harness";
import { getPreset } from "./policy";
import { createSeededRng, pickRandom } from "./rng";
import { mctsChooseMove } from "./mcts";
import { getWorkerPool } from './worker-pool'
import { getCachedExplanation } from './explain'
// Worker-based MCTS wrapper (browser only)
async function runMctsInWorker(state: any, opts: any, rng: any, signal?: AbortSignal) {
  if (typeof Worker === 'undefined') {
    // not a browser worker environment — fall back to direct call
    const res = await mctsChooseMove(state, opts, rng, signal ?? new AbortController().signal)
    // return full response (move + stats) to keep API consistent with worker path
    return res
  }

  const pool = getWorkerPool('./mcts.worker.ts')
  if (!pool) return mctsChooseMove(state, opts, rng, signal ?? new AbortController().signal)

  const resp = await pool.run({ state, options: opts, seed: opts?.seed }, { signal })
  if (resp && resp.error) throw new Error(resp.error)
  // return full response (may include stats/diagnostics) so caller can emit diagnostics
  return resp
}
import { getLegalMoves } from "../game/legal-moves";
import { easyChooseMove } from "./baseline/easy";
import { mediumChooseMove, scoreMove } from "./baseline/medium";

// Public AI entry points (minimal stubs). Implement search algorithms here (MCTS, minimax, etc.).

export async function chooseMove(state: GameState, options?: ChooseOptions): Promise<Move> {
  const opts = { ...(options || {}) };

  if (opts.difficulty && typeof opts.difficulty === "string") {
    const preset = getPreset(opts.difficulty);
    if (preset) {
      opts.timeBudgetMs = opts.timeBudgetMs ?? preset.timeBudgetMs;
      opts.iterationBudget = opts.iterationBudget ?? preset.iterationBudget;
      opts.randomness = opts.randomness ?? preset.randomness;
      opts.useTranspositionTable = opts.useTranspositionTable ?? (preset as any).useTranspositionTable;
      opts.ttMaxEntries = opts.ttMaxEntries ?? (preset as any).ttMaxEntries;
      opts.progressiveWideningK = opts.progressiveWideningK ?? (preset as any).progressiveWideningK;
      opts.progressiveWideningAlpha = opts.progressiveWideningAlpha ?? (preset as any).progressiveWideningAlpha;
      opts.moveOrderingTopK = opts.moveOrderingTopK ?? (preset as any).moveOrderingTopK;
    }
  }

  // Very small fallback implementation: pick a random legal move (must use engine helpers).
  // Replace this with a real iterative search that respects opts.iterationBudget and opts.timeBudgetMs.
  return runWithTimeBudget(async (signal) => {
    const legal = getLegalMoves(state as any);
    if (!legal || legal.length === 0) throw new Error("No legal moves available");

    const rng = opts.seed != null ? createSeededRng(opts.seed) : Math.random;

    // Use MCTS by default; it is an anytime algorithm and respects iterationBudget.
      try {
      // Route to baseline bots when requested
      if (opts.difficulty === 'easy') return easyChooseMove(state, opts)
      if (opts.difficulty === 'medium') return mediumChooseMove(state, opts)

      // Use worker-based MCTS in browsers to avoid blocking UI; fall back to direct call in Node/tests
      try {
        // If using MCTS (e.g., hard difficulty), provide a default moveScoring function
        if ((opts.difficulty === 'hard' || opts.difficulty === 'insane') && !opts.moveScoring) {
          opts.moveScoring = scoreMove as any
        }
        const resp = await runMctsInWorker(state, opts, rng as any, signal);
        // `resp` may be either a plain move (legacy) or an object { move, stats }
        const mv = resp && typeof resp === 'object' && 'move' in resp ? resp.move : resp as any
        // Emit diagnostics event if available (non-blocking)
        try {
          const stats = resp && typeof resp === 'object' && 'stats' in resp ? resp.stats : undefined
          if (stats && stats.diagnostics) {
            try { document.dispatchEvent(new CustomEvent('ai:analysisSnapshot', { detail: { diagnostics: stats.diagnostics } })) } catch (e) {}
          }
        } catch (e) {}
        return mv as any;
      } catch (err) {
        // if worker fails, degrade to direct call
        if ((opts.difficulty === 'hard' || opts.difficulty === 'insane') && !opts.moveScoring) {
          opts.moveScoring = scoreMove as any
        }
        const res = await mctsChooseMove(state, opts, rng as any, signal);
        try {
          if (res && res.stats && (res.stats as any).diagnostics) {
            try { document.dispatchEvent(new CustomEvent('ai:analysisSnapshot', { detail: { diagnostics: (res.stats as any).diagnostics } })) } catch (e) {}
          }
        } catch (e) {}
        return (res && typeof res === 'object' && 'move' in res) ? res.move : res as any;
      }
    } catch (err) {
      // Fallback to random pick if search fails or is aborted.
      return pickRandom(legal, rng as any);
    }
  }, opts as ChooseOptions);
}

export function configureAIPolicy() {
  // Placeholder: allow runtime reconfiguration of policy presets
  throw new Error("Not implemented");
}

export function explainMove(_state: GameState, _move: Move) {
  // Return cached explanation synchronously if available; otherwise return a lightweight placeholder.
  try {
    const cached = getCachedExplanation(_state, _move)
    if (cached !== undefined) return cached
    return { score: undefined, reasons: ['Computing...'], simulatedState: null }
  } catch (e) {
    return null
  }
}
