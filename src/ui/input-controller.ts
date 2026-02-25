import { BoardIndex, CellIndex } from '../types/game-types'
import { pixelToBoardIndex } from './coord-utils'

type InputMove = { board: BoardIndex; cell: CellIndex }

interface PlayerMoveController {
  applyPlayerMove(move: InputMove): void
  setHoverMove(move: InputMove | null): void
}

export class CanvasInputController {
  private readonly canvas: HTMLCanvasElement
  private readonly boardRect: { x: number; y: number; size: number }
  private readonly controller: PlayerMoveController
  private attached = false

  constructor(
    canvas: HTMLCanvasElement,
    boardRect: { x: number; y: number; size: number },
    controller: PlayerMoveController,
  ) {
    this.canvas = canvas
    this.boardRect = boardRect
    this.controller = controller
  }

  init(): void {
    if (this.attached) return
    this.attached = true
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave)
  }

  destroy(): void {
    if (!this.attached) return
    this.attached = false
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
  }

  handlePointerDown = (e: PointerEvent): void => {
    const mapped = this.mapPointerEvent(e)
    if (!mapped) return

    this.controller.applyPlayerMove({ board: mapped.boardIndex, cell: mapped.cellIndex })
  }

  handlePointerMove = (e: PointerEvent): void => {
    const mapped = this.mapPointerEvent(e)
    if (!mapped) {
      this.controller.setHoverMove(null)
      return
    }

    this.controller.setHoverMove({ board: mapped.boardIndex, cell: mapped.cellIndex })
  }

  handlePointerLeave = (): void => {
    this.controller.setHoverMove(null)
  }

  private mapPointerEvent(e: PointerEvent): { boardIndex: BoardIndex; cellIndex: CellIndex } | null {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const scaledX = (e.clientX - rect.left) * (this.canvas.width / rect.width)
    const scaledY = (e.clientY - rect.top) * (this.canvas.height / rect.height)

    const logicalX = scaledX / (this.canvas.width / rect.width)
    const logicalY = scaledY / (this.canvas.height / rect.height)

    return pixelToBoardIndex(logicalX, logicalY, this.boardRect)
  }
}
