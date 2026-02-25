/**
 * Invariant assertions for property-based testing.
 * Each function validates a specific invariant that must hold after every move.
 */

import { GameState, Move, Player } from '../../src/types/game-types'
import { getLegalMoves, isLegalMove } from '../../src/game/legal-moves'
import { evaluateSmall } from '../../src/game/engine'
import { checkSmallWin, checkBigWin } from '../../src/game/win-detection'
import { countCells, countOccupied, countEmpty, findChangedCells } from './logging'

/**
 * Invariant violation error with detailed context.
 */
export class InvariantViolation extends Error {
  constructor(
    public invariantName: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(`[${invariantName}] ${message}`)
    this.name = 'InvariantViolation'
  }
}

// ============================================================================
// TURN & PLAYER INVARIANTS
// ============================================================================

/**
 * Property 1: Player Count Consistency
 * After each move, X and O counts differ by at most 1, and counts match turn history.
 */
export function assertPlayerCountConsistency(state: GameState): void {
  const xCount = countCells(state, 'X')
  const oCount = countCells(state, 'O')
  const diff = Math.abs(xCount - oCount)
  
  if (diff > 1) {
    throw new InvariantViolation(
      'PlayerCountConsistency',
      `X count (${xCount}) and O count (${oCount}) differ by ${diff}, expected ≤ 1`,
      { xCount, oCount, diff, currentPlayer: state.currentPlayer }
    )
  }
  
  // If current player is X, O should have played the same number of times or one more
  if (state.currentPlayer === 'X' && oCount !== xCount) {
    throw new InvariantViolation(
      'PlayerCountConsistency',
      `Current player is X but O count (${oCount}) ≠ X count (${xCount})`,
      { xCount, oCount, currentPlayer: state.currentPlayer }
    )
  }
  
  // If current player is O, X should have played one more time
  if (state.currentPlayer === 'O' && xCount !== oCount + 1) {
    throw new InvariantViolation(
      'PlayerCountConsistency',
      `Current player is O but X count (${xCount}) ≠ O count (${oCount}) + 1`,
      { xCount, oCount, currentPlayer: state.currentPlayer }
    )
  }
}

/**
 * Property 2: Turn Monotonicity
 * currentPlayer alternates X ↔ O with every move.
 */
export function assertTurnMonotonicity(stateBefore: GameState, stateAfter: GameState): void {
  if (stateBefore.winner !== null) {
    // Game was already finished; currentPlayer may not change
    return
  }
  
  if (stateBefore.currentPlayer === stateAfter.currentPlayer) {
    throw new InvariantViolation(
      'TurnMonotonicity',
      `Current player did not toggle: was ${stateBefore.currentPlayer}, still ${stateAfter.currentPlayer}`,
      { before: stateBefore.currentPlayer, after: stateAfter.currentPlayer }
    )
  }
}

/**
 * Property 3: Game Status Consistency with Winner
 * If winner is set, the game state must reflect a terminal condition.
 */
export function assertGameStatusConsistency(state: GameState): void {
  if (state.winner === null) {
    // Game is ongoing; no checks needed for winner
    return
  }
  
  // Winner is set; verify it matches actual board state
  if (state.winner === 'X' || state.winner === 'O') {
    // Check if this player actually has 3 small boards in a row
    const bigWinner = checkBigWin(state.bigBoard)
    
    if (bigWinner !== state.winner) {
      throw new InvariantViolation(
        'GameStatusConsistency',
        `Winner is ${state.winner} but big board check returned ${bigWinner}`,
        { stateWinner: state.winner, computedWinner: bigWinner }
      )
    }
    
    // Legal moves should be empty when game is won
    const legalMoves = getLegalMoves(state)
    if (legalMoves.length > 0) {
      throw new InvariantViolation(
        'GameStatusConsistency',
        `Game winner is ${state.winner} but there are ${legalMoves.length} legal moves`,
        { winner: state.winner, legalMovesCount: legalMoves.length }
      )
    }
  }
}

// ============================================================================
// MOVE APPLICATION INVARIANTS
// ============================================================================

/**
 * Property 4: No Double-Occupancy
 * After each move, exactly one more cell is occupied.
 */
export function assertNoDoubleOccupancy(stateBefore: GameState, stateAfter: GameState): void {
  const changedCells = findChangedCells(stateBefore, stateAfter)
  
  if (changedCells.length !== 1) {
    throw new InvariantViolation(
      'NoDoubleOccupancy',
      `Expected exactly 1 cell change, got ${changedCells.length}`,
      { changedCells, countBefore: countOccupied(stateBefore), countAfter: countOccupied(stateAfter) }
    )
  }
  
  const change = changedCells[0]
  if (change.before !== null) {
    throw new InvariantViolation(
      'NoDoubleOccupancy',
      `Cell (board=${change.board}, cell=${change.cell}) was ${change.before}, now ${change.after} (expected was empty)`,
      { change }
    )
  }
}

/**
 * Property 5: Occupancy Decreases by 1
 * Empty cell count decreases by exactly 1 per move.
 */
export function assertOccupancyDecreasedByOne(stateBefore: GameState, stateAfter: GameState): void {
  const emptyBefore = countEmpty(stateBefore)
  const emptyAfter = countEmpty(stateAfter)
  
  if (emptyAfter !== emptyBefore - 1) {
    throw new InvariantViolation(
      'OccupancyDecreasedByOne',
      `Empty cells: before=${emptyBefore}, after=${emptyAfter} (expected ${emptyBefore - 1})`,
      { emptyBefore, emptyAfter, occupiedBefore: countOccupied(stateBefore), occupiedAfter: countOccupied(stateAfter) }
    )
  }
}

/**
 * Property 6: Cell Never Overwrites
 * No move overwrites an already-occupied cell.
 */
export function assertNoOccupiedCellOverwrite(stateBefore: GameState, stateAfter: GameState, move: Move): void {
  const cellBefore = stateBefore.bigBoard[move.board][move.cell]
  const cellAfter = stateAfter.bigBoard[move.board][move.cell]
  
  if (cellBefore !== null) {
    throw new InvariantViolation(
      'NoOccupiedCellOverwrite',
      `Cell (board=${move.board}, cell=${move.cell}) was ${cellBefore} before move, now ${cellAfter}`,
      { move, cellBefore, cellAfter, currentPlayer: stateBefore.currentPlayer }
    )
  }
  
  if (cellAfter !== stateBefore.currentPlayer) {
    throw new InvariantViolation(
      'NoOccupiedCellOverwrite',
      `Cell (board=${move.board}, cell=${move.cell}) is ${cellAfter}, expected ${stateBefore.currentPlayer}`,
      { move, cellAfter, expectedPlayer: stateBefore.currentPlayer }
    )
  }
}

// ============================================================================
// CONSTRAINT ROUTING INVARIANTS
// ============================================================================

/**
 * Property 7: Forced-Board Constraint Enforcement
 * If nextBoardIndex is set, all legal moves must be in that board (and it must be open).
 */
export function assertForcedBoardConstraintEnforcement(state: GameState): void {
  if (state.nextBoardIndex === null) {
    // No forced constraint; nothing to check
    return
  }
  
  const forcedBoard = state.nextBoardIndex
  const legalMoves = getLegalMoves(state)
  
  // Check if forced board is actually open
  const boardStatus = evaluateSmall(state.bigBoard[forcedBoard]).status
  
  if (boardStatus !== 'Open') {
    // If forced board is closed, constraint should have transitioned to FREE
    // This means getLegalMoves should allow moves in other boards
    if (legalMoves.length > 0) {
      const hasMovesOutsideForcedBoard = legalMoves.some(m => m.board !== forcedBoard)
      if (!hasMovesOutsideForcedBoard) {
        throw new InvariantViolation(
          'ForcedBoardConstraintEnforcement',
          `nextBoardIndex=${forcedBoard} but that board is ${boardStatus}; expected FREE constraint (moves in other boards)`,
          { forcedBoard, boardStatus, legalMovesCount: legalMoves.length }
        )
      }
    }
  } else {
    // Forced board is open; all legal moves MUST be in that board
    const movesOutsideForcedBoard = legalMoves.filter(m => m.board !== forcedBoard)
    
    if (movesOutsideForcedBoard.length > 0) {
      throw new InvariantViolation(
        'ForcedBoardConstraintEnforcement',
        `nextBoardIndex=${forcedBoard} (Open) but ${movesOutsideForcedBoard.length} legal moves are outside it`,
        { forcedBoard, boardStatus, movesOutside: movesOutsideForcedBoard, allLegalMoves: legalMoves }
      )
    }
  }
}

/**
 * Property 8: Free-Move Constraint Validity
 * If nextBoardIndex is null (free move), legal moves can be in any open board (never closed).
 */
export function assertFreeMoveConstraintValidity(state: GameState): void {
  if (state.nextBoardIndex !== null) {
    // Not a free move; skip
    return
  }
  
  const legalMoves = getLegalMoves(state)
  
  for (const move of legalMoves) {
    const boardStatus = evaluateSmall(state.bigBoard[move.board]).status
    
    if (boardStatus !== 'Open') {
      throw new InvariantViolation(
        'FreeMoveConstraintValidity',
        `Free move constraint but legal move targets closed board ${move.board} (status=${boardStatus})`,
        { move, boardStatus }
      )
    }
  }
}

/**
 * Property 9: Constraint Advance Logic
 * After a move, nextBoardIndex is set correctly based on the move's cell index.
 */
export function assertConstraintAdvanceLogic(stateBefore: GameState, stateAfter: GameState, move: Move): void {
  // The next board should be the cell index of the move, unless that board is closed
  const expectedNextBoard = move.cell
  const targetBoardStatus = evaluateSmall(stateAfter.bigBoard[expectedNextBoard]).status
  
  if (targetBoardStatus === 'Open') {
    // Board is open; constraint should be forced to that board
    if (stateAfter.nextBoardIndex !== expectedNextBoard) {
      throw new InvariantViolation(
        'ConstraintAdvanceLogic',
        `Move was (board=${move.board}, cell=${move.cell}); expected nextBoardIndex=${expectedNextBoard}, got ${stateAfter.nextBoardIndex}`,
        { move, expectedNextBoard, actualNextBoard: stateAfter.nextBoardIndex, targetBoardStatus }
      )
    }
  } else {
    // Board is closed; constraint should be FREE (null)
    if (stateAfter.nextBoardIndex !== null) {
      throw new InvariantViolation(
        'ConstraintAdvanceLogic',
        `Move was (board=${move.board}, cell=${move.cell}); board ${expectedNextBoard} is ${targetBoardStatus}, expected nextBoardIndex=null, got ${stateAfter.nextBoardIndex}`,
        { move, expectedNextBoard, actualNextBoard: stateAfter.nextBoardIndex, targetBoardStatus }
      )
    }
  }
}

/**
 * Property 10: No Illegal Moves Returned
 * Every move in getLegalMoves must pass isLegalMove.
 */
export function assertNoIllegalMovesReturned(state: GameState): void {
  const legalMoves = getLegalMoves(state)
  
  for (const move of legalMoves) {
    if (!isLegalMove(state, move)) {
      throw new InvariantViolation(
        'NoIllegalMovesReturned',
        `getLegalMoves returned (board=${move.board}, cell=${move.cell}) but isLegalMove says it's illegal`,
        { move, legalMovesCount: legalMoves.length }
      )
    }
    
    // Also check that the cell is actually empty
    const cell = state.bigBoard[move.board][move.cell]
    if (cell !== null) {
      throw new InvariantViolation(
        'NoIllegalMovesReturned',
        `getLegalMoves returned (board=${move.board}, cell=${move.cell}) but cell is occupied by ${cell}`,
        { move, cell }
      )
    }
  }
}

// ============================================================================
// BOARD CLOSURE INVARIANTS
// ============================================================================

/**
 * Property 11: Closed Boards Have Zero Legal Moves
 * If a small board is Won or Draw, no legal moves target it.
 */
export function assertClosedBoardsHaveZeroMoves(state: GameState): void {
  const legalMoves = getLegalMoves(state)
  
  for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
    const { status } = evaluateSmall(state.bigBoard[boardIdx])
    
    if (status !== 'Open') {
      // Board is closed; no legal moves should target it
      const movesInThisBoard = legalMoves.filter(m => m.board === boardIdx)
      
      if (movesInThisBoard.length > 0) {
        throw new InvariantViolation(
          'ClosedBoardsHaveZeroMoves',
          `Board ${boardIdx} is ${status} but has ${movesInThisBoard.length} legal moves`,
          { boardIdx, status, movesInBoard: movesInThisBoard }
        )
      }
    }
  }
}

/**
 * Property 12: Board Closure Consistency with Win/Draw
 * A board is Won only if there's a 3-in-a-row; Draw only if full with no winner.
 */
export function assertBoardClosureConsistency(state: GameState, boardIdx: number): void {
  const board = state.bigBoard[boardIdx]
  const { status, winner } = evaluateSmall(board)
  
  const computedWinner = checkSmallWin(board)
  const emptyCount = board.filter(c => c === null).length
  
  if (status === 'Won') {
    if (computedWinner === null) {
      throw new InvariantViolation(
        'BoardClosureConsistency',
        `Board ${boardIdx} marked as Won but checkSmallWin returned null`,
        { boardIdx, status, winner, computedWinner, board }
      )
    }
    
    if (winner !== computedWinner) {
      throw new InvariantViolation(
        'BoardClosureConsistency',
        `Board ${boardIdx} winner is ${winner} but checkSmallWin returned ${computedWinner}`,
        { boardIdx, status, winner, computedWinner }
      )
    }
  }
  
  if (status === 'Draw') {
    if (emptyCount > 0) {
      throw new InvariantViolation(
        'BoardClosureConsistency',
        `Board ${boardIdx} marked as Draw but has ${emptyCount} empty cells`,
        { boardIdx, status, emptyCount, board }
      )
    }
    
    if (computedWinner !== null) {
      throw new InvariantViolation(
        'BoardClosureConsistency',
        `Board ${boardIdx} marked as Draw but checkSmallWin found winner ${computedWinner}`,
        { boardIdx, status, computedWinner }
      )
    }
  }
  
  if (status === 'Open') {
    // Board is open; should have empty cells (unless it just got won this turn)
    if (computedWinner !== null) {
      // It has a winner but status is Open; this is invalid
      throw new InvariantViolation(
        'BoardClosureConsistency',
        `Board ${boardIdx} marked as Open but checkSmallWin found winner ${computedWinner}`,
        { boardIdx, status, computedWinner }
      )
    }
  }
}

// ============================================================================
// TERMINAL STATE INVARIANTS
// ============================================================================

/**
 * Property 13: Terminal Game Rejects Moves
 * If winner is set, getLegalMoves returns empty and applyMove should reject.
 */
export function assertTerminalGameRejectsMoves(state: GameState): void {
  if (state.winner === null) {
    // Game is not terminal; skip
    return
  }
  
  const legalMoves = getLegalMoves(state)
  
  if (legalMoves.length > 0) {
    throw new InvariantViolation(
      'TerminalGameRejectsMoves',
      `Game winner is ${state.winner} but getLegalMoves returned ${legalMoves.length} moves`,
      { winner: state.winner, legalMoves }
    )
  }
}

/**
 * Property 14: Move Sequence Terminates Correctly
 * If no legal moves and winner is null, all boards must be closed.
 */
export function assertMoveSequenceTerminatesCorrectly(state: GameState): void {
  const legalMoves = getLegalMoves(state)
  
  if (legalMoves.length === 0 && state.winner === null) {
    // No moves available and no winner; verify all boards are closed
    for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
      const { status } = evaluateSmall(state.bigBoard[boardIdx])
      
      if (status === 'Open') {
        throw new InvariantViolation(
          'MoveSequenceTerminatesCorrectly',
          `No legal moves and no winner, but board ${boardIdx} is Open`,
          { boardIdx, status, winner: state.winner }
        )
      }
    }
  }
}

// ============================================================================
// COMBINED ASSERTIONS
// ============================================================================

/**
 * Assert all invariants that apply AFTER a single move.
 * This is called after each move in the move sequence.
 */
export function assertAllPostMoveInvariants(
  stateBefore: GameState,
  stateAfter: GameState,
  move: Move
): void {
  // Turn & Player
  assertPlayerCountConsistency(stateAfter)
  assertTurnMonotonicity(stateBefore, stateAfter)
  assertGameStatusConsistency(stateAfter)
  
  // Move Application
  assertNoDoubleOccupancy(stateBefore, stateAfter)
  assertOccupancyDecreasedByOne(stateBefore, stateAfter)
  assertNoOccupiedCellOverwrite(stateBefore, stateAfter, move)
  
  // Constraint Routing
  assertForcedBoardConstraintEnforcement(stateAfter)
  assertFreeMoveConstraintValidity(stateAfter)
  assertConstraintAdvanceLogic(stateBefore, stateAfter, move)
  assertNoIllegalMovesReturned(stateAfter)
  
  // Board Closure
  assertClosedBoardsHaveZeroMoves(stateAfter)
  for (let i = 0; i < 9; i++) {
    assertBoardClosureConsistency(stateAfter, i)
  }
  
  // Terminal State
  assertTerminalGameRejectsMoves(stateAfter)
  assertMoveSequenceTerminatesCorrectly(stateAfter)
}
