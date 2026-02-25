import { describe, it, expect } from 'vitest'
import { indexToRowCol, pixelToBoardIndex, rowColToIndex } from '../src/ui/coord-utils'

describe('coord-utils', () => {
  it('maps indexToRowCol for key values', () => {
    expect(indexToRowCol(0)).toEqual({ row: 0, col: 0 })
    expect(indexToRowCol(4)).toEqual({ row: 1, col: 1 })
    expect(indexToRowCol(8)).toEqual({ row: 2, col: 2 })
  })

  it('maps rowColToIndex for key values', () => {
    expect(rowColToIndex(0, 0)).toBe(0)
    expect(rowColToIndex(2, 2)).toBe(8)
  })

  it('roundtrips all 9 row/col combinations', () => {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const index = rowColToIndex(row, col)
        expect(indexToRowCol(index)).toEqual({ row, col })
      }
    }
  })

  it('returns null for points outside boardRect bounds', () => {
    const boardRect = { x: 50, y: 50, size: 300 }
    expect(pixelToBoardIndex(0, 0, boardRect)).toBeNull()
  })
})