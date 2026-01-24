# Super Ultimate Tic Tac Toe

Browser-first Super/Ultimate Tic Tac Toe built with Vite + TypeScript (vanilla).

Quick start

```bash
npm install
npm run dev
```

Run tests:

```bash
npm run test
```

MCTS AI

The MCTS implementation supports a wall-clock time budget and iteration budget. Call the AI via `chooseMove(state, { timeBudgetMs, iterationBudget, explorationC, rolloutPolicy })`. The core returns move statistics when invoked directly as `mctsChooseMove`.
