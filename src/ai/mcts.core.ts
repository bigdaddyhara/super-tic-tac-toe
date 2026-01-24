/**
 * Monte Carlo Tree Search core (time-budgeted)
 *
 * Usage notes:
 * - Call `mctsCoreChooseMove(state, options, rng, signal)` to run an anytime search.
 * - `options.timeBudgetMs` (optional) sets a wall-clock deadline; the search will stop
 *   when the deadline is reached or when `signal.aborted` becomes true.
 * - `options.iterationBudget` bounds the max number of MCTS iterations.
 * - `options.explorationC` controls UCB exploration (default Math.SQRT2).
 * - `options.rolloutPolicy` may be `random` or `light` for a simple heuristic rollout.
 * - The function returns `{ move, stats }` where `stats` contains iteration and timing info.
 */
import { GameState, Move } from "../types/game-types";
import { getLegalMoves } from "../game/legal-moves";
import { applyMove } from "../game/engine";
import { ChooseOptions } from "./types";
import TranspositionTable from "./tt";
import { stateIdFromState } from './serialize'

export type RNG = () => number;

type Node = {
  parent: Node | null;
  move: Move | null;
  children: Node[];
  wins: number;
  visits: number;
  untriedMoves: Move[];
  player: string;
};

function uctScore(child: Node, parentVisits: number, c = Math.sqrt(2)) {
  if (child.visits === 0) return Infinity;
  return child.wins / child.visits + c * Math.sqrt(Math.log(parentVisits) / child.visits);
}

function cloneState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s));
}

export async function mctsCoreChooseMove(
  rootState: GameState,
  options: ChooseOptions | undefined,
  rng: RNG,
  signal: AbortSignal
): Promise<{ move: Move; stats?: { iterations: number; elapsedMs: number; bestChildVisits?: number } }> {
  const iterationBudget = options?.iterationBudget ?? 1000;
  const timeBudgetMs = options?.timeBudgetMs; // optional wall-clock budget in ms
  const explorationC = options?.explorationC ?? Math.SQRT2;
  const rolloutPolicy = options?.rolloutPolicy ?? "random";

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const deadline = typeof timeBudgetMs === "number" ? now() + timeBudgetMs : Infinity;

  const tt = options?.useTranspositionTable ? new TranspositionTable(options?.ttMaxEntries ?? 10000) : null;

  const legal = getLegalMoves(rootState as any);
  if (!legal || legal.length === 0) throw new Error("No legal moves available");
  if (legal.length === 1) return legal[0];

  // stable identifier for this root state so diagnostics can be associated with
  // history/replay snapshots.
  const stateId = stateIdFromState(rootState)

  const root: Node = {
    parent: null,
    move: null,
    children: [],
    wins: 0,
    visits: 0,
    untriedMoves: legal.slice(),
    player: rootState.currentPlayer === "X" ? "O" : "X",
  };

  const maxIterations = iterationBudget;
  let iterations = 0;
  // Telemetry counters
  let telemetryRolloutCount = 0;
  let telemetryTotalRolloutSteps = 0;
  let telemetryEarlyCutoffHits = 0;
  // streaming diagnostics throttle
  const diagnosticsStreaming = !!options?.diagnosticsStreaming
  const diagnosticsThrottleMs = typeof options?.diagnosticsThrottleMs === 'number' ? options!.diagnosticsThrottleMs : 200
  let lastDiagnosticsEmit = 0

  for (let iter = 0; iter < maxIterations; iter++) {
    if (signal.aborted) break;
    if (now() >= deadline) break;

    let node = root;
    let state = cloneState(rootState);

    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      if (signal.aborted) break;
      if (now() >= deadline) break;
      let best: Node | null = null;
      let bestScore = -Infinity;
      for (const c of node.children) {
        const s = uctScore(c, node.visits, explorationC);
        if (s > bestScore) {
          bestScore = s;
          best = c;
        }
      }
      if (!best) break;
      if (best.move) state = applyMove(state, best.move).nextState;
      node = best;
    }

    if (node.untriedMoves.length > 0) {
      let m: Move
      if (options?.moveScoring) {
        const scored = node.untriedMoves.map((mv) => ({ mv, score: options.moveScoring!(cloneState(state), mv, rng) }))
        scored.sort((a, b) => b.score - a.score)
        const parentVisits = node.parent ? Math.max(1, node.parent.visits) : 1
        const alpha = options.progressiveWideningAlpha ?? 0.5
        const kBase = options.progressiveWideningK ?? (options.moveOrderingTopK ?? Math.min(3, scored.length))
        const dynamicK = Math.min(scored.length, Math.max(1, Math.floor(Math.pow(parentVisits, alpha) * kBase)))
        const pickIdx = Math.floor(rng() * dynamicK)
        m = scored[pickIdx].mv
        const rem = node.untriedMoves.findIndex((x) => x.board === m.board && x.cell === m.cell)
        if (rem >= 0) node.untriedMoves.splice(rem, 1)
      } else {
        const idx = Math.floor(rng() * node.untriedMoves.length)
        m = node.untriedMoves.splice(idx, 1)[0]
      }
      const childState = applyMove(state, m).nextState;
      const childNode: Node = {
        parent: node,
        move: m,
        children: [],
        wins: 0,
        visits: 0,
        untriedMoves: getLegalMoves(childState as any) || [],
        player: state.currentPlayer,
      };
      node.children.push(childNode);
      node = childNode;
      state = childState;
    }

    let simState = state;
    let rolloutSteps = 0;
    // heuristic-derived score if early-cutoff triggered
    let scoreFromHeuristic: number | null = null;
    function heuristicStateValue(s: GameState, rootPlayer: string, opts: ChooseOptions | undefined, rngFn: RNG): number {
      if (s.winner && s.winner !== 'Ongoing') {
        if (s.winner === rootPlayer) return 1;
        if (s.winner === 'Draw') return 0.5;
        return 0;
      }
      if (!opts?.moveScoring) return 0.5;
      const ls = getLegalMoves(s as any) || [];
      if (!ls || ls.length === 0) return 0.5;
      let bestCurr = -Infinity;
      for (const mv of ls) {
        const sc = opts.moveScoring!(cloneState(s), mv, rngFn);
        if (sc > bestCurr) bestCurr = sc;
      }
      const oppState = cloneState(s);
      oppState.currentPlayer = oppState.currentPlayer === 'X' ? 'O' : 'X';
      let bestOpp = -Infinity;
      for (const mv of ls) {
        const sc = opts.moveScoring!(cloneState(oppState), mv, rngFn);
        if (sc > bestOpp) bestOpp = sc;
      }
      const denom = Math.abs(bestCurr) + Math.abs(bestOpp) + 1;
      const val = 0.5 + ((bestCurr - bestOpp) / denom) * 0.5;
      return Math.max(0, Math.min(1, val));
    }
    const doRandomRollout = () => {
      const cutoffDepth = options?.rolloutEarlyCutoffDepth ?? 6;
      const cutoffConfidence = options?.rolloutEarlyCutoffConfidence ?? 0.9;
      while (true) {
        if (signal.aborted) break;
        if ((rolloutSteps & 0x7) === 0 && now() >= deadline) break;
        const ls = getLegalMoves(simState as any) || [];
        if (!ls || ls.length === 0) break;
        const mv = ls[Math.floor(rng() * ls.length)];
        simState = applyMove(simState, mv).nextState;
        rolloutSteps += 1;
        if (simState.winner && simState.winner !== "Ongoing") break;
        if (rolloutSteps >= cutoffDepth && options?.moveScoring) {
          const hv = heuristicStateValue(simState, rootState.currentPlayer, options, rng);
          if (hv >= cutoffConfidence || hv <= (1 - cutoffConfidence)) {
            scoreFromHeuristic = hv;
            break;
          }
        }
      }
    };

    const doLightRollout = () => {
      const cutoffDepth = options?.rolloutEarlyCutoffDepth ?? 6;
      const cutoffConfidence = options?.rolloutEarlyCutoffConfidence ?? 0.9;
      while (true) {
        if (signal.aborted) break;
        if ((rolloutSteps & 0x7) === 0 && now() >= deadline) break;
        const ls = getLegalMoves(simState as any) || [];
        if (!ls || ls.length === 0) break;
        // prefer immediate wins, avoid moves that give opponent immediate win
        let pick = null as Move | null;
        for (const candidate of ls) {
          const next = applyMove(cloneState(simState), candidate).nextState;
          if (next.winner && next.winner !== "Ongoing") {
            pick = candidate;
            break;
          }
        }
        if (!pick) {
          // avoid moves that let opponent win immediately
          const filtered = ls.filter((candidate) => {
            const next = applyMove(cloneState(simState), candidate).nextState;
            const oppMoves = getLegalMoves(next as any) || [];
            for (const om of oppMoves) {
              const oppNext = applyMove(cloneState(next), om).nextState;
              if (oppNext.winner && oppNext.winner !== "Ongoing") return false; // candidate is bad
            }
            return true;
          });
          if (filtered.length > 0) pick = filtered[Math.floor(rng() * filtered.length)];
        }
        if (!pick) pick = ls[Math.floor(rng() * ls.length)];
        simState = applyMove(simState, pick).nextState;
        rolloutSteps += 1;
        if (simState.winner && simState.winner !== "Ongoing") break;
        if (rolloutSteps >= cutoffDepth && options?.moveScoring) {
          const hv = heuristicStateValue(simState, rootState.currentPlayer, options, rng);
          if (hv >= cutoffConfidence || hv <= (1 - cutoffConfidence)) {
            scoreFromHeuristic = hv;
            break;
          }
        }
      }
    };

    // reset rolloutSteps per simulation
    rolloutSteps = 0;
    scoreFromHeuristic = null;
    if (rolloutPolicy === "light") doLightRollout();
    else doRandomRollout();

    // telemetry bookkeeping
    telemetryRolloutCount += 1;
    telemetryTotalRolloutSteps += rolloutSteps;
    if (scoreFromHeuristic != null) telemetryEarlyCutoffHits += 1;

    // Consult transposition table for rollout result caching
    let score = 0.5;
    if (scoreFromHeuristic != null) {
      score = scoreFromHeuristic
    } else if (tt) {
      const e = tt.get(simState)
      if (e) {
        score = e.value
      } else {
        if (simState.winner === rootState.currentPlayer) score = 1;
        else if (simState.winner === "Draw") score = 0.5;
        else score = 0;
        tt.set(simState, { value: score, visits: 1 })
      }
    } else {
      if (simState.winner === rootState.currentPlayer) score = 1;
      else if (simState.winner === "Draw") score = 0.5;
      else score = 0;
    }

    let n: Node | null = node;
    while (n) {
      n.visits += 1;
      n.wins += score;
      n = n.parent;
    }

    iterations += 1;

    // optionally emit throttled streaming diagnostics (lightweight snapshot)
    if (diagnosticsStreaming && options?.onDiagnostics) {
      const nowMs = now()
      if (nowMs - lastDiagnosticsEmit >= diagnosticsThrottleMs) {
        lastDiagnosticsEmit = nowMs
        try {
          const TOP_N = options?.diagnosticsTopN ?? 6
          const topMoves = root.children
            .map((c) => ({ move: c.move, visits: c.visits }))
            .filter((x) => x.move != null)
            .sort((a, b) => b.visits - a.visits)
            .slice(0, TOP_N)
            .map((x) => ({ board: (x.move as any).board, cell: (x.move as any).cell, visits: x.visits }))
          const snap = { timestamp: Date.now(), iterations, elapsedMs: nowMs - (typeof deadline === 'number' && isFinite(deadline) ? (deadline - timeBudgetMs!) : 0), topMoves }
          try { options.onDiagnostics(snap) } catch (e) {}
        } catch (e) {}
      }
    }
  }

  let bestChild: Node | null = null;
  let bestVisits = -1;
  for (const c of root.children) {
    if (c.visits > bestVisits) {
      bestVisits = c.visits;
      bestChild = c;
    }
  }
  const elapsedMs = now() - (typeof deadline === "number" && isFinite(deadline) ? (deadline - timeBudgetMs!) : 0);
  const telemetry = {
    rolloutCount: telemetryRolloutCount,
    totalRolloutSteps: telemetryTotalRolloutSteps,
    earlyCutoffHits: telemetryEarlyCutoffHits,
    avgRolloutLength: telemetryRolloutCount > 0 ? telemetryTotalRolloutSteps / telemetryRolloutCount : 0,
  }

  if (!bestChild || !bestChild.move) {
    const mv = legal[Math.floor(rng() * legal.length)];
    const diagnostics = {
      timestamp: Date.now(),
      stateId,
      iterations,
      elapsedMs,
      rolloutCount: telemetry.rolloutCount,
      avgRolloutLength: telemetry.avgRolloutLength,
      earlyCutoffHits: telemetry.earlyCutoffHits,
      bestChildVisits: 0,
      topMoves: [],
      chosenMove: mv,
    }
    if (options?.onStats) options.onStats({ iterations, elapsedMs, bestChildVisits: 0, ...telemetry } as any);
    if (options?.onDiagnostics) options.onDiagnostics(diagnostics)
    return { move: mv, stats: { iterations, elapsedMs, bestChildVisits: 0, ...telemetry, diagnostics } as any };
  }
  // Build compact top-N summary of children for diagnostics (default N=8)
  const TOP_N = options?.diagnosticsTopN ?? 8
  const topMoves = root.children
    .map((c) => ({ move: c.move, visits: c.visits, wins: c.wins, value: c.visits > 0 ? c.wins / c.visits : 0 }))
    .filter((x) => x.move != null)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, TOP_N)
    .map((x) => ({ board: (x.move as any).board, cell: (x.move as any).cell, visits: x.visits, wins: x.wins, value: x.value }))

  const diagnostics = {
    timestamp: Date.now(),
    stateId,
    iterations,
    elapsedMs,
    rolloutCount: telemetry.rolloutCount,
    avgRolloutLength: telemetry.avgRolloutLength,
    earlyCutoffHits: telemetry.earlyCutoffHits,
    bestChildVisits: bestChild.visits,
    topMoves,
    chosenMove: bestChild.move,
  }

  if (options?.onStats) options.onStats({ iterations, elapsedMs, bestChildVisits: bestChild.visits, ...telemetry } as any);
  if (options?.onDiagnostics) options.onDiagnostics(diagnostics)
  return { move: bestChild.move, stats: { iterations, elapsedMs, bestChildVisits: bestChild.visits, ...telemetry, diagnostics } as any };
}
