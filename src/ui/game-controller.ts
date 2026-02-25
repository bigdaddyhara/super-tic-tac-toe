import { GameState } from '../types/game-types'
import { BoardIndex, CellIndex } from '../types/game-types'
import { applyMove } from '../game/engine'
import { getLegalMoves, isLegalMove } from '../game/legal-moves'
import { createNewGame } from '../game/state'
import { CanvasRenderer } from './canvas-renderer'
import { createRenderScheduler } from './render-loop'
import { isDraw, isGameOver } from './game-adapter'
import { CanvasInputController } from './input-controller'
import { processEvents } from './event-processor'
import { computeHighlightState } from './highlight-state'
import { loadUISettings, saveUISettings, UISettings } from './ui-settings'
import { HistoryManager } from './history-manager'
import { updateButtonStates } from './replay-controls'
import type { HUD } from './hud'
import type { EndgameOverlay } from './endgame-overlay'

export class GameController {
  private state: GameState
  private historyManager: HistoryManager
  private readonly renderer: CanvasRenderer
  private readonly scheduler: { scheduleRender: () => void }
  private readonly inputController: CanvasInputController
  private readonly boardRect: { x: number; y: number; size: number }
  private lastMove: { board: BoardIndex; cell: CellIndex } | null = null
  private lastMoveSetAtMs: number | null = null
  private hoverMove: { board: BoardIndex; cell: CellIndex } | null = null
  private uiSettings: UISettings
  private hud: HUD | null = null
  private endgameOverlay: EndgameOverlay | null = null
  private undoBtn: HTMLButtonElement | null = null
  private redoBtn: HTMLButtonElement | null = null
  private playerWins: { X: number; O: number } = { X: 0, O: 0 }

  constructor(canvas: HTMLCanvasElement | null) {
    if (!canvas) {
      throw new Error('GameController: expected a canvas element with id "game-canvas", but none was found.')
    }

    if (canvas.width === 0 || canvas.height === 0) {
      console.warn('GameController: canvas is 0x0 at initialization; rendering will occur once it has a size.')
    }

    const loadedHistory = HistoryManager.load()
    if (loadedHistory) {
      this.state = loadedHistory.getPresent()
      this.historyManager = loadedHistory
    } else {
      this.state = createNewGame()
      this.historyManager = new HistoryManager(this.state)
    }
    this.uiSettings = loadUISettings()

    this.boardRect = this.computeBoardRect(canvas)
    this.renderer = new CanvasRenderer({ canvas, boardRect: this.boardRect })
    this.scheduler = createRenderScheduler({
      renderer: {
        render: (payload: {
          state: GameState
          highlightState: ReturnType<typeof computeHighlightState>
          uiSettings: UISettings
        }) => {
          this.renderer.render(payload.state, payload.highlightState, payload.uiSettings)
        },
      },
      getPayload: () => {
        const hs = computeHighlightState(this.state, this.hoverMove, this.lastMove, this.lastMoveSetAtMs)
        return {
          state: this.state,
          highlightState: hs,
          uiSettings: this.uiSettings,
        }
      },
    })
    this.inputController = new CanvasInputController(canvas, this.boardRect, this)
    this.inputController.init()

    this.scheduler.scheduleRender()
    this.emitHistoryChanged()
  }

  getState(): GameState {
    return this.state
  }

  setState(newState: GameState): void {
    this.state = newState
    if (!isGameOver(newState) && !isDraw(newState)) {
      this.endgameOverlay?.hide()
    }
    this.hud?.update(newState)
    updateButtonStates(this.undoBtn, this.redoBtn, this.historyManager)
    this.scheduler.scheduleRender()
  }

  attachHUD(hud: HUD): void {
    this.hud = hud
    this.hud.update(this.state)
  }

  attachEndgameOverlay(endgameOverlay: EndgameOverlay): void {
    this.endgameOverlay = endgameOverlay
  }

  attachHistoryButtons(undoBtn: HTMLButtonElement | null, redoBtn: HTMLButtonElement | null): void {
    this.undoBtn = undoBtn
    this.redoBtn = redoBtn
    updateButtonStates(this.undoBtn, this.redoBtn, this.historyManager)
  }

  getLastMove(): { board: BoardIndex; cell: CellIndex } | null {
    return this.lastMove
  }

  setHoverMove(move: { board: BoardIndex; cell: CellIndex } | null): void {
    const nextHoverMove = move && isLegalMove(this.state, move) ? move : null
    const isSameMove =
      this.hoverMove?.board === nextHoverMove?.board && this.hoverMove?.cell === nextHoverMove?.cell
    if (isSameMove) return
    this.hoverMove = nextHoverMove
    this.scheduler.scheduleRender()
  }

  getHoverMove(): { board: BoardIndex; cell: CellIndex } | null {
    return this.hoverMove
  }

  getUISettings(): UISettings {
    return this.uiSettings
  }

  getMoveCount(): number {
    return this.historyManager.getState().past.length
  }

  getPlayerWins(): { X: number; O: number } {
    return { ...this.playerWins }
  }

  setUISettings(partial: Partial<UISettings>): void {
    this.uiSettings = {
      ...this.uiSettings,
      ...partial,
    }
    saveUISettings(this.uiSettings)
    this.hud?.update(this.state)
    this.scheduler.scheduleRender()
  }

  applyPlayerMove(move: { board: BoardIndex; cell: CellIndex }): void {
    if (isGameOver(this.state) || getLegalMoves(this.state).length === 0) {
      return
    }

    if (!isLegalMove(this.state, move)) {
      this.onIllegalMove(move)
      return
    }

    try {
      const { nextState, events } = applyMove(this.state, move)
      const markedEvent = events.find((event) => event.type === 'CellMarked')

      if (markedEvent && markedEvent.type === 'CellMarked') {
        this.lastMove = { board: markedEvent.board as BoardIndex, cell: markedEvent.cell as CellIndex }
        this.lastMoveSetAtMs = Date.now()
        this.scheduleLastMoveFadeRenders()
      }

      this.setState(nextState)
      this.historyManager.push(nextState)
      this.emitHistoryChanged()
      processEvents(events, nextState, {
        onSmallBoardWon: (board, winner) => {
          this.renderer.flashWonBoard(board as BoardIndex, winner)
          this.scheduler.scheduleRender()
          this.scheduleWinnerBoardFlashRenders()
        },
        onBigBoardWon: (winner, stateAfter) => {
          this.playerWins[winner] += 1
          this.hud?.update(stateAfter)
          this.endgameOverlay?.show(stateAfter)
        },
        onDraw: (stateAfter) => {
          this.hud?.update(stateAfter)
          this.endgameOverlay?.show(stateAfter)
        },
      })
    } catch {
      this.onIllegalMove(move)
    }
  }

  undo(): void {
    const prev = this.historyManager.undo()
    if (!prev) return

    this.setState(prev)
    this.lastMove = null
    this.lastMoveSetAtMs = null
    this.hoverMove = null
    this.emitHistoryChanged()
  }

  redo(): void {
    const next = this.historyManager.redo()
    if (!next) return

    this.setState(next)
    this.lastMove = null
    this.lastMoveSetAtMs = null
    this.hoverMove = null
    this.emitHistoryChanged()
  }

  resetGame(): void {
    const fresh = createNewGame()
    this.historyManager.reset(fresh)
    this.setState(fresh)
    this.lastMove = null
    this.lastMoveSetAtMs = null
    this.hoverMove = null
    this.endgameOverlay?.hide()
    this.emitHistoryChanged()
  }

  getHistoryManager(): HistoryManager {
    return this.historyManager
  }

  canUndo(): boolean {
    return this.historyManager.canUndo()
  }

  canRedo(): boolean {
    return this.historyManager.canRedo()
  }

  destroy(): void {
    this.inputController.destroy()
  }

  private onIllegalMove(move: { board: BoardIndex; cell: CellIndex }): void {
    this.renderer.flashIllegalMove(move)
    this.scheduler.scheduleRender()
    globalThis.setTimeout(() => {
      this.renderer.clearIllegalFlash()
      this.scheduler.scheduleRender()
    }, 300)
  }

  private emitHistoryChanged(): void {
    if (typeof window === 'undefined') return

    try {
      window.dispatchEvent(new Event('history:changed'))
    } catch {}
  }

  private scheduleLastMoveFadeRenders(): void {
    const delays = [120, 240, 360, 520, 760]
    for (const delay of delays) {
      globalThis.setTimeout(() => {
        this.scheduler.scheduleRender()
      }, delay)
    }
  }

  private scheduleWinnerBoardFlashRenders(): void {
    const delays = [90, 180, 270, 360]
    for (const delay of delays) {
      globalThis.setTimeout(() => {
        this.scheduler.scheduleRender()
      }, delay)
    }
  }

  private computeBoardRect(canvas: HTMLCanvasElement): { x: number; y: number; size: number } {
    const padding = 16
    const width = canvas.width
    const height = canvas.height
    const size = Math.max(0, Math.min(width, height) - padding * 2)

    return {
      x: (width - size) / 2,
      y: (height - size) / 2,
      size,
    }
  }
}