import { BoardIndex, CellIndex } from '../types/game-types'

export function indexToRowCol(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / 3),
    col: index % 3,
  }
}

export function rowColToIndex(row: number, col: number): number {
  return row * 3 + col
}

export function pixelToBoardIndex(
  px: number,
  py: number,
  boardRect: { x: number; y: number; size: number },
): { boardIndex: BoardIndex; cellIndex: CellIndex } | null {
  if (
    px < boardRect.x ||
    py < boardRect.y ||
    px > boardRect.x + boardRect.size ||
    py > boardRect.y + boardRect.size
  ) {
    return null
  }

  const relX = px - boardRect.x
  const relY = py - boardRect.y
  const cellSize = boardRect.size / 9

  const globalCol = Math.max(0, Math.min(8, Math.floor(relX / cellSize)))
  const globalRow = Math.max(0, Math.min(8, Math.floor(relY / cellSize)))

  const boardCol = Math.max(0, Math.min(2, Math.floor(globalCol / 3)))
  const boardRow = Math.max(0, Math.min(2, Math.floor(globalRow / 3)))
  const cellCol = Math.max(0, Math.min(2, globalCol % 3))
  const cellRow = Math.max(0, Math.min(2, globalRow % 3))

  return {
    boardIndex: rowColToIndex(boardRow, boardCol) as BoardIndex,
    cellIndex: rowColToIndex(cellRow, cellCol) as CellIndex,
  }
}

export function cellToPixelRect(
  boardIndex: BoardIndex,
  cellIndex: CellIndex,
  boardRect: { x: number; y: number; size: number },
): { x: number; y: number; w: number; h: number } {
  const { row: boardRow, col: boardCol } = indexToRowCol(boardIndex)
  const { row: cellRow, col: cellCol } = indexToRowCol(cellIndex)

  const globalRow = boardRow * 3 + cellRow
  const globalCol = boardCol * 3 + cellCol
  const cellW = boardRect.size / 9
  const cellH = boardRect.size / 9

  return {
    x: boardRect.x + globalCol * cellW,
    y: boardRect.y + globalRow * cellH,
    w: cellW,
    h: cellH,
  }
}

export function smallBoardRect(
  boardIndex: BoardIndex,
  boardRect: { x: number; y: number; size: number },
): { x: number; y: number; w: number; h: number } {
  const { row, col } = indexToRowCol(boardIndex)
  const smallSize = boardRect.size / 3
  return {
    x: boardRect.x + col * smallSize,
    y: boardRect.y + row * smallSize,
    w: smallSize,
    h: smallSize,
  }
}

export function metaBoardRect(boardRect: { x: number; y: number; size: number }): { x: number; y: number; w: number; h: number } {
  return {
    x: boardRect.x,
    y: boardRect.y,
    w: boardRect.size,
    h: boardRect.size,
  }
}