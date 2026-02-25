# Property-Based Testing Troubleshooting Guide

This guide helps diagnose and fix common issues with the PBT suite.

## Table of Contents

- [Test Execution Issues](#test-execution-issues)
- [Generator Issues](#generator-issues)
- [Performance Issues](#performance-issues)
- [Failure Investigation](#failure-investigation)
- [Common Bug Patterns](#common-bug-patterns)

---

## Test Execution Issues

### Test Times Out

**Symptom**: Test runs for >5 minutes and then times out.

**Possible Causes**:
1. `maxSequenceLength` is too high
2. `numRuns` is too high
3. Invariant assertion has infinite loop
4. Slow operations in invariants

**Solutions**:
```bash
# Reduce budget temporarily
PBT_BUDGET=CI npm test -- tests/pbt/

# Or edit config.ts to reduce maxSequenceLength
maxSequenceLength: 50  # instead of 200
```

**Debug**:
```typescript
// Add timing to invariants
const start = Date.now()
assertMyInvariant(state)
const elapsed = Date.now() - start
if (elapsed > 100) console.warn(`Slow invariant: ${elapsed}ms`)
```

### Tests Fail Randomly

**Symptom**: Tests pass on some runs, fail on others.

**Possible Causes**:
1. Non-deterministic logic in engine or invariants
2. Floating-point comparison issues
3. Date/time dependencies
4. External state pollution

**Solutions**:
- Fix the seed to reproduce consistently:
  ```typescript
  fc.assert(property, { seed: 123456, path: "0:1:2" })
  ```
- Check for `Math.random()` calls outside generator
- Ensure all operations are pure functions

### "Generator bug" Warnings

**Symptom**: Console shows `Generator error in Property.X: ...`

**Meaning**: The generator sampled a move that `getLegalMoves` returned but `isLegalMove` rejected.

**Root Cause**: Inconsistency between `getLegalMoves` and `isLegalMove`.

**Solution**: Fix the inconsistency in `src/game/legal-moves.ts`.

**Debug**:
```typescript
// In generators.ts, add detailed logging:
if (!isLegalMove(currentState, move)) {
  console.error('State:', currentState)
  console.error('Move:', move)
  console.error('Legal moves:', getLegalMoves(currentState))
  throw new GeneratorError(...)
}
```

---

## Generator Issues

### Generator Produces Too Few Long Sequences

**Symptom**: Property 16 (Long Sequence Completeness) rarely runs.

**Cause**: Most games terminate before reaching 50 moves.

**Solution**: This is expected. Increase `numRuns` to hit more long games:
```bash
PBT_BUDGET=NIGHTLY npm test
```

### Generator Never Reaches Terminal States

**Symptom**: No tests exercise winner != null states.

**Cause**: `maxSequenceLength` too low for games to finish.

**Solution**: Increase `maxSequenceLength` or run more iterations:
```typescript
// In config.ts
maxSequenceLength: 300  // Allow longer games
```

### Move Sequence Always Short

**Symptom**: All generated sequences are <10 moves.

**Cause**: Bug in move generation loop causing early exit.

**Debug**:
```typescript
// In generators.ts, add logging:
console.log(`Generated sequence of length ${moveCount}`)
console.log(`Terminal: ${isTerminal}, legal moves: ${legalMoves.length}`)
```

---

## Performance Issues

### Tests Take Too Long Locally

**Symptom**: Running tests takes >10 minutes on dev machine.

**Solutions**:
1. Use CI budget for quick checks:
   ```bash
   PBT_BUDGET=CI npm test -- tests/pbt/
   ```

2. Run only failing tests:
   ```bash
   npm test -- tests/pbt/properties.test.ts -t "Property 7"
   ```

3. Reduce parallel workers:
   ```bash
   npm test -- tests/pbt/ --maxWorkers=2
   ```

### Shrinking Takes Forever

**Symptom**: After a failure, fast-check shrinks for minutes.

**Cause**: Complex failure case with many simplification paths.

**Solutions**:
1. Wait for it to complete (shrinking is valuable)
2. Or interrupt and use the unshrunk failure:
   - Check failure artifact in `tests/pbt-failures/`
   - The artifact contains the full sequence even if shrinking didn't complete

3. Disable shrinking for debugging:
   ```typescript
   fc.assert(property, { endOnFailure: true })
   ```

### Memory Issues (Out of Heap)

**Symptom**: `JavaScript heap out of memory` error.

**Cause**: State history grows too large over many runs.

**Solutions**:
1. Reduce `maxSequenceLength`
2. Reduce `numRuns`
3. Increase Node heap size:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

---

## Failure Investigation

### How to Read a Failure Artifact

Example artifact at `tests/pbt-failures/Property.7-ForcedBoard-seed-123.json`:

```json
{
  "testName": "Property.7-ForcedBoardConstraintEnforcement",
  "seed": 123456,
  "path": "3:2:1",
  "moveSequence": [...],
  "failingStepIndex": 5,
  "invariantName": "ForcedBoardConstraintEnforcement",
  "errorMessage": "nextBoardIndex=3 but move found in board=5"
}
```

**Key fields**:
- `seed` + `path`: Use to reproduce exactly
- `moveSequence`: The minimal failing sequence (after shrinking)
- `failingStepIndex`: Which move triggered the failure
- `stateBefore` / `stateAfter`: States around the failure
- `errorMessage`: What invariant was violated

### Replay a Failure Deterministically

**Step 1**: Create a replay test file:

```typescript
// tests/pbt-replay/replay-seed-123456.test.ts
import { describe, it } from 'vitest'
import { replayMoveSequence } from '../pbt/generators'
import { assertForcedBoardConstraintEnforcement } from '../pbt/invariants'

describe('PBT Replay: Seed 123456', () => {
  it('reproduces failure', () => {
    const moves = [
      // Copy from artifact.moveSequence
      { board: 2, cell: 4 },
      { board: 4, cell: 1 },
      { board: 1, cell: 3 },
    ]
    
    const result = replayMoveSequence(moves)
    
    // Should throw at failing step
    const failingState = result.stateHistory[5]
    assertForcedBoardConstraintEnforcement(failingState)
  })
})
```

**Step 2**: Run it:
```bash
npm test -- tests/pbt-replay/replay-seed-123456.test.ts
```

**Step 3**: Debug with prints:
```typescript
import { prettyPrint } from '../pbt/logging'

console.log(prettyPrint(result.stateHistory[4]))  // State before
console.log(prettyPrint(result.stateHistory[5]))  // Failing state
```

### Narrow Down the Failing Step

If the artifact shows `failingStepIndex: 67`, delta-debug to find the minimal prefix:

```typescript
// Binary search to find earliest failure
const moves = artifact.moveSequence

for (let len = 1; len <= moves.length; len++) {
  const result = replayMoveSequence(moves.slice(0, len))
  const state = result.finalState
  
  try {
    assertMyInvariant(state)
  } catch (e) {
    console.log(`Fails at length ${len}`)
    console.log(`Move: ${moves[len - 1]}`)
    break
  }
}
```

---

## Common Bug Patterns

### Pattern 1: Forced Board Doesn't Transition to FREE

**Symptom**: Property 7 or 9 fails.

**Error Message**: `nextBoardIndex=3 but board 3 is Won; expected FREE`

**Root Cause**: After a move closes a forced board, `nextBoardIndex` not reset to `null`.

**Fix Location**: `src/game/engine.ts`, constraint advance logic after evaluating small board win.

**Example Fix**:
```typescript
// After applying move to board B, cell C:
const nextBoard = move.cell
const nextBoardStatus = evaluateSmall(state.bigBoard[nextBoard]).status

if (nextBoardStatus === 'Open') {
  state.nextBoardIndex = nextBoard
} else {
  state.nextBoardIndex = null  // ← Ensure this line exists
}
```

### Pattern 2: Player Count Mismatch

**Symptom**: Property 1 fails.

**Error Message**: `Current player is X but O count (5) ≠ X count (4)`

**Root Cause**: `currentPlayer` toggle logic bug; player not switching after move.

**Fix Location**: `src/game/engine.ts`, after applying move.

**Example Fix**:
```typescript
// At end of applyMove:
const nextPlayer = state.currentPlayer === 'X' ? 'O' : 'X'
return {
  ...state,
  currentPlayer: nextPlayer,  // ← Ensure toggle happens
}
```

### Pattern 3: Cell Occupied Error Not Thrown

**Symptom**: Property 6 fails.

**Error Message**: `Cell (board=2, cell=5) was X before move, now O`

**Root Cause**: `applyMove` doesn't validate that target cell is empty.

**Fix Location**: `src/game/engine.ts`, validation at start of `applyMove`.

**Example Fix**:
```typescript
export function applyMove(state: GameState, move: Move) {
  // Add validation:
  const cell = state.bigBoard[move.board][move.cell]
  if (cell !== null) {
    throw new CellOccupiedError(`Cell already occupied by ${cell}`)
  }
  // ... rest of logic
}
```

### Pattern 4: Win Detection False Positive

**Symptom**: Property 3 or 12 fails.

**Error Message**: `Board 5 marked as Won by X but checkSmallWin returned null`

**Root Cause**: `evaluateSmall` marks board as won prematurely.

**Fix Location**: `src/game/win-detection.ts`, `checkSmallWin` logic.

**Debug**:
```typescript
const board = state.bigBoard[5]
console.log('Board cells:', board)
console.log('Winner computed:', checkSmallWin(board))
console.log('Expected 3-in-a-row for X')
```

### Pattern 5: Legal Moves in Closed Boards

**Symptom**: Property 11 fails.

**Error Message**: `Board 3 is Won but has 2 legal moves`

**Root Cause**: `getLegalMoves` not filtering closed boards correctly.

**Fix Location**: `src/game/legal-moves.ts`, board status check.

**Example Fix**:
```typescript
function isOpenBoard(board: BoardIndex) {
  const small = state.bigBoard[board]
  const { status } = evaluateSmall(small)
  return status === 'Open'  // ← Ensure this check is correct
}
```

### Pattern 6: Serialization Loses Data

**Symptom**: Serialization property S1 or S2 fails.

**Error Message**: `Original nextBoardIndex: 3, Deserialized nextBoardIndex: "3"`

**Root Cause**: Type coercion during serialization/deserialization.

**Fix Location**: `src/ai/serialize.ts`, type casting.

**Example Fix**:
```typescript
export function deserializeState(obj: any): GameState {
  return {
    bigBoard: obj.bigBoard.map(b => b.slice()),
    currentPlayer: obj.currentPlayer,
    nextBoardIndex: obj.nextBoardIndex === null ? null : Number(obj.nextBoardIndex),  // ← Coerce
    winner: obj.winner === 'Ongoing' ? null : obj.winner,
  }
}
```

---

## Getting Help

If you're stuck:

1. **Check the failure artifact**: `tests/pbt-failures/{testName}-seed-{seed}.json`
2. **Replay the failure**: Create a replay test in `tests/pbt-replay/`
3. **Print state at each step**: Use `prettyPrint(state)` liberally
4. **Binary search the sequence**: Find the minimal prefix that fails
5. **Check existing tests**: See if example-based tests cover this scenario
6. **Consult README.md**: Property definitions and examples

---

## Maintenance

### Archiving Old Failures

After fixing a bug and adding a regression test, archive the failure artifact:

```bash
mkdir -p tests/pbt-failures-archive/2026-02-25/
mv tests/pbt-failures/Property.7-...json tests/pbt-failures-archive/2026-02-25/
```

### Updating Budget Configurations

As the codebase grows, adjust budgets in `config.ts`:

```typescript
// For CI, increase runs as confidence grows:
CI: {
  numRuns: 500,  // was 300
  maxSequenceLength: 250,  // was 200
}
```

### Adding Custom Generators

If you need specific patterns (e.g., always force a board closure):

```typescript
// In generators.ts
export const forcedBoardClosureArbitrary: fc.Arbitrary<MoveSequenceResult> = ...
```

Then use in a focused test.
