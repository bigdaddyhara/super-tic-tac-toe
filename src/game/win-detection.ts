/**
 * Win detection utilities for Ultimate Tic-Tac-Toe.
 *
 * Responsibilities:
 * - Detect 3-in-a-row wins in a 3x3 board (small or meta grid)
 * - Used by engine to determine win status for both small and big boards
 * - All functions are pure and deterministic
 */
/**
 * @function checkSmallWin
 * @description Evaluates a small board for a win (3-in-a-row) by X or O.
 * @param {SmallBoard} board - Array of 9 cells ('X', 'O', or null)
 * @returns {Player | null} - 'X' or 'O' if that player has 3-in-a-row, null otherwise
 * @example
 *   checkSmallWin(['X','X','X',null,null,null,null,null,null]) // 'X'
 */
/**
 * @function checkBigWin
 * @description Evaluates the big board for a win (3 small boards in a row) by X or O.
 * @param {BigBoard} big - Array of 9 SmallBoards
 * @returns {Player | null} - 'X' or 'O' if that player has won 3 small boards in a row, null otherwise
 * @example
 *   checkBigWin([['X','X','X',...], ...]) // 'X'
 */
import { Player, SmallBoard, BigBoard } from '../types/game-types'

// All possible win lines in a 3x3 grid (rows, columns, diagonals)
const LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // columns
  [0,4,8],[2,4,6]          // diagonals
]

/**
 * Evaluates a small board for a win (3-in-a-row) by X or O.
 * @param board SmallBoard (length 9)
 * @returns Player ('X' or 'O') if won, or null if not
 * Why: Used to determine if a small board is won after a move.
 *   - board: array of 9 cells ('X', 'O', or null)
 *   - returns: 'X' or 'O' if that player has 3-in-a-row, null otherwise
 */
export function checkSmallWin(board: SmallBoard): Player | null {
  for (const [a,b,c] of LINES) {
    const v = board[a]
    if (v && v === board[b] && v === board[c]) return v
  }
  return null
}

/**
 * Evaluates the big board for a win (3 small boards in a row) by X or O.
 * @param big BigBoard (array of 9 SmallBoards)
 * @returns Player ('X' or 'O') if won, or null if not
 * Why: Used to determine if the overall game is won after a move.
 *   - big: array of 9 small boards (each length 9)
 *   - returns: 'X' or 'O' if that player has won 3 small boards in a row, null otherwise
 */
export function checkBigWin(big: BigBoard): Player | null {
  // map each small board to its winner (or null)
  const winners = big.map(b => checkSmallWin(b))
  for (const [a,b,c] of LINES) {
    const v = winners[a]
    if (v && v === winners[b] && v === winners[c]) return v
  }
  return null
}

/**
 * Find two-in-a-row opportunities for a given player on a small 3x3 board.
 * Returns an array of objects describing the two occupied cells and the target empty cell.
 * Example: [{ cells: [0,1], target: 2 }, ...]
 */
export function findTwoInRow(board: SmallBoard, player: Player): { cells: [number, number]; target: number }[] {
  const out: { cells: [number, number]; target: number }[] = []
  for (const [a, b, c] of LINES) {
    // a & b filled, c empty
    if (board[a] === player && board[b] === player && board[c] === null) out.push({ cells: [a, b], target: c })
    // a & c filled, b empty
    if (board[a] === player && board[c] === player && board[b] === null) out.push({ cells: [a, c], target: b })
    // b & c filled, a empty
    if (board[b] === player && board[c] === player && board[a] === null) out.push({ cells: [b, c], target: a })
  }
  return out
}

/**
 * (Responsibility) These functions are the single source of truth for win detection.
 * They should be used by engine and test code to ensure consistency.
 */
