import { describe, it, expect } from 'vitest'
import { checkSmallWin, checkBigWin } from '../src/game/win-detection'

describe('win detection', () => {
  // --- Small board win lines ---
  const winLines = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // columns
    [0,4,8], [2,4,6]           // diagonals
  ];
  for (const line of winLines) {
    it(`detects small board win for X at line ${line}`, () => {
      const board = Array(9).fill(null);
      for (const idx of line) board[idx] = 'X';
      expect(checkSmallWin(board as any)).toBe('X');
    });
    it(`detects small board win for O at line ${line}`, () => {
      const board = Array(9).fill(null);
      for (const idx of line) board[idx] = 'O';
      expect(checkSmallWin(board as any)).toBe('O');
    });
  }

  it('detects small board draw (full, no winner)', () => {
    // No win, full board
    const board = ['X','O','X','X','O','O','O','X','X'];
    expect(checkSmallWin(board as any)).toBe(null);
  });

  // --- Big board win lines ---
  for (const line of winLines) {
    it(`detects big board win for X at meta line ${line}`, () => {
      const w = ['X','X','X', null, null, null, null, null, null];
      const n = [null,null,null,null,null,null,null,null,null];
      const big = Array(9).fill(n).map((b,i) => line.includes(i) ? w : n);
      expect(checkBigWin(big as any)).toBe('X');
    });
    it(`detects big board win for O at meta line ${line}`, () => {
      const w = ['O','O','O', null, null, null, null, null, null];
      const n = [null,null,null,null,null,null,null,null,null];
      const big = Array(9).fill(n).map((b,i) => line.includes(i) ? w : n);
      expect(checkBigWin(big as any)).toBe('O');
    });
  }

  it('detects big board draw (all boards closed, no winner)', () => {
    // All small boards are draws (no winner)
    const d = ['X','O','X','X','O','O','O','X','X'];
    const big = Array(9).fill(d);
    expect(checkBigWin(big as any)).toBe(null);
  });

  it('detects ongoing big board (not full, no winner)', () => {
    const w = ['X','X','X', null, null, null, null, null, null];
    const n = [null,null,null,null,null,null,null,null,null];
    const big = [w, n, n, n, n, n, n, n, n];
    expect(checkBigWin(big as any)).toBe(null);
  });
});
