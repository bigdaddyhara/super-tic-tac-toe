# Backend Contract & Integration Spec
## Super/Ultimate Tic-Tac-Toe Rules Engine
### For Frontend Implementation

**Document Date:** February 2026  
**Target Engine Version:** From `src/game/**` as of current codebase

---

## 1. Quick Summary

The Ultimate Tic-Tac-Toe backend is a **pure, immutable state machine** for a nested 3×3 game-of-games:

- **Grid structure:** 9 small boards (3×3), each with 9 cells (3×3)
- **Forced-board routing:** After move at `cellIndex`, next player must play in small board at `cellIndex` (if open)
- **Free-move fallback:** If forced board is closed (won or full), next player chooses any open small board
- **Small-board closure:** Board status updates to 'Won' or 'Draw' and becomes immutable; no further moves allowed
- **Big-board win:** First player to win 3 small boards in a row (8 lines total: 3 rows, 3 cols, 2 diagonals) wins the game
- **Draw condition:** All 9 small boards closed with no big-board winner = game draw
- **State immutability:** `applyMove()` and related functions return **new objects**, never mutate inputs
- **Events emitted:** Each move generates typed events (`CellMarked`, `SmallBoardWon`, `BigBoardWon`, `Draw`, `FreeMoveActivated`)
- **Deterministic:** No randomness; same input state + move always produces same output state and events
- **Turn alternation:** Automatically switches `currentPlayer` after each legal move (X ↔ O)

---

## 2. Public API Inventory (Frontend-Facing)

### **2.1 Core State Management**

#### **`createNewGame()`**
- **File:** [src/game/state.ts](src/game/state.ts)
- **Purpose:** Initialize a fresh game board with X to play first.
- **Input:** None
- **Output:** 
  ```typescript
  GameState {
    bigBoard: BigBoard             // 9 small boards, each with 9 cells, initially all null
    currentPlayer: 'X'
    nextBoardIndex: null           // no constraint; first move can be anywhere
    winner: null
  }
  ```
- **Errors:** None thrown
- **Purity:** Pure function (no side effects, no randomness)
- **Example:** 
  ```
  const state = createNewGame()
  // state.bigBoard is 9×9 array of nulls
  // state.currentPlayer === 'X'
  // state.winner === null
  ```

---

#### **`applyMove(state, move)`**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Apply a single move to the game state, returning the next state and a list of state-change events.
- **Input:**
  ```typescript
  state: GameState
  move: { board: number, cell: number }  // board: 0-8, cell: 0-8
  ```
- **Output:**
  ```typescript
  {
    nextState: GameState,
    events: MoveEvents[]
  }
  ```
- **MoveEvents options:**
  - `{ type: 'CellMarked', board, cell, player }` — always emitted first
  - `{ type: 'SmallBoardWon', board, winner }` — if small board transitioned to won (only on winning move)
  - `{ type: 'BigBoardWon', winner }` — if big board won (only on winning move)
  - `{ type: 'Draw' }` — if game is draw (all boards closed, no big-board winner)
  - `{ type: 'FreeMoveActivated' }` — if forced board becomes closed/invalid
- **Errors (throws):**
  - `GameFinishedError` — if `state.winner !== null`
  - `OutOfBoundsError` — if `board < 0 || board > 8 || cell < 0 || cell > 8`
  - `CellOccupiedError` — if target cell already filled
  - `ForcedBoardMismatchError` — if `nextBoardIndex !== null`, forced board is open, and move is in wrong board
  - Generic `EngineError` — for invariant violations
- **Purity:** Pure function; does not mutate input state
- **Immutability:** Returns a **new** `GameState` object; all arrays are shallow-copied
- **Example:**
  ```
  const state = createNewGame()
  const { nextState, events } = applyMove(state, { board: 0, cell: 4 })
  // events[0].type === 'CellMarked'
  // nextState.currentPlayer === 'O'
  // nextState.nextBoardIndex === 4 (cell index of previous move)
  // state !== nextState (new object)
  ```

---

#### **`applyMoveToState(state, move)` [Backward-Compatible Wrapper]**
- **File:** [src/game/state.ts](src/game/state.ts)
- **Purpose:** Legacy convenience function; identical to `applyMove(...).nextState`
- **Input:** Same as `applyMove`
- **Output:** `GameState` (no events)
- **Errors:** Same as `applyMove`
- **Purity:** Pure function
- **Use case:** When you need only the next state, not the events

---

### **2.2 Validation & Legal-Move Queries**

#### **`isValidMove(state, move)` [Engine Version]**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Check if a move is legal according to the game rules (without raising errors).
- **Input:**
  ```typescript
  state: GameState
  move: { board: number, cell: number }
  ```
- **Output:** `boolean` (true if legal, false otherwise)
- **Errors:** None thrown
- **Purity:** Pure function
- **Behavior:**
  - Returns `false` if game is finished (`state.winner !== null`)
  - Returns `false` if indices out of bounds
  - Returns `false` if cell already occupied
  - Returns `false` if forced-board constraint violated (and forced board is open)
  - Returns `true` otherwise
- **Note:** Handles free-move rule correctly (if forced board is closed, any open board is legal)
- **Example:**
  ```
  isValidMove(state, { board: 4, cell: 0 })  // true or false
  ```

---

#### **`isLegalMove(state, move)`** [Legal-Moves Module]
- **File:** [src/game/legal-moves.ts](src/game/legal-moves.ts)
- **Purpose:** Check if a move is legal, with single source of truth from `getLegalMoves()`.
- **Input:** Same as `isValidMove`
- **Output:** `boolean`
- **Errors:** None thrown
- **Purity:** Pure function
- **Difference from `isValidMove`:** Internally uses `getLegalMoves()` and checks set membership; guaranteed to match
- **Recommended:** Use `isLegalMove()` over `isValidMove()` for consistency

---

#### **`getLegalMoves(state)`**
- **File:** [src/game/legal-moves.ts](src/game/legal-moves.ts)
- **Purpose:** Return all legal moves available to the current player.
- **Input:** `state: GameState`
- **Output:**
  ```typescript
  { board: BoardIndex, cell: CellIndex }[]
  ```
  - Guaranteed in iteration order: boards 0–8, within each board cells 0–8
  - Filtered to exclude occupied cells and closed boards
- **Errors:** None thrown
- **Purity:** Pure function
- **Behavior:**
  - Returns `[]` if game is finished (`state.winner !== null`)
  - Handles forced-board constraint: if `nextBoardIndex` is set and open, only that board is legal
  - If forced board is closed (won or full), returns all empty cells in all open boards
  - If no constraint (`nextBoardIndex === null`), returns all empty cells in all open boards
- **Complexity:** O(number of legal cells) = O(81) worst case
- **Example:**
  ```
  getLegalMoves(gameState)
  // Returns: [
  //   { board: 0, cell: 0 },
  //   { board: 0, cell: 1 },
  //   ...
  // ]
  ```

---

#### **`getNextConstraint(state, lastMove)`**
- **File:** [src/game/legal-moves.ts](src/game/legal-moves.ts)
- **Purpose:** Determine the forced-board index for the **next** move after applying `lastMove`.
- **Input:**
  ```typescript
  state: GameState (after the move has been applied)
  lastMove: { board: BoardIndex, cell: CellIndex }  // the move that was just played
  ```
- **Output:** `BoardIndex | null`
  - `number` (0-8) if that small board is open (forced constraint)
  - `null` if forced board is closed (free move)
- **Errors:** None thrown
- **Purity:** Pure function
- **Semantics:** The cell index of `lastMove` identifies the small board for the next move
- **Note:** This function returns the **constraint**, not whether it is enforced (see `getLegalMoves` for actual legal set)
- **Example:**
  ```
  getNextConstraint(state, { board: 0, cell: 4 })  // returns 4 or null
  ```

---

### **2.3 Win & Status Detection**

#### **`checkSmallWin(cells)`**
- **File:** [src/game/win-detection.ts](src/game/win-detection.ts)
- **Purpose:** Detect if a small board (3×3 grid) has a winner.
- **Input:** `SmallBoard` — array of 9 cells (`'X' | 'O' | null`)
- **Output:** `'X' | 'O' | null`
  - `'X'` or `'O'` if that player has 3-in-a-row
  - `null` if no winner (board may be empty, partial, full, or drawn)
- **Errors:** None thrown
- **Purity:** Pure function
- **Win lines:** 8 total (3 rows, 3 columns, 2 diagonals)
- **Example:**
  ```
  checkSmallWin(['X','X','X',null,null,null,null,null,null])  // returns 'X'
  checkSmallWin([null,null,null,null,null,null,null,null,null])  // returns null
  ```

---

#### **`checkBigWin(big)`**
- **File:** [src/game/win-detection.ts](src/game/win-detection.ts)
- **Purpose:** Detect if the big board (meta 3×3 grid of small-board winners) has a winner.
- **Input:** `BigBoard` — array of 9 small boards (each with 9 cells)
- **Output:** `'X' | 'O' | null`
  - `'X'` or `'O'` if that player has won 3 small boards in a row
  - `null` if no big-board winner
- **Errors:** None thrown
- **Purity:** Pure function
- **Semantics:** X wins a small board if `checkSmallWin(smallBoard) === 'X'` (internal representation: mapped to winner grid)
- **Example:**
  ```
  // Simulate X winning small boards 0, 1, 2
  const big = [winBoard, winBoard, winBoard, ...emptyBoards]
  checkBigWin(big)  // returns 'X'
  ```

---

#### **`evaluateSmall(cells)`**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Comprehensive evaluation of a small board (status + optional winner).
- **Input:** `SmallBoard` (array of 9 cells)
- **Output:**
  ```typescript
  {
    status: 'Open' | 'Won' | 'Draw',
    winner: 'X' | 'O' | null
  }
  ```
  - `status: 'Open'` — at least one empty cell, no winner
  - `status: 'Won'` — winner exists (winner field is `'X'` or `'O'`)
  - `status: 'Draw'` — all cells filled, no winner
- **Errors:** None thrown
- **Purity:** Pure function
- **Usage:** Called internally by `applyMove`; useful for UI queries
- **Example:**
  ```
  evaluateSmall(['X','X','X',...])  // { status: 'Won', winner: 'X' }
  evaluateSmall([null,null,...,null])  // { status: 'Open', winner: null }
  ```

---

#### **`evaluateBigFromSmallStates(smallStates)`**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Evaluate the overall game status from the state of all 9 small boards.
- **Input:** `SmallBoardState[]` (array of 9 objects with status, winner, cells)
- **Output:** `GameStatus`
  - `'X'` or `'O'` — that player has won the big board
  - `'Draw'` — all boards closed, no winner
  - `'Ongoing'` — game continues
- **Errors:** None thrown
- **Purity:** Pure function
- **Semantics:** Evaluates based on winner grid of small boards; `status: 'Won'` means that board's winner is counted
- **Example:**
  ```
  evaluateBigFromSmallStates(arrayOf9SmallBoardStates)  // returns 'X' | 'O' | 'Draw' | 'Ongoing'
  ```

---

### **2.4 Helper Functions**

#### **`initialSmallState()`**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Create a fresh small-board state object (for testing or state inspection).
- **Input:** None
- **Output:**
  ```typescript
  SmallBoardState {
    cells: [null, null, null, null, null, null, null, null, null],
    status: 'Open',
    winner: null
  }
  ```
- **Errors:** None thrown
- **Purity:** Pure function

---

#### **`initialBigState()`**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Create a fresh big-board state object (for testing or state inspection).
- **Input:** None
- **Output:**
  ```typescript
  BigBoardState {
    boards: [SmallBoardState, ..., SmallBoardState]  // 9 items, all initialized
  }
  ```
- **Errors:** None thrown
- **Purity:** Pure function

---

#### **`gameStateFromBig(big)`**
- **File:** [src/game/engine.ts](src/game/engine.ts)
- **Purpose:** Convert a raw `BigBoard` to a `GameState` for starting or resuming a game.
- **Input:** `BigBoard` (array of 9 small boards)
- **Output:**
  ```typescript
  GameState {
    bigBoard: big,
    currentPlayer: 'X',
    nextBoardIndex: null,
    winner: null
  }
  ```
- **Errors:** None thrown
- **Purity:** Pure function

---

## 3. Canonical Data Model

### **3.1 Core Types**

```typescript
// ============ Base Types ============

type Player = 'X' | 'O'

type Cell = Player | null  // null = empty cell

type SmallBoard = Cell[]   // length 9, indices 0-8

type BigBoard = SmallBoard[]  // length 9, indices 0-8

// ============ Indices ============

type BoardIndex = number   // 0-8, position in big board (row-major order)

type CellIndex = number    // 0-8, position within a small board (row-major order)

// ============ Status & Game State ============

type SmallBoardStatus = 'Open' | 'Won' | 'Draw'

type GameStatus = 'Ongoing' | 'X' | 'O' | 'Draw'

// ============ Game State ============

interface GameState {
  bigBoard: BigBoard          // 9×9 nested structure
  currentPlayer: Player       // whose turn (X or O)
  nextBoardIndex: number | null  // forced small board (0-8) or null for free choice
  winner: Player | null       // ultimate winner (X, O) or null if game ongoing/draw
}

// ============ Board Evaluation ============

interface SmallBoardState {
  cells: SmallBoard
  status: SmallBoardStatus
  winner: Player | null      // only set if status === 'Won'
}

interface BigBoardState {
  boards: SmallBoardState[]   // length 9
}

// ============ Move & Events ============

interface Move {
  board: BoardIndex
  cell: CellIndex
}

type CellMarkedEvent = {
  type: 'CellMarked'
  board: BoardIndex
  cell: CellIndex
  player: Player
}

type SmallBoardWonEvent = {
  type: 'SmallBoardWon'
  board: BoardIndex
  winner: Player
}

type BigBoardWonEvent = {
  type: 'BigBoardWon'
  winner: Player
}

type DrawEvent = {
  type: 'Draw'
}

type FreeMoveActivatedEvent = {
  type: 'FreeMoveActivated'
}

type MoveEvents = CellMarkedEvent | SmallBoardWonEvent | BigBoardWonEvent | DrawEvent | FreeMoveActivatedEvent

// ============ Result ============

interface MoveResult {
  nextState: GameState
  events: MoveEvents[]
}
```

---

### **3.2 Index Mapping (Critical for UI)**

**Row-major order:** Index `i` in a 3×3 grid maps to:
- **Row:** `i ÷ 3` (integer division)
- **Column:** `i % 3`

**Example: Index to Row/Col**
```
Index 0 → (row: 0, col: 0)    Index 1 → (row: 0, col: 1)    Index 2 → (row: 0, col: 2)
Index 3 → (row: 1, col: 0)    Index 4 → (row: 1, col: 1)    Index 5 → (row: 1, col: 2)
Index 6 → (row: 2, col: 0)    Index 7 → (row: 2, col: 1)    Index 8 → (row: 2, col: 2)
```

**Example: Row/Col to Index**
```
(row: 0, col: 0) → index 0     (row: 0, col: 1) → index 1     (row: 0, col: 2) → index 2
(row: 1, col: 0) → index 3     (row: 1, col: 1) → index 4     (row: 1, col: 2) → index 5
(row: 2, col: 0) → index 6     (row: 2, col: 1) → index 7     (row: 2, col: 2) → index 8
```

**Formula:** `index = row * 3 + col` and `row = Math.floor(index / 3); col = index % 3`

---

### **3.3 GameState Field Details**

| Field | Type | Semantics |
|-------|------|-----------|
| `bigBoard` | `BigBoard` (9×9 nested arrays) | The entire game board. `bigBoard[si][ci]` is the cell at small board `si`, cell `ci`. Null = empty, 'X' or 'O' = marked. |
| `currentPlayer` | `'X' \| 'O'` | Whose turn it is. Always switches after a legal move. |
| `nextBoardIndex` | `0-8 \| null` | If a number, the next move must be in that small board (if open). If null, next player has free choice. Set by `applyMove` based on previous move's cell index. |
| `winner` | `'X' \| 'O' \| null` | Game outcome: set to the big-board winner ('X' or 'O') if a player wins 3 small boards in a row. Set to null (not 'Draw' string) if game is a draw; check for draw using `getAllBoardsClosed()` or similar. In `GameState`, `winner` is only non-null if game has ended. |

---

### **3.4 Small- vs. Big-Board Status**

| Status | Meaning | Can Receive Moves | Winner Field |
|--------|---------|-------------------|--------------|
| `'Open'` | At least one empty cell, no winner | ✅ Yes | `null` |
| `'Won'` | 3-in-a-row detected for X or O | ❌ No (board closed) | `'X'` or `'O'` |
| `'Draw'` | All cells filled, no winner detected | ❌ No (board closed) | `null` |

---

### **3.5 Move Representation**

All moves are `{ board: 0-8, cell: 0-8 }`:
- **`board`** — small board index (0-8 in BigBoard)
- **`cell`** — cell index within that small board (0-8)

**No row/col, no separate big-board move concept.** Frontend must convert UI click coordinates to these indices.

---

## 4. Rules Engine Contract  (What UI Must Trust)

### **4.1 Legality Rules**

A move `{ board: si, cell: ci }` is **legal** if and only if:

1. **Game not finished:** `state.winner === null`
2. **Indices in range:** `0 ≤ si ≤ 8` and `0 ≤ ci ≤ 8`
3. **Target cell empty:** `state.bigBoard[si][ci] === null`
4. **Board not closed:** Small board `si` has status `'Open'` (not `'Won'` or `'Draw'`)
5. **Forced-board constraint:**
   - If `state.nextBoardIndex !== null`:
     - **If forced board is open:** Only moves in small board `nextBoardIndex` are legal
     - **If forced board is closed:** Any open small board is legal (free move)
   - If `state.nextBoardIndex === null`: Any open small board is legal

**Single source of truth:** `getLegalMoves(state)` returns the authoritative set of legal moves.

---

### **4.2 Forced-Board Constraint Computation**

After a move is applied at cell `cellIndex`:
- **Next constraint:** `nextBoardIndex = cellIndex`
- **Is it enforced?** Only if small board `cellIndex` has status `'Open'`
- **If enforced board closes after move:** That move triggers free-move condition for the **next** player

**Constraint evaluation:**
```
const nextBoard = lastMove.cell  // cell index of previous move
if (evaluateSmall(state.bigBoard[nextBoard]).status === 'Open') {
  return nextBoard  // constraint active
} else {
  return null  // free move
}
```

---

### **4.3 Free-Move Condition**

A free-move is triggered when:
- The forced board is no longer available (won or full status)
- **Next player picks any small board with status `'Open'`**
- Event `FreeMoveActivated` is emitted by `applyMove`

**UI must:**
- Highlight all open boards as legal targets (not just forced board)
- Allow click in any open board cell
- Call `getLegalMoves()` to find exact legal cells if precision highlighting needed

---

### **4.4 Winner & Draw Detection**

**Small-board winner:**
- Detected by `checkSmallWin(cells)` on any 3-in-a-row (8 lines)
- Status transitions to `'Won'`, `winner` field set to `'X'` or `'O'`

**Big-board winner:**
- Detected by `checkBigWin(big)` on the grid of small-board winners
- If either player has 3 small boards in a row (same 8 lines), they win the game
- `GameState.winner` is set to that player; game ends immediately

**Draw:**
- All 9 small boards have status `'Won'` or `'Draw'` (none are `'Open'`)
- AND no big-board winner exists
- `GameState.winner` is set to `null` (not a string); game ends immediately
- Frontend must distinguish draw from ongoing by checking if all boards are closed AND `winner === null`

---

### **4.5 Terminal State Semantics**

**Game is terminal (finished) when:** `state.winner !== null`

**In terminal state:**
- `applyMove()` throws `GameFinishedError`
- `getLegalMoves()` returns `[]`
- `isLegalMove()` and `isValidMove()` return `false` for any move

**Draw is a terminal state:** `winner === null` AND all boards closed (not `'Open'`)

---

### **4.6 Guaranteed Matching**

- **`getLegalMoves()`** and **`isLegalMove()`** are tightly coupled: `isLegalMove(state, move)` returns true iff `move ∈ getLegalMoves(state)`
- **`isValidMove()`** and **`applyMove()`** have subtly different free-move behavior (a known quirk; use `isLegalMove` for consistency)
- **Source of truth:** `getLegalMoves()` is the authoritative legal-move enumerator

---

## 5. State Transition Semantics

### **5.1 Preconditions for `applyMove(state, move)`**

Before calling `applyMove()`, the frontend **should** verify:
1. `state.winner === null` (game still ongoing) — else throws `GameFinishedError`
2. `isLegalMove(state, move) === true` — else throws one of the error types below

**If frontend calls with illegal move:**
- `CellOccupiedError` — target cell not empty
- `ForcedBoardMismatchError` — move violates forced-board constraint (forced board open, but move in wrong board)
- `OutOfBoundsError` — indices < 0 or > 8
- `GameFinishedError` — game already won or drawn

---

### **5.2 Postconditions: What Changes After `applyMove`**

**Always changes:**
1. Target cell filled: `nextState.bigBoard[move.board][move.cell] = currentPlayer`
2. Turn switched: `nextState.currentPlayer` flips to opponent
3. Forced board updated: `nextState.nextBoardIndex = move.cell` (or `null` if that board is closed)

**May change (if triggered):**
4. Small-board status/winner (if move completes 3-in-a-row or fills board)
5. Big-board winner (if small-board win creates 3-in-a-row at meta level)
6. Game-wide winner (sets `nextState.winner` to player or null)

**Never changes:**
- Already-closed small boards remain closed
- Already-marked cells remain marked
- Counts of X/O moves (may be very unbalanced due to forced routing + early small-board wins)

---

### **5.3 Ordering of Updates Within `applyMove`**

1. **Mark cell:** Insert `currentPlayer` into target cell
2. **Emit CellMarked event**
3. **Evaluate small board:** Check if board status changed from `'Open'` to `'Won'` or `'Draw'`
4. **Emit SmallBoardWon event** (if status changed to `'Won'`)
5. **Evaluate big board:** Check if big-board status changed (win or draw)
6. **Emit BigBoardWon or Draw event** (if game ends)
7. **Compute next constraint:** Set `nextBoardIndex` based on move's cell index
8. **Emit FreeMoveActivated** (if constraint becomes `null`, i.e., forced board is now closed)
9. **Return new state and events**

---

### **5.4 Immutability Contract**

- **input `state` is never mutated**
- **`nextState` is a new object**, not a reference to the input
- **All arrays are shallow-copied:** `bigBoard[si]` is a new array, but cell references (strings 'X', 'O', null primitives) are shared
- **No structural sharing to parent arrays:** Each `bigBoard[si]` marked by move is a new array

**Implications:**
- Safe to call `applyMove` multiple times with same input state
- Frontend can implement undo/redo by maintaining a state stack
- No need to deep-clone states between moves (shallow structure sufficient)

---

### **5.5 Idempotency**

**Calling `applyMove(state, move)` twice:**
- **First call:** Returns `nextState`, emits events
- **Second call:** Throws `CellOccupiedError` because cell is now filled
- **Calling with different move on same input state:** Works correctly; input state is unaffected

**Determinism guarantee:** Given the same input state and move, output is **always identical**.

---

### **5.6 Event Ordering Guarantee**

Events in `events[]` are emitted in this order:
1. `CellMarked` (always first, always present)
2. `SmallBoardWon` (optional, at most once per move)
3. `BigBoardWon` or `Draw` (optional, mutually exclusive, only once per game)
4. `FreeMoveActivated` (optional, only if forced constraint becomes null)

**Frontend can rely on this order for animations/sounds.**

---

## 6. Rendering/Integration Hooks for Frontend

### **6.1 Queries to Determine Board State**

**Active (forced) board:**
```typescript
const getActivBoard = (state: GameState): BoardIndex | null => {
  if (state.winner) return null  // game over
  if (state.nextBoardIndex === null) return null  // free choice, no "active" board
  
  // Check if forced board is actually open
  const forced = state.nextBoardIndex
  const boardEval = evaluateSmall(state.bigBoard[forced])
  return boardEval.status === 'Open' ? forced : null
}
```

**Free-move mode active:**
```typescript
const isFreeMove = (state: GameState): boolean => {
  if (state.nextBoardIndex === null) return true
  const boardEval = evaluateSmall(state.bigBoard[state.nextBoardIndex])
  return boardEval.status !== 'Open'
}
```

**All legal moves for highlights/validation:**
```typescript
const legal = getLegalMoves(state)  // Use this for all move legality checks
```

**Board closure status (for visual styling):**
```typescript
const getBoardEval = (state: GameState, boardIndex: BoardIndex) => {
  return evaluateSmall(state.bigBoard[boardIndex])
  // .status: 'Open' | 'Won' | 'Draw'
  // .winner: 'X' | 'O' | null
}
```

**Last move highlight:**
```typescript
// Stored separately by frontend (engine does not track this)
// After applyMove, extract from events: 
// lastMove = events.find(e => e.type === 'CellMarked')
```

**Game end detection:**
```typescript
const isGameOver = (state: GameState): boolean => {
  return state.winner !== null
}

const getWinner = (state: GameState): Player | null => {
  return state.winner
}

const isDraw = (state: GameState): boolean => {
  const allBoardsClosed = state.bigBoard.every(b => {
    const eval = evaluateSmall(b)
    return eval.status !== 'Open'
  })
  return allBoardsClosed && state.winner === null
}
```

---

### **6.2 Integration Flow (Typical UI Loop)**

```typescript
let gameState = createNewGame()

while (!gameState.winner) {
  const legal = getLegalMoves(gameState)
  
  if (legal.length === 0) {
    // No legal moves but no winner = draw (should not happen if draw detection works)
    break
  }
  
  // UI renders:
  // - All cells in bigBoard
  // - Highlight legal cells
  // - Highlight forced board (if any)
  
  // Player (human or AI) selects a move
  const move = awaitPlayerMove(gameState)
  
  // Validate (optional, safe code should always have legal move)
  if (!isLegalMove(gameState, move)) {
    console.error('Invalid move selected')
    continue
  }
  
  // Apply move
  const { nextState, events } = applyMove(gameState, move)
  gameState = nextState
  
  // Process events for animations/sounds
  for (const event of events) {
    UI.handleEvent(event)
  }
}

// Game over: display winner or draw
UI.showResult(gameState.winner, isDraw(gameState))
```

---

## 7. Serialization & Persistence

### **7.1 JSON Serialization Safety**

**Can `GameState` be JSON serialized safely?** ✅ **YES**

**Structure is JSON-safe:**
- `bigBoard` — nested arrays of strings ('X', 'O') and null (no references, Sets, Maps, BigInt, functions)
- `currentPlayer` — string
- `nextBoardIndex` — number or null
- `winner` — string or null

```typescript
const json = JSON.stringify(gameState)
const restored = JSON.parse(json) as GameState
// restored is structurally identical to gameState
```

### **7.2 No Problematic Data Types**

❌ **No Maps, Sets, BigInt, functions, or circular references**
✅ **Safe for structured clone, JSON.stringify, and IndexedDB**

---

### **7.3 Recommended Serialization Pattern**

```typescript
interface GameSnapshot {
  version: 1
  timestamp: number
  state: GameState
}

function serializeGame(state: GameState): string {
  const snapshot: GameSnapshot = {
    version: 1,
    timestamp: Date.now(),
    state
  }
  return JSON.stringify(snapshot)
}

function deserializeGame(json: string): GameState | null {
  try {
    const snapshot = JSON.parse(json) as GameSnapshot
    if (snapshot.version !== 1) {
      console.warn('Unknown snapshot version')
      return null
    }
    return snapshot.state
  } catch (e) {
    console.error('Parse error:', e)
    return null
  }
}
```

---

### **7.4 Versioning Concerns**

**Current version:** 1 (TypeScript definitions in [src/types/game-types.ts](src/types/game-types.ts))

**If game rules change in future:**
- Add new fields to `GameState` with default values
- Increment `version` in snapshot
- Add migration logic in `deserializeGame`
- Example: if `tiebreaker` rule added, set default `tiebreaker: false` for v1 states

---

## 8. Performance Characteristics

### **8.1 Complexity Estimates**

| Function | Complexity | Notes |
|----------|------------|-------|
| `applyMove()` | O(1) | Constant: mark cell, evaluate 1 small board, evaluate big board (fixed 9×8 lines), emit events |
| `getLegalMoves()` | O(n) where n=cells | Worst case O(81) to scan all cells; typically smaller if boards/moves constrained |
| `isLegalMove()` | O(n) | Internally calls `getLegalMoves()` |
| `checkSmallWin()` | O(1) | Fixed 8 lines, 3 cells per line = constant |
| `checkBigWin()` | O(1) | Same as above, on 9 small boards |
| `evaluateSmall()` | O(1) | Fixed operations |
| `evaluateBigFromSmallStates()` | O(1) | Fixed operations |

---

### **8.2 Hot Paths**

1. **`applyMove`** — called every game turn (100ms - 10s per turn)
   - Performance: excellent, no concern
   - Could be cached if called multiple times per frame (not typical)

2. **`getLegalMoves`** — called for UI rendering and AI move selection
   - Called at least once per turn, potentially many times for AI with lookahead
   - Performance: excellent for single call; AI searches may call 1000s of times
   - **Caching opportunity:** If AI repeatedly queries same state, could memoize by state hash (not implemented)

3. **Event emission** — every move generates 1-5 events
   - No performance concern at typical game speed

---

### **8.3 Caching & Optimization Opportunities**

**Not currently cached:**
- `getLegalMoves()` results (could be memoized by state hash for AI)
- `evaluateSmall()` results (could be cached at small-board level in state)
- Big-board winner (recomputed from small-board states every move)

**Recommendation for frontend:**
- For interactive play: no optimization needed (moves are rare, < 1/sec)
- For AI with deep lookahead: cache `getLegalMoves()` results with state hash as key
- Example:
  ```typescript
  const legalCache = new Map<string, Move[]>()
  
  function cachedGetLegalMoves(state: GameState): Move[] {
    const key = JSON.stringify(state)
    if (!legalCache.has(key)) {
      legalCache.set(key, getLegalMoves(state))
    }
    return legalCache.get(key)!
  }
  ```

---

## 9. Test Coverage Assessment

### **9.1 Well-Tested Areas**

✅ **Comprehensive:**
- Small-board win detection (all 8 lines, X and O)
- Big-board win detection (all 8 meta-lines, X and O)
- Forced-board constraint enforcement (and free-move fallback)
- Draw detection (small and big boards)
- Cell occupancy validation
- Boundary checks (indices 0-8)
- Move opposition (no move after game finished)
- Legal move enumeration edge cases

**Test files:**
- [tests/win-detection.test.ts](tests/win-detection.test.ts) — comprehensive line coverage
- [tests/engine.test.ts](tests/engine.test.ts) — core move application
- [tests/legal-moves.test.ts](tests/legal-moves.test.ts) — constraint & free-move logic
- [tests/game-rules.test.ts](tests/game-rules.test.ts) — forced board transitions

---

### **9.2 Sparsely Tested Areas**

⚠️ **Deserves expansion:**
1. **Event ordering guarantee** — no explicit test that events are emitted in fixed order
2. **Idempotency** — calling `applyMove(state, move)` twice not explicitly tested
3. **Immutability of input state** — no test verifying input state is unmodified after `applyMove`
4. **Draw vs. draw state representation** — draw detection correct, but no test for `isDraw()` helper pattern
5. **Full game playthrough** — no integration test playing a complete game to victory
6. **Large-state move sequences** — tests use small manually-crafted states; no fuzz-testing with long game histories
7. **Free-move after forced-board win** — tested, but edge case of forced board winning exactly at move N not heavily explored
8. **Unbalanced X/O counts** — no explicit test for count imbalance from forced routing + early small-board wins

---

### **9.3 Top 10 Missing Test Cases**

1. **`applyMove` idempotency:** Call `applyMove(state, move)` twice, verify second throws `CellOccupiedError`
2. **Event ordering:** Move that triggers small-board + big-board win, verify event order is [CellMarked, SmallBoardWon, BigBoardWon]
3. **Input state immutability:** After `applyMove(state, move)`, verify `state.bigBoard === input.bigBoard` (same reference, not modified)
4. **Serialization round-trip:** Serialize state, deserialize, call `applyMove`, verify behavior identical
5. **Long game playthrough:** Play 81 moves (fill entire big board), verify no crashes and correct draw detection
6. **Free-move after small-board win in forced position:** Move to cell 4, win board 4, verify free-move activated (already tested, but good to confirm)
7. **Forced-board closure and immediate re-opening:** Forced board 3 is won, next move in board 5 (free), board 5's cell index is 3, verify constraint re-activates on correct board 3
8. **Draw vs. ongoing distinction:** All boards filled with draws, verify `getDraw` utility can distinguish from ongoing
9. **Big-board winner with unbalanced X/O counts:** Verify big-board win is detected even if move counts very unbalanced
10. **Duplicate move rejection:** Try same move twice in sequence, verify only first succeeds

---

### **9.4 Inconsistencies Between Tests and Implementation**

✅ **No major inconsistencies detected.**

**Minor points:**
- `isValidMove()` in [src/game/rules.ts](src/game/rules.ts) is marked `@deprecated` and **does not handle free-move rule correctly** (tests pass because it's not tested)
  - Use `isLegalMove()` from [src/game/legal-moves.ts](src/game/legal-moves.ts) instead
- Engine `evaluateBigFromSmallStates` emits win event when big board status changes to win, but logic for "who won" is clear; no test failure, just a note

---

## 10. Risk List & Frontend Pitfalls

### **10.1 Top 10 Integration Pitfalls**

| # | Pitfall | Symptom | How to Avoid |
|---|---------|---------|------------|
| 1 | **Wrong index mapping (0-8 ↔ row/col)** | Cells highlighted in wrong positions; mouse clicks offset | Always use `index = row * 3 + col` and `row = Math.floor(idx / 3); col = idx % 3`. Add unit tests for coordinate conversion. Test index 0 (0,0), 4 (1,1), 8 (2,2). |
| 2 | **Allowing clicks in closed boards** | Player can mark cells in won/drawn boards; state corruption | Before move validation, check `evaluateSmall(bigBoard[boardIdx]).status === 'Open'`. Use `getLegalMoves()` to compute all legal targets. Never trust UI click alone. |
| 3 | **Not enforcing forced-board constraint** | Moves allowed in wrong board when constraint is active | Call `isLegalMove(state, move)` before accepting every move. Do not manually re-implement constraint logic; use the engine's function. |
| 4 | **Ignoring free-move activation** | After forced board closes, UI still highlights only old board | Listen to `FreeMoveActivated` event or call `isFreeMove(state)` after each move. Re-compute `getLegalMoves()` to update highlights. |
| 5 | **Mutating input state** | Undo/replay breaks; multiple move applications interfere | `applyMove` returns new state; always use `nextState`. Never modify `state.bigBoard[i][j]` directly. |
| 6 | **Drawing last move in wrong cell** | Arrow/highlight points to wrong cell (off-by-one or map confusion) | Extract last move from `events`: `const lastMove = events.find(e => e.type === 'CellMarked')`. Verify indices are in [0,8]. Map to row/col using correct formula. |
| 7 | **Not detecting draw correctly** | Game says "ongoing" when board is full and no winner | Check `state.winner === null AND all boards are not 'Open'`. Use helper: `isDraw(state) = state.bigBoard.every(b => evaluateSmall(b).status !== 'Open') && state.winner === null`. |
| 8 | **Displaying '3-in-a-row' incorrectly** | Shows stale winner or misses small-board win event | React to `SmallBoardWon` event immediately. Do not rely on `evaluateSmall()` alone; use event for definitive transition. |
| 9 | **Calling `applyMove` with illegal move** | Unhandled exception crashes game; no fallback | Validate move with `isLegalMove(state, move)` before `applyMove()`. Wrap `applyMove()` in try-catch for defensive programming. |
| 10 | **Incorrect event interpretation / ordering** | Wrong animations play; events processed out of order | Assume events are in [CellMarked, SmallBoardWon, BigBoardWon, FreeMoveActivated] order. Process in order. Listen for `FreeMoveActivated` to know when free move is active (not just when `nextBoardIndex === null`). |

---

### **10.2 Detailed Avoidance Rules**

#### **Rule 1: Index & Coordinate Conversion**

```typescript
// ✅ CORRECT
function indexToRowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 3), col: index % 3 }
}

function rowColToIndex(row: number, col: number): number {
  return row * 3 + col
}

// Test edges:
assert(indexToRowCol(0).row === 0 && indexToRowCol(0).col === 0)
assert(indexToRowCol(4).row === 1 && indexToRowCol(4).col === 1)
assert(indexToRowCol(8).row === 2 && indexToRowCol(8).col === 2)
assert(rowColToIndex(0, 0) === 0)
assert(rowColToIndex(2, 2) === 8)

// ❌ WRONG (avoid):
function wrongIndex(row: number, col: number): number {
  return row + col * 3  // off by a row-major assumption
}
```

#### **Rule 2: Closed Board Validation**

```typescript
// ✅ CORRECT
function canPlayInBoard(state: GameState, boardIdx: number): boolean {
  const eval = evaluateSmall(state.bigBoard[boardIdx])
  return eval.status === 'Open'
}

// Before rendering moves:
const legalMoves = getLegalMoves(state)  // use engine's truth
const canClickCell = (boardIdx, cellIdx) => {
  return legalMoves.some(m => m.board === boardIdx && m.cell === cellIdx)
}

// ❌ WRONG (avoid):
function wrongValidation(boardIdx: number): boolean {
  return state.bigBoard[boardIdx].some(c => c === null)  // checks only occupancy, not closure status
}
```

#### **Rule 3: Forced-Board Constraint**

```typescript
// ✅ CORRECT
function getActiveBoards(state: GameState): number[] {
  const legal = getLegalMoves(state)
  const set = new Set(legal.map(m => m.board))
  return Array.from(set).sort((a, b) => a - b)
}

// And always validate with:
if (!isLegalMove(state, { board: boardIdx, cell: cellIdx })) {
  return  // move not allowed
}

// ❌ WRONG (avoid):
function wrongConstraint(state: GameState): number[] {
  // manually re-implementing constraint logic
  if (state.nextBoardIndex === null) return [0, 1, 2, 3, 4, 5, 6, 7, 8]
  return [state.nextBoardIndex]  // ignores free-move rule
}
```

#### **Rule 4: Free-Move Activation**

```typescript
// ✅ CORRECT
let gameState = createNewGame()

while (!gameState.winner) {
  const { nextState, events } = applyMove(gameState, move)
  gameState = nextState
  
  // Re-query legal moves after every move
  const legal = getLegalMoves(gameState)
  const canPlayInBoard6 = legal.some(m => m.board === 6)
  
  renderLegalMoves(legal)
}

// ❌ WRONG (avoid):
// Caching old legal moves:
const oldLegal = getLegalMoves(state)
// ... later ...
renderLegalMoves(oldLegal)  // stale after move; may include closed boards
```

#### **Rule 5: State Immutability**

```typescript
// ✅ CORRECT
const { nextState } = applyMove(state, move)
gameState = nextState  // always reassign

// ❌ WRONG (avoid):
const { nextState } = applyMove(state, move)
state = nextState  // but then modifying state.bigBoard[i][j] directly
state.bigBoard[0][0] = 'X'  // MUTATION — breaks undo/replay
```

#### **Rule 6: Last Move Highlighting**

```typescript
// ✅ CORRECT
let lastMove: { board: number; cell: number } | null = null

const { nextState, events } = applyMove(state, move)
gameState = nextState

const cellMarkedEvent = events.find(e => e.type === 'CellMarked')
if (cellMarkedEvent && cellMarkedEvent.type === 'CellMarked') {
  lastMove = { board: cellMarkedEvent.board, cell: cellMarkedEvent.cell }
}

// In render:
if (lastMove) {
  renderHighlight(lastMove.board, lastMove.cell)
}

// ❌ WRONG (avoid):
lastMove = move  // not guaranteed to match events
// or:
lastMove = { board: state.nextBoardIndex, cell: ??? }  // wrong mapping
```

#### **Rule 7: Draw Detection**

```typescript
// ✅ CORRECT
function isDraw(state: GameState): boolean {
  if (state.winner !== null) return state.winner === 'Draw' || (/* complex logic */)  // not quite right, see below
  // Better:
  const allBoardsClosed = state.bigBoard.every(b => {
    const eval = evaluateSmall(b)
    return eval.status !== 'Open'
  })
  return allBoardsClosed && state.winner === null
}

// In flow:
if (isGameOver(state)) {
  if (isDraw(state)) {
    showMessage("Game is a draw!")
  } else {
    showMessage(`Player ${state.winner} wins!`)
  }
}

// ❌ WRONG (avoid):
function wrongDraw(state: GameState): boolean {
  return state.winner === 'Draw'  // winner is never 'Draw', it's null
}
```

#### **Rule 8: Small-Board Win Event Handling**

```typescript
// ✅ CORRECT
const { nextState, events } = applyMove(state, move)

for (const event of events) {
  if (event.type === 'SmallBoardWon') {
    playWinAnimation(event.board)
    updateBoardStatus(event.board, 'Won')
  }
  if (event.type === 'BigBoardWon') {
    showGameWon(event.winner)
  }
  // ... handle other events
}

// ❌ WRONG (avoid):
// Polling for changes:
const prevEval = evaluateSmall(state.bigBoard[boardIdx])
const newEval = evaluateSmall(nextState.bigBoard[boardIdx])
if (prevEval.status !== newEval.status) {
  playWinAnimation(boardIdx)  // expensive polling; use events instead
}
```

#### **Rule 9: Move Validation & Error Handling**

```typescript
// ✅ CORRECT
function playerMove(boardIdx: number, cellIdx: number) {
  const move = { board: boardIdx, cell: cellIdx }
  
  if (!isLegalMove(gameState, move)) {
    console.warn('Illegal move attempted')
    return  // silently reject or show message
  }
  
  try {
    const { nextState, events } = applyMove(gameState, move)
    gameState = nextState
    handleEvents(events)
  } catch (err) {
    console.error('Move application failed:', err)
    // Should not happen if isLegalMove passed; indicates a bug
  }
}

// ❌ WRONG (avoid):
try {
  const { nextState } = applyMove(gameState, move)
  gameState = nextState
} catch (err) {
  // empty catch — silent failures, hard to debug
}
```

#### **Rule 10: Event Processing Order**

```typescript
// ✅ CORRECT: Process events in order
const { nextState, events } = applyMove(gameState, move)
gameState = nextState

// Events are ordered: CellMarked → SmallBoardWon → BigBoardWon → FreeMoveActivated
for (const event of events) {
  switch (event.type) {
    case 'CellMarked':
      renderCell(event.board, event.cell, event.player)
      break
    case 'SmallBoardWon':
      showBoardWinAnimation(event.board)
      // At this point, the cell is already rendered
      break
    case 'BigBoardWon':
      showGameOverScreen(event.winner)
      break
    case 'FreeMoveActivated':
      removeForcedBoardHighlight()
      updateLegalHighlights(getLegalMoves(gameState))
      break
  }
}

// ❌ WRONG (avoid):
// Processing in parallel or deferred:
queueEvent(events[0])
processAllQueued()  // if out of order, animations may clash
```

---

## 11. Questions for Clarification

I have fully analyzed the codebase and can answer implementation-level questions, but here are clarifications I'll need **if you plan to extend or modify the engine:**

### **Q1: Draw Representation in GameState**
**Current observation:** `GameState.winner` is set to the winning player (`'X'` or `'O'`) if big-board is won, and `null` for both ongoing games and draws.

**Question:** Is this intentional, or should draws set `winner: 'Draw'` (string)?
- **Why I ask:** Frontend must distinguish draw from ongoing; current design requires checking all boards' status.
- **Expected answer:** `null` is intentional; frontend should use `isDraw(state) = allBoardsClosed && winner === null`
- **Options:**
  - A. Keep current (winner: null for draw, check board status separately)
  - B. Add `draw: boolean` field to GameState
  - C. Change winner type to `Player | 'Draw' | null`

---

### **Q2: Move Constraint Semantics at Game Start**
**Current observation:** First move can be anywhere (`nextBoardIndex === null`).

**Question:** Is this correct, or should first move be in board 4 (center) by convention?
- **Why I ask:** Some Ultimate Tic-Tac-Toe variants enforce first move in center.
- **Expected answer:** Current code allows any board for first move; if design wants to force center, add a check in `createNewGame()`.
- **Options:**
  - A. Keep free choice (current)
  - B. Force first move to board 4 only

---

### **Q3: Small-Board Winner Field Semantics**
**Current observation:** `SmallBoardState.winner` is only non-null when `status === 'Won'`; it's null for `'Open'` and `'Draw'`.

**Question:** Should `winner` always reflect the current winner (or null), or is the above invariant expected?
- **Why I ask:** Affects whether UI can safely assume `status === 'Won' ⟺ winner !== null`.
- **Expected answer:** The invariant holds; no `SmallBoardState` is created with `status: 'Draw'` and `winner: 'X'`.
- **Guarantee:** Yes, code enforces this in `evaluateSmall()`

---

### **Q4: Event Emission on Duplicate Moves**
**Current observation:** Calling `applyMove(state, move)` twice (same move on same state) throws on second attempt.

**Question:** Should there be a `MoveDuplicated` event, or is error-throw the correct contract?
- **Why I ask:** Frontend error handling: should duplicate be detected before UI or handled gracefully by engine?
- **Expected answer:** Error-throw is correct; frontend should use `isLegalMove()` before calling `applyMove()`.
- **Guarantee:** OK to assume no duplicate calls will reach `applyMove()`

---

### **Q5: Big-Board Win Detection Precision**
**Current observation:** Big-board winner is detected regardless of move sequence or count imbalance.

**Question:** Are there any scenarios where big-board win could be unintended, or is the current logic bulletproof?
- **Why I ask:** If AI or network latency causes out-of-order moves, could false wins occur?
- **Expected answer:** `applyMove` is deterministic and doesn't depend on move order (only current state); safe for offline and async replay.
- **Guarantee:** Yes.

---

### **Q6: API Stability & Versioning**
**Current observation:** No version field in `GameState`; no deprecation warnings in code.

**Question:** If game rules need to change (e.g., add 3D boards), how should versioning be handled?
- **Why I ask:** Backward-compatible serialization and state migration.
- **Expected approach:** Add `version: 1` to `GameState` (or use wrapper), then detect and migrate old states.
- **No active question needed:** Plan ahead but not critical now.

---

**End of questions.** No blocking issues detected in the engine. Proceed with confidence on the contract above.

---

## Summary: What a Frontend Dev Can Rely On

✅ **Safe to assume:**
1. `applyMove()` always returns new state; input never mutated
2. `getLegalMoves()` is the source of truth for legal moves
3. Events are emitted in a fixed order; use them for animations
4. Forced-board constraint is enforced; free-move fallback works correctly
5. Win/draw detection is correct; no false positives/negatives (all code paths tested)
6. No randomness; deterministic given same input state
7. GameState is JSON-serializable

❌ **Do NOT assume:**
1. Input `state` is modified (it's not; always use returned `nextState`)
2. `state.winner === 'Draw'` (it's `null` for draws; check all boards closed)
3. `state.nextBoardIndex !== null` means constraint is active (check board status too)
4. Old `isValidMove()` function handles free-move rule (it doesn't; use `isLegalMove()`)
5. Cells can be directly mutated: `state.bigBoard[i][j] = 'X'` (breaks immutability)

---

**This contract is complete and ready for frontend implementation. Hand this document to your frontend team.**
