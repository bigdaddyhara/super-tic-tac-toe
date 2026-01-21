// Utility to map client coordinates to grid indices for the 9x9 board
export function mapClientToGrid(clientX: number, clientY: number, rectLeft: number, rectTop: number, rectWidth: number, rectHeight: number, canvasWidth: number, canvasHeight: number, hudHeight: number, boardSize: number) {
  const scaleX = canvasWidth / rectWidth
  const scaleY = canvasHeight / rectHeight
  const x = (clientX - rectLeft) * scaleX
  const y = (clientY - rectTop) * scaleY

  if (x < 0 || x > boardSize || y < hudHeight || y > hudHeight + boardSize) return null

  const cellSize = boardSize / 9
  const relY = y - hudHeight
  const globalCol = Math.floor(x / cellSize)
  const globalRow = Math.floor(relY / cellSize)

  const bigRow = Math.floor(globalRow / 3)
  const bigCol = Math.floor(globalCol / 3)
  const smallRow = globalRow % 3
  const smallCol = globalCol % 3

  const boardIndex = bigRow * 3 + bigCol
  const cellIndex = smallRow * 3 + smallCol

  return { boardIndex, cellIndex, bigRow, bigCol, smallRow, smallCol }
}
