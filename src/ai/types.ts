import { GameState, Move } from "../types/game-types";

export type Difficulty = "easy" | "medium" | "hard" | "insane" | "custom";

export interface ChooseOptions {
  timeBudgetMs?: number;
  iterationBudget?: number;
  difficulty?: Difficulty;
  randomness?: number; // 0..1
  seed?: string | number;
  abortSignal?: AbortSignal;
  explorationC?: number; // UCB exploration constant
  rolloutPolicy?: 'random' | 'light';
  // Early-cutoff for guided rollouts: max depth before heuristic evaluation
  rolloutEarlyCutoffDepth?: number;
  // Confidence threshold (0..1) above which heuristic value terminates rollout
  rolloutEarlyCutoffConfidence?: number;
  // Optional move scoring function used by MCTS for ordering/prioritization.
  // If provided, MCTS will prefer higher-scoring moves during expansion.
  moveScoring?: (state: import("../types/game-types").GameState, move: import("../types/game-types").Move, seedOrRng?: number | (() => number)) => number;
  // When moveScoring is provided, pick among the top-K moves after sorting.
  moveOrderingTopK?: number;
  // Progressive widening parameters: control how many moves are considered
  // as parent node visit counts grow. Only used when `moveScoring` is provided.
  progressiveWideningK?: number; // base multiplier for top-K
  progressiveWideningAlpha?: number; // exponent applied to parent visits (e.g., 0.5)
  // Transposition table options
  useTranspositionTable?: boolean;
  ttMaxEntries?: number;
  onStats?: (stats: { iterations: number; elapsedMs: number; bestChildVisits?: number }) => void;
  // Optional diagnostics callback invoked at end-of-search with a compact snapshot
  onDiagnostics?: (diagnostics: any) => void;
  // How many top moves to include in diagnostics snapshot (default 8)
  diagnosticsTopN?: number;
  // Optionally stream diagnostics during search (throttled). Disabled by default.
  diagnosticsStreaming?: boolean;
  // Minimum ms between streaming diagnostics emissions when `diagnosticsStreaming` is true.
  diagnosticsThrottleMs?: number;
}

export interface PolicyOptions {
  presets?: Record<
    string,
    {
      timeBudgetMs?: number;
      iterationBudget?: number;
      randomness?: number;
      useTranspositionTable?: boolean;
      ttMaxEntries?: number;
      progressiveWideningK?: number;
      progressiveWideningAlpha?: number;
      moveOrderingTopK?: number;
    }
  >;
}

export type ChooseMoveFn = (state: GameState, options?: ChooseOptions) => Promise<Move>;
