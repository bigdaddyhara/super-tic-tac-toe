# Property-Based Testing Suite for Ultimate Tic-Tac-Toe

This directory contains a comprehensive property-based testing (PBT) suite for the Ultimate Tic-Tac-Toe game engine using [fast-check](https://github.com/dubzzz/fast-check).

## Overview

**Property-based testing** validates that invariants hold over a large space of generated inputs. Unlike example-based tests that check specific scenarios, PBT generates thousands of random game sequences and verifies that fundamental rules are never violated.

### Key Benefits

- **Deep invariant validation**: Tests 16+ properties that must hold after every move
- **Reachability-based generation**: All states are legally reachable (no random board filling)
- **Automatic shrinking**: When a failure occurs, fast-check minimizes the failing case
- **Replay protocol**: Every failure is captured with seed/path for deterministic reproduction
- **Regression tracking**: Failed cases can be converted to permanent unit tests

## Architecture

### Reachable State Generation

The generator follows this algorithm:

```
1. Start with createNewGame() (initial state)
2. Get legal moves via getLegalMoves(state)
3. Sample one move uniformly at random
4. Apply it via applyMove(state, move)
5. Append to state history
6. Repeat until terminal or max length reached
```

This guarantees all generated states are **legally reachable** - no impossible board configurations.

### Generator vs Engine Bug Separation

Before applying each move, we validate it with `isLegalMove()`:
- **If invalid**: This is a generator bug (skip the test run)
- **If valid but applyMove fails**: This is an engine bug (report it)

This separation ensures we only report real engine issues, not generator problems.

## Files

| File | Purpose |
|------|---------|
| `config.ts` | Budget configurations (CI/LOCAL/NIGHTLY) |
| `generators.ts` | Move sequence arbitraries (reachable state generation) |
| `invariants.ts` | 14+ assertion helpers for validation |
| `logging.ts` | Pretty-printing, failure capture, debugging utilities |
| `properties.test.ts` | Main test suite with 16 properties |
| `serialization.test.ts` | Serialization round-trip properties |
| `README.md` | This file |

## Running Tests

### Quick CI Run (300 runs, ~30 seconds)

```bash
npm test -- tests/pbt/properties.test.ts
```

### Local Pre-Commit (5000 runs, ~2-5 minutes)

```bash
PBT_BUDGET=LOCAL npm test -- tests/pbt/
```

### Nightly Stress Test (50k total runs, ~10-20 minutes)

```bash
PBT_BUDGET=NIGHTLY npm test -- tests/pbt/
```

### Run a Specific Property

```bash
npm test -- tests/pbt/properties.test.ts -t "Property 7"
```

### Run Serialization Tests

```bash
npm test -- tests/pbt/serialization.test.ts
```

## Properties Tested

### Turn & Player Invariants

1. **Player Count Consistency**: X/O counts differ by ≤1, match turn history
2. **Turn Monotonicity**: currentPlayer alternates X ↔ O
3. **Game Status Consistency**: Winner matches actual board state

### Move Application Invariants

4. **No Double-Occupancy**: Exactly 1 cell changes per move
5. **Occupancy Decreases by 1**: Empty cells decrease by exactly 1
6. **Cell Never Overwrites**: No occupied cell is overwritten

### Constraint Routing Invariants

7. **Forced-Board Constraint Enforcement**: When forced, all moves target that board
8. **Free-Move Constraint Validity**: Free moves never target closed boards
9. **Constraint Advance Logic**: nextBoardIndex set correctly after each move
10. **No Illegal Moves Returned**: All moves from getLegalMoves pass isLegalMove

### Board Closure Invariants

11. **Closed Boards Have Zero Legal Moves**: Won/Draw boards accept no moves
12. **Board Closure Consistency**: Closure matches win/draw detection

### Terminal State Invariants

13. **Terminal Game Rejects Moves**: Winner set ⟹ no legal moves
14. **Move Sequence Terminates Correctly**: No moves + no winner ⟹ all boards closed

### Combined Invariants

15. **All Post-Move Invariants Hold**: All 14 invariants checked every step
16. **Long Sequence Completeness**: 50+ move games maintain invariants

### Serialization Properties

- **S1**: Serialize → Deserialize preserves state identity
- **S2**: Serialize → Deserialize preserves getLegalMoves
- **S3**: Applying same move to original/deserialized yields identical results
- **S4**: State ID (hash) is deterministic
- **S5**: Serialization round-trip is idempotent

## Failure Workflow

### When a Test Fails

1. **Automatic Capture**: Failure artifact saved to `tests/pbt-failures/{testName}-seed-{seed}.json`
2. **Console Output**: Pretty-printed state before/after failure + move sequence
3. **Shrinking**: fast-check automatically minimizes the failing case

### Failure Artifact Contains

- Test name and invariant name
- Seed and path (for replay)
- Full move sequence (shrunk to minimal reproducer)
- State history (every state in the sequence)
- Failing step index
- Error message and stack trace

### Replay a Failure

#### Option 1: Manual Replay

```typescript
import { replayMoveSequence } from './tests/pbt/generators'
import { loadFailure } from './tests/pbt/logging'

const artifact = loadFailure('tests/pbt-failures/Property.7-...seed-123.json')
const result = replayMoveSequence(artifact.moveSequence)

// Inspect result.stateHistory[artifact.failingStepIndex]
```

#### Option 2: Create Replay Test

Create a file in `tests/pbt-replay/replay-seed-{seed}.test.ts`:

```typescript
import { describe, it } from 'vitest'
import { replayMoveSequence } from '../pbt/generators'
import { assertForcedBoardConstraintEnforcement } from '../pbt/invariants'

describe('PBT Replay: Seed 123', () => {
  it('reproduces failure from property 7', () => {
    const moves = [
      { board: 2, cell: 4 },
      { board: 4, cell: 1 },
      // ... minimal sequence
    ]
    
    const result = replayMoveSequence(moves)
    const failingState = result.stateHistory[3]
    
    // This should throw the same error
    assertForcedBoardConstraintEnforcement(failingState)
  })
})
```

Run it:

```bash
npm test -- tests/pbt-replay/replay-seed-123.test.ts
```

### Create Regression Test

Once a bug is fixed, convert the failure to a permanent unit test:

1. **Simplify the move sequence** (delta-debugging: remove moves while keeping failure)
2. **Create regression test** in `tests/regression/property-{N}-{description}.test.ts`
3. **Commit to version control** so it runs on every CI build

Example:

```typescript
// tests/regression/property-7-forced-board-transition.test.ts
import { describe, it, expect } from 'vitest'
import { createNewGame } from '../../src/game/state'
import { applyMove } from '../../src/game/engine'
import { getLegalMoves } from '../../src/game/legal-moves'

describe('Regression: Property 7 - Forced Board Constraint', () => {
  it('correctly transitions to FREE when forced board closes', () => {
    let state = createNewGame()
    
    // Minimal sequence that triggered the bug
    const moves = [
      { board: 2, cell: 4 },
      { board: 4, cell: 1 },
      { board: 1, cell: 3 },
    ]
    
    for (const move of moves) {
      const { nextState } = applyMove(state, move)
      state = nextState
    }
    
    // The bug was: nextBoardIndex pointed to closed board
    const legalMoves = getLegalMoves(state)
    
    if (state.nextBoardIndex !== null) {
      // Forced board; all moves must target it
      for (const move of legalMoves) {
        expect(move.board).toBe(state.nextBoardIndex)
      }
    }
  })
})
```

## Debugging Tips

### Enable Verbose Output

```bash
PBT_BUDGET=LOCAL npm test -- tests/pbt/ --verbose
```

### Fix the Seed

To reproduce a specific failure:

```typescript
fc.assert(
  fc.property(moveSequenceArbitrary, (result) => {
    // ... test
  }),
  {
    seed: 1738919530,
    path: "3:2:1",
    numRuns: 1,
  }
)
```

### Reduce Max Sequence Length

For faster debugging:

```typescript
// In config.ts, temporarily set:
maxSequenceLength: 20
```

### Print State at Each Step

```typescript
for (let i = 0; i < result.stateHistory.length; i++) {
  console.log(`=== State ${i} ===`)
  console.log(prettyPrint(result.stateHistory[i]))
}
```

### Use Short Sequence Arbitrary

For rapid iteration:

```typescript
import { shortMoveSequenceArbitrary } from './generators'

fc.assert(
  fc.property(shortMoveSequenceArbitrary, (result) => {
    // ... test (max 20 moves)
  })
)
```

## Performance Tuning

### Parallel Execution

Vitest runs tests in parallel by default. All 16 properties run simultaneously.

### Early Exit on Failure

fast-check stops at the first failure and shrinks it. No wasted runs.

### Stratified Seed Distribution

For nightly runs, consider splitting into chunks:

```bash
# Run chunk 1 (seeds 0-10000)
SEED_START=0 SEED_END=10000 npm test -- tests/pbt/

# Run chunk 2 (seeds 10000-20000)
SEED_START=10000 SEED_END=20000 npm test -- tests/pbt/
```

## CI Integration

### Example GitHub Actions Workflow

```yaml
name: PBT Tests

on: [push, pull_request]

jobs:
  pbt-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: PBT_BUDGET=CI npm test -- tests/pbt/
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: pbt-failures
          path: tests/pbt-failures/
  
  pbt-nightly:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: PBT_BUDGET=NIGHTLY npm test -- tests/pbt/
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: pbt-nightly-failures
          path: tests/pbt-failures/
```

## Common Failure Patterns

### Forced Board Closed → FREE Transition

**Symptom**: Property 7 or 9 fails when a forced board closes.

**Cause**: `nextBoardIndex` not reset to `null` when target board becomes Won/Draw.

**Fix location**: `src/game/engine.ts`, constraint advance logic.

### Turn Count Mismatch

**Symptom**: Property 1 fails with X count ≠ O count ± 1.

**Cause**: `currentPlayer` toggle logic bug.

**Fix location**: `src/game/engine.ts`, player toggle after `applyMove`.

### Legal Moves in Closed Boards

**Symptom**: Property 11 fails with moves returned for Won/Draw boards.

**Cause**: `getLegalMoves` not filtering closed boards.

**Fix location**: `src/game/legal-moves.ts`, board status check.

### Double Cell Write

**Symptom**: Property 4 fails with 2+ cells changed in one move.

**Cause**: State mutation bug (modifying original state instead of creating new).

**Fix location**: Ensure immutability in `applyMove`.

## Adding a New Property

1. **Define the invariant** in `invariants.ts`:

```typescript
export function assertMyNewInvariant(state: GameState): void {
  if (/* condition */) {
    throw new InvariantViolation('MyNewInvariant', 'Description', { context })
  }
}
```

2. **Add property test** in `properties.test.ts`:

```typescript
it('Property 17: My New Invariant', () => {
  runPropertyTest(
    'Property.17-MyNewInvariant',
    'MyNewInvariant',
    (result) => {
      for (const state of result.stateHistory) {
        assertMyNewInvariant(state)
      }
    }
  )
})
```

3. **Run and validate**:

```bash
npm test -- tests/pbt/properties.test.ts -t "Property 17"
```

## Troubleshooting

### Test Times Out

- Reduce `maxSequenceLength` in `config.ts`
- Reduce `numRuns`
- Check for infinite loops in invariants

### "Generator bug" Warning

- getLegalMoves returned an invalid move
- Check consistency between getLegalMoves and isLegalMove
- This is NOT a property failure; fix the generator logic

### Shrinking Takes Too Long

- fast-check is trying to minimize the failure
- Wait for it to finish (usually <30 seconds)
- Or set `endOnFailure: true` to stop immediately

### State History Too Large

- Reduce `maxSequenceLength`
- Only store state diffs (not full states) in failure artifact
- Archive old failure artifacts periodically

## References

- [fast-check documentation](https://github.com/dubzzz/fast-check/tree/main/documentation)
- [Property-based testing intro](https://fsharpforfunandprofit.com/posts/property-based-testing/)
- [Shrinking explained](https://hypothesis.works/articles/shrinking/)

## License

Same as parent project.
