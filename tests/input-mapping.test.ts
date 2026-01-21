import { describe, test, expect } from 'vitest'
import { mapClientToGrid } from '../src/ui/input-mapping'

describe('input mapping', () => {
  const canvasWidth = 720
  const canvasHeight = 800
  const rectLeft = 0
  const rectTop = 0
  const rectWidth = 720
  const rectHeight = 800
  const hudHeight = 80
  const boardSize = 720

  test('maps center of top-left small board first cell to indices 0,0', () => {
    // top-left small board cell (bigRow=0,bigCol=0), inner cell at (0,0)
    const cellSize = boardSize / 9
    const x = cellSize * 0.5
    const y = hudHeight + cellSize * 0.5
    const res = mapClientToGrid(x, y, rectLeft, rectTop, rectWidth, rectHeight, canvasWidth, canvasHeight, hudHeight, boardSize)
    expect(res).not.toBeNull()
    expect(res!.boardIndex).toBe(0)
    expect(res!.cellIndex).toBe(0)
  })

  test('maps center of middle small board center cell correctly', () => {
    // small board 4, center cell (cell index 4)
    const cellSize = boardSize / 9
    const bigCol = 1
    const bigRow = 1
    const innerCol = 1
    const innerRow = 1
    const x = (bigCol * 3 + innerCol) * cellSize + cellSize * 0.5
    const y = hudHeight + (bigRow * 3 + innerRow) * cellSize + cellSize * 0.5
    const res = mapClientToGrid(x, y, rectLeft, rectTop, rectWidth, rectHeight, canvasWidth, canvasHeight, hudHeight, boardSize)
    expect(res).not.toBeNull()
    expect(res!.boardIndex).toBe(4)
    expect(res!.cellIndex).toBe(4)
  })

  test('maps correctly when canvas rect is offset and scaled', () => {
    const canvasWidth = 720
    const canvasHeight = 800
    const rectLeft = 10
    const rectTop = 20
    const rectWidth = 360 // scaled DOM rect (half width)
    const rectHeight = 400
    const hudHeight = 80
    const boardSize = 720
    // choose a point that corresponds to top-left small board center in client coords
    const cellSize = boardSize / 9
    // client coords must map to the same logical board position after scaling
    // compute target canvas-space x,y then invert scale to client
    const cx = cellSize * 0.5
    const cy = hudHeight + cellSize * 0.5
    const scaleX = rectWidth / canvasWidth
    const scaleY = rectHeight / canvasHeight
    const clientX = rectLeft + cx * scaleX
    const clientY = rectTop + cy * scaleY

    const res = mapClientToGrid(clientX, clientY, rectLeft, rectTop, rectWidth, rectHeight, canvasWidth, canvasHeight, hudHeight, boardSize)
    expect(res).not.toBeNull()
    expect(res!.boardIndex).toBe(0)
    expect(res!.cellIndex).toBe(0)
  })
})
