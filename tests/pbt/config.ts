/**
 * Configuration for property-based testing.
 * Defines execution budgets, timeouts, and sequence length limits for different environments.
 */

export type PBTBudget = 'CI' | 'LOCAL' | 'NIGHTLY'

export interface PBTConfig {
  /** Number of test runs per property */
  numRuns: number
  /** Maximum move sequence length */
  maxSequenceLength: number
  /** Timeout per property test (ms) */
  timeoutMs: number
  /** Enable verbose output (shrinking details, etc) */
  verbose: boolean
}

/**
 * Budget configurations for different execution environments:
 * - CI: Fast runs for pull request validation (300 runs, 200 moves max)
 * - LOCAL: Developer pre-commit checks (5000 runs, 250 moves max)
 * - NIGHTLY: Deep stress testing (50000 total / 16 properties ≈ 3100 per property, 300 moves max)
 */
export const BUDGETS: Record<PBTBudget, PBTConfig> = {
  CI: {
    numRuns: 300,
    maxSequenceLength: 200,
    timeoutMs: 60000, // 1 minute per property
    verbose: false,
  },
  LOCAL: {
    numRuns: 5000,
    maxSequenceLength: 250,
    timeoutMs: 300000, // 5 minutes per property
    verbose: false,
  },
  NIGHTLY: {
    numRuns: 3100, // 50k total ÷ 16 properties
    maxSequenceLength: 300,
    timeoutMs: 600000, // 10 minutes per property
    verbose: true,
  },
}

/**
 * Get the active budget from environment variable or default to CI.
 */
export function getActiveBudget(): PBTConfig {
  const budgetName = (process.env.PBT_BUDGET || 'CI').toUpperCase() as PBTBudget
  return BUDGETS[budgetName] || BUDGETS.CI
}

/**
 * Path to failure artifacts directory.
 */
export const FAILURES_DIR = 'tests/pbt-failures'

/**
 * Path to replay tests directory.
 */
export const REPLAY_DIR = 'tests/pbt-replay'

/**
 * Path to regression tests directory.
 */
export const REGRESSION_DIR = 'tests/regression'
