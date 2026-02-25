import { evaluateSmall } from '../game/engine'
import { GameState } from '../types/game-types'
import { BoardIndex, CellIndex, Player } from '../types/game-types'
import { cellToPixelRect, smallBoardRect } from './coord-utils'
import { HighlightState } from './highlight-state'
import { UISettings } from './ui-settings'
import { TOKENS } from './visual-tokens'

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly boardRect: { x: number; y: number; size: number }
  private warnedZeroSize = false
  private illegalFlashMove: { board: BoardIndex; cell: CellIndex } | null = null
  private wonBoardFlash = new Map<BoardIndex, { winner: Player; untilMs: number }>()

  constructor({ canvas, boardRect }: { canvas: HTMLCanvasElement; boardRect: { x: number; y: number; size: number } }) {
    this.canvas = canvas
    this.boardRect = boardRect
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('CanvasRenderer: 2D rendering context is unavailable.')
    }
    this.ctx = context
  }

  render(state: GameState, highlightState: HighlightState, uiSettings: UISettings): void {
    const cssWidth = this.canvas.clientWidth || this.canvas.width
    const cssHeight = this.canvas.clientHeight || this.canvas.height

    if (cssWidth === 0 || cssHeight === 0) {
      if (!this.warnedZeroSize) {
        console.warn('CanvasRenderer: canvas width/height is 0; skipping render until canvas is sized.')
        this.warnedZeroSize = true
      }
      return
    }
    this.warnedZeroSize = false

    const dpr = Math.max(1, globalThis.devicePixelRatio || 1)
    const desiredWidth = Math.round(cssWidth * dpr)
    const desiredHeight = Math.round(cssHeight * dpr)

    if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
      this.canvas.width = desiredWidth
      this.canvas.height = desiredHeight
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { x, y, size } = this.boardRect

    this.ctx.fillStyle = TOKENS.colors.background
    this.ctx.fillRect(0, 0, cssWidth, cssHeight)

    this.drawBigGrid(x, y, size)

    for (const [board, flash] of this.wonBoardFlash.entries()) {
      if (flash.untilMs <= Date.now()) {
        this.wonBoardFlash.delete(board)
      }
    }

    for (let si = 0; si < 9; si += 1) {
      const boardIndex = si as BoardIndex
      const board = state.bigBoard[boardIndex]
      const boardBounds = smallBoardRect(boardIndex, this.boardRect)

      this.drawSmallGrid(boardBounds)

      for (let ci = 0; ci < 9; ci += 1) {
        const cellIndex = ci as CellIndex
        const cell = board[cellIndex]
        if (!cell) continue

        const rect = cellToPixelRect(boardIndex, cellIndex, this.boardRect)
        this.drawMark(cell, rect)
      }

      const smallEval = evaluateSmall(board)
      if (smallEval.status === 'Won') {
        this.ctx.fillStyle = TOKENS.colors.closedBoardOverlayWon
        this.ctx.fillRect(boardBounds.x, boardBounds.y, boardBounds.w, boardBounds.h)

        if (!smallEval.winner) {
          console.warn('CanvasRenderer: small board is Won but winner is null; skipping winner symbol.')
          continue
        }

        this.drawWonBoardSymbol(smallEval.winner, {
          x: boardBounds.x,
          y: boardBounds.y,
          size: boardBounds.w,
        })
      } else if (smallEval.status === 'Draw') {
        this.ctx.fillStyle = TOKENS.colors.closedBoardOverlayDraw
        this.ctx.fillRect(boardBounds.x, boardBounds.y, boardBounds.w, boardBounds.h)
      }

      const wonBoardFlash = this.wonBoardFlash.get(boardIndex)
      if (wonBoardFlash && wonBoardFlash.untilMs > Date.now()) {
        const remaining = Math.max(0, wonBoardFlash.untilMs - Date.now())
        const alpha = Math.min(0.55, remaining / 420)
        const flashColor = this.withAlpha(
          wonBoardFlash.winner === 'X' ? TOKENS.colors.markX : TOKENS.colors.markO,
          alpha,
        )
        this.drawBoardBorder(boardIndex, flashColor, 4)
      }
    }

    if (uiSettings.showLegalMoves) {
      for (const move of highlightState.legalMoves) {
        const rect = cellToPixelRect(move.board, move.cell, this.boardRect)
        this.drawCellOverlay(rect, TOKENS.colors.legalCellOverlay)
      }
    }

    if (highlightState.hoverMove) {
      const rect = cellToPixelRect(highlightState.hoverMove.board, highlightState.hoverMove.cell, this.boardRect)
      this.drawCellOverlay(rect, TOKENS.colors.hoverCellOverlay)
    }

    if (highlightState.isFreeMove && uiSettings.showForcedBoard) {
      const openBoards = new Set<BoardIndex>()
      for (const move of highlightState.legalMoves) {
        openBoards.add(move.board)
      }
      for (const boardIndex of openBoards) {
        this.drawBoardBorder(boardIndex, TOKENS.colors.freeMoveAllBoardsBorder, TOKENS.lineWidth.freeMoveAllBoardsBorder)
      }
    }

    const showLastMove = uiSettings.showLastMoveHighlight ?? true
    if (highlightState.lastMove && showLastMove) {
      const rect = cellToPixelRect(highlightState.lastMove.board, highlightState.lastMove.cell, this.boardRect)
      const fadeDurationMs = 900
      const age = highlightState.lastMoveAgeMs ?? 0
      const fade = Math.max(0, 1 - age / fadeDurationMs)
      const alpha = 0.18 + fade * 0.46
      this.drawCellHighlight(rect, `rgba(250,204,21,${alpha.toFixed(3)})`, TOKENS.lineWidth.bigGrid)
    }

    if (highlightState.forcedBoard !== null && !highlightState.isFreeMove && uiSettings.showForcedBoard) {
      const intensity = Math.max(0.1, Math.min(1, uiSettings.forcedBoardIntensity ?? 0.6))
      this.drawBoardBorder(
        highlightState.forcedBoard,
        this.withAlpha(TOKENS.colors.forcedBoardBorder, intensity),
        Math.max(1, TOKENS.lineWidth.forcedBoardBorder * intensity),
      )
    }

    if (this.illegalFlashMove) {
      const rect = cellToPixelRect(this.illegalFlashMove.board, this.illegalFlashMove.cell, this.boardRect)
      this.drawCellOverlay(rect, TOKENS.colors.illegalClickFlash)
      this.drawCellHighlight(rect, TOKENS.colors.illegalClickFlash, TOKENS.lineWidth.bigGrid)
    }

    if (state.winner !== null) {
      this.drawWinnerBoardsGlow(state)
    }
  }

  flashIllegalMove(move: { board: BoardIndex; cell: CellIndex }): void {
    this.illegalFlashMove = move
  }

  clearIllegalFlash(): void {
    this.illegalFlashMove = null
  }

  flashWonBoard(board: BoardIndex, winner: Player): void {
    this.wonBoardFlash.set(board, {
      winner,
      untilMs: Date.now() + 420,
    })
  }

  private drawBigGrid(x: number, y: number, size: number): void {
    const boardCell = size / 3
    this.ctx.strokeStyle = TOKENS.colors.bigGridLine
    this.ctx.lineWidth = TOKENS.lineWidth.bigGrid

    for (let i = 1; i < 3; i += 1) {
      this.ctx.beginPath()
      this.ctx.moveTo(x + boardCell * i, y)
      this.ctx.lineTo(x + boardCell * i, y + size)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.moveTo(x, y + boardCell * i)
      this.ctx.lineTo(x + size, y + boardCell * i)
      this.ctx.stroke()
    }
  }

  private drawSmallGrid(boardRect: { x: number; y: number; w: number; h: number }): void {
    const stepX = boardRect.w / 3
    const stepY = boardRect.h / 3

    this.ctx.strokeStyle = TOKENS.colors.smallGridLine
    this.ctx.lineWidth = TOKENS.lineWidth.smallGrid

    for (let i = 1; i < 3; i += 1) {
      this.ctx.beginPath()
      this.ctx.moveTo(boardRect.x + i * stepX, boardRect.y)
      this.ctx.lineTo(boardRect.x + i * stepX, boardRect.y + boardRect.h)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.moveTo(boardRect.x, boardRect.y + i * stepY)
      this.ctx.lineTo(boardRect.x + boardRect.w, boardRect.y + i * stepY)
      this.ctx.stroke()
    }
  }

  private drawMark(mark: Player, rect: { x: number; y: number; w: number; h: number }): void {
    const cellSize = Math.min(rect.w, rect.h)
    const padding = TOKENS.markPadding * cellSize

    this.ctx.lineWidth = TOKENS.lineWidth.mark

    if (mark === 'X') {
      this.ctx.strokeStyle = TOKENS.colors.markX
      this.ctx.beginPath()
      this.ctx.moveTo(rect.x + padding, rect.y + padding)
      this.ctx.lineTo(rect.x + rect.w - padding, rect.y + rect.h - padding)
      this.ctx.moveTo(rect.x + rect.w - padding, rect.y + padding)
      this.ctx.lineTo(rect.x + padding, rect.y + rect.h - padding)
      this.ctx.stroke()
      return
    }

    this.ctx.strokeStyle = TOKENS.colors.markO
    this.ctx.beginPath()
    this.ctx.arc(
      rect.x + rect.w / 2,
      rect.y + rect.h / 2,
      (cellSize / 2) * (1 - TOKENS.markPadding),
      0,
      Math.PI * 2,
    )
    this.ctx.stroke()
  }

  private drawWonBoardSymbol(winner: Player, boardRect: { x: number; y: number; size: number }): void {
    this.ctx.fillStyle = TOKENS.colors.wonBoardSymbol[winner]
    this.ctx.font = `${(boardRect.size / 3) * TOKENS.fontSize.wonBoardSymbol}px sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(winner, boardRect.x + boardRect.size / 2, boardRect.y + boardRect.size / 2)
  }

  private drawCellHighlight(rect: { x: number; y: number; w: number; h: number }, color: string, lineWidth: number): void {
    this.ctx.save()
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2)
    this.ctx.restore()
  }

  private drawCellOverlay(rect: { x: number; y: number; w: number; h: number }, color: string): void {
    this.ctx.save()
    this.ctx.fillStyle = color
    this.ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2)
    this.ctx.restore()
  }

  private drawBoardBorder(boardIndex: BoardIndex, color: string, lineWidth: number): void {
    const board = smallBoardRect(boardIndex, this.boardRect)
    this.ctx.save()
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeRect(
      board.x + lineWidth / 2,
      board.y + lineWidth / 2,
      board.w - lineWidth,
      board.h - lineWidth,
    )
    this.ctx.restore()
  }

  private drawWinnerBoardsGlow(state: GameState): void {
    const winner = state.winner
    if (!winner) return

    for (let boardIndex = 0; boardIndex < 9; boardIndex += 1) {
      const smallState = evaluateSmall(state.bigBoard[boardIndex])
      if (smallState.winner !== winner) continue

      const glow = this.withAlpha(winner === 'X' ? TOKENS.colors.markX : TOKENS.colors.markO, 0.6)
      this.drawBoardBorder(boardIndex as BoardIndex, glow, 4)
    }
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const raw = color.slice(1)
      const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
      const r = Number.parseInt(full.slice(0, 2), 16)
      const g = Number.parseInt(full.slice(2, 4), 16)
      const b = Number.parseInt(full.slice(4, 6), 16)
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
    }

    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `,${alpha.toFixed(3)})`)
    }

    return color
  }
}