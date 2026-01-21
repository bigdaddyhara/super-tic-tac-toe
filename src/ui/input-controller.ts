// Canvas-only input controller: tracks mouse movement over the game canvas and
// exposes the hovered small/cell index. No click-to-move behavior here (Part C).

export type SelectIntent = {
  boardIndex: number
  cellIndex: number
  bigRow: number
  bigCol: number
  smallRow: number
  smallCol: number
  canvasX: number
  canvasY: number
}

type HoverCallback = (hover: { smallIndex: number; cellIndex: number } | null) => void
type SelectCallback = (intent: SelectIntent) => void

export class CanvasInputController {
  private canvas: HTMLCanvasElement
  public hover: { smallIndex: number; cellIndex: number } | null = null
  private attached = false
  private onHoverCb: HoverCallback | null = null
  private onSelectCb: SelectCallback | null = null
  private hudHeight: number
  private boardSize: number

  constructor(canvas: HTMLCanvasElement, opts?: { hudHeight?: number; boardSize?: number }) {
    this.canvas = canvas
    this.hudHeight = opts?.hudHeight ?? 80
    this.boardSize = opts?.boardSize ?? 720
  }

  onHover(cb: HoverCallback) {
    this.onHoverCb = cb
  }

  onSelect(cb: SelectCallback) {
    this.onSelectCb = cb
  }

  attach() {
    if (this.attached) return
    this.attached = true
    this.canvas.addEventListener('mousemove', this.onMove)
    this.canvas.addEventListener('mouseleave', this.onLeave)
    this.canvas.addEventListener('click', this.onClick)
  }

  detach() {
    if (!this.attached) return
    this.attached = false
    this.canvas.removeEventListener('mousemove', this.onMove)
    this.canvas.removeEventListener('mouseleave', this.onLeave)
    this.canvas.removeEventListener('click', this.onClick)
  }

  private onLeave = () => {
    this.hover = null
    if (this.onHoverCb) this.onHoverCb(null)
  }

  private toCanvasSpace(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    return { x, y, rect }
  }

  private mapToGrid(x: number, y: number) {
    const { hudHeight, boardSize } = this
    const cellSize = boardSize / 9

    if (x < 0 || x > boardSize || y < hudHeight || y > hudHeight + boardSize) {
      return null
    }

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

  private onMove = (e: MouseEvent) => {
    const { x, y } = this.toCanvasSpace(e.clientX, e.clientY)
    const grid = this.mapToGrid(x, y)
    if (!grid) {
      this.hover = null
      if (this.onHoverCb) this.onHoverCb(null)
      return
    }

    // debug log
    console.log('[input] hover', grid)

    this.hover = { smallIndex: grid.boardIndex, cellIndex: grid.cellIndex }
    if (this.onHoverCb) this.onHoverCb(this.hover)
  }

  private onClick = (e: MouseEvent) => {
    const { x, y } = this.toCanvasSpace(e.clientX, e.clientY)
    const grid = this.mapToGrid(x, y)
    if (!grid) return

    console.log('[input] click', grid)

    // Emit candidate select intent (no engine mutation here)
    const intent: SelectIntent = {
      boardIndex: grid.boardIndex,
      cellIndex: grid.cellIndex,
      bigRow: grid.bigRow,
      bigCol: grid.bigCol,
      smallRow: grid.smallRow,
      smallCol: grid.smallCol,
      canvasX: x,
      canvasY: y,
    }

    if (this.onSelectCb) this.onSelectCb(intent)
  }
}
