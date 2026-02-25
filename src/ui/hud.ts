import { GameState } from '../types/game-types'
import { getActiveForcedBoard, isDraw, isFreeMove, isGameOver } from './game-adapter'
import type { GameController } from './game-controller'
import { updateButtonStates } from './replay-controls'

export class HUD {
  private readonly playerIndicator: HTMLElement | null
  private readonly turnCounter: HTMLElement | null
  private readonly constraintIndicator: HTMLElement | null
  private readonly scoreEl: HTMLElement | null
  private readonly undoBtn: HTMLButtonElement | null
  private readonly redoBtn: HTMLButtonElement | null

  constructor(
    private readonly controller: GameController,
    root: Document | ShadowRoot = document,
  ) {
    this.playerIndicator = root.getElementById('player-indicator')
    this.turnCounter = root.getElementById('turn-counter')
    this.constraintIndicator = root.getElementById('constraint-indicator')
    this.scoreEl = root.getElementById('score')
    this.undoBtn = root.getElementById('undo-btn') as HTMLButtonElement | null
    this.redoBtn = root.getElementById('redo-btn') as HTMLButtonElement | null
  }

  update(state: GameState): void {
    const gameOver = isGameOver(state) || isDraw(state)

    if (this.playerIndicator) {
      this.playerIndicator.classList.remove('player-x', 'player-o')

      if (gameOver) {
        this.playerIndicator.textContent = state.winner ?? 'Draw'
        if (state.winner === 'X') this.playerIndicator.classList.add('player-x')
        if (state.winner === 'O') this.playerIndicator.classList.add('player-o')
      } else {
        this.playerIndicator.textContent = `${state.currentPlayer} to play`
        this.playerIndicator.classList.add(state.currentPlayer === 'X' ? 'player-x' : 'player-o')
      }
    }

    if (this.turnCounter) {
      this.turnCounter.textContent = `Move: ${this.controller.getMoveCount()}`
    }

    if (this.constraintIndicator) {
      if (gameOver) {
        this.constraintIndicator.textContent = ''
      } else if (isFreeMove(state)) {
        this.constraintIndicator.textContent = 'Free Move'
      } else {
        const forced = getActiveForcedBoard(state)
        this.constraintIndicator.textContent = forced === null ? 'Free Move' : `Forced: Board ${forced + 1}`
      }
    }

    if (this.scoreEl) {
      const wins = this.controller.getPlayerWins()
      this.scoreEl.textContent = `X: ${wins.X} | O: ${wins.O}`
    }

    updateButtonStates(this.undoBtn, this.redoBtn, this.controller.getHistoryManager())
  }
}
