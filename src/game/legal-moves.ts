import { GameState, BoardIndex, CellIndex, Player } from '../types/game-types'
import { evaluateSmall } from './engine'

/**
 * Returns a list of all legal moves for the current player in the given state.
 * Each move is represented as { board: BoardIndex, cell: CellIndex }.
 */
export function getLegalMoves(state: GameState): { board: BoardIndex, cell: CellIndex }[] {
  if (state.winner) return []
  // Helper to check if a board is open
  function isOpenBoard(board: BoardIndex) {
    const small = state.bigBoard[board]
    return evaluateSmall(small).status === 'Open'
  }

  // Determine which boards are available for play
  let allowedBoards: BoardIndex[]
  if (state.nextBoardIndex !== null) {
    // If forced board is open, only that board is allowed
    if (isOpenBoard(state.nextBoardIndex)) {
      allowedBoards = [state.nextBoardIndex]
    } else {
      // Forced board is closed (won or full): free move
      allowedBoards = []
      for (let i = 0; i < 9; ++i) {
        if (isOpenBoard(i)) allowedBoards.push(i)
      }
    }
  } else {
    // No constraint: any open board
    allowedBoards = []
    for (let i = 0; i < 9; ++i) {
      if (isOpenBoard(i)) allowedBoards.push(i)
    }
  }

  // For each allowed board, collect all empty cells
  const moves: { board: BoardIndex, cell: CellIndex }[] = []
  for (const b of allowedBoards) {
    const small = state.bigBoard[b]
    for (let c = 0; c < 9; ++c) {
      if (small[c] === null) {
        moves.push({ board: b, cell: c })
      }
    }
  }
  return moves
}

/**
 * Returns true if the given move is legal in the given state.
 * Move is { board: BoardIndex, cell: CellIndex }.
 */
export function isLegalMove(state: GameState, move: { board: BoardIndex, cell: CellIndex }): boolean {
  // Use getLegalMoves for single source of truth
  const moves = getLegalMoves(state)
  return moves.some(m => m.board === move.board && m.cell === move.cell)
}

/**
 * Returns the next forced board index (0-8) or null if the next move is free-choice.
 * Optionally, can return a richer object if needed for UI/AI.
 */
export function getNextConstraint(state: GameState, lastMove: { board: BoardIndex, cell: CellIndex }): BoardIndex | null {
  // After a move, the next forced board is the cell index of the move, if that board is open
  const nextBoard = lastMove.cell
  const small = state.bigBoard[nextBoard]
  const status = evaluateSmall(small).status
  if (status === 'Open') return nextBoard
  return null // free move
}
