AI module notes

- Public entry: `chooseMove(state, options)` in `src/ai/index.ts`.
- Options: `timeBudgetMs`, `iterationBudget`, `difficulty`, `randomness`, `seed`, `abortSignal`.
- Integration guidance for UI:
  - Use `turn-timer` to set `timeBudgetMs` and supply an `AbortSignal` tied to timer expiry.
  - Show a "thinking" indicator while the returned Promise is unresolved.
  - On abort/timeout, cancel the AI Promise and handle fallback (e.g., random legal move or pass).
- Determinism:
  - Provide `seed` to `chooseMove` for reproducible behavior across runs.
  - The module uses a seeded PRNG when `seed` is provided.

Next steps
- Implement a worker-backed iterative search (MCTS or minimax) that respects time/iteration budgets.
- Add explainMove analysis helper for UI overlays.
