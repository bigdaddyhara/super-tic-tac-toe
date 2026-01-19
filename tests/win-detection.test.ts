import { describe, it, expect } from 'vitest'
import { checkSmallWin, checkBigWin } from '../src/game/win-detection'

describe('win detection', () => {
  it('detects small board horizontal win', () => {
    const board = ['X','X','X', null, null, null, null, null, null]
    expect(checkSmallWin(board as any)).toBe('X')
  })

  it('detects big board win from small-wins', () => {
    const w = ['X','X','X', null, null, null, null, null, null]
    const n = [null,null,null,null,null,null,null,null,null]
    const big = [w, w, w, n, n, n, n, n, n]
    expect(checkBigWin(big as any)).toBe('X')
  })
})
