import { GameState } from '../types/game-types'
import { isValidMove } from '../game/rules'
import { applyMove } from '../game/state'
import { DOMRenderer } from './renderer'

export class InputController {
  private state: GameState
  private renderer: DOMRenderer

  constructor(state: GameState, renderer: DOMRenderer) {
    this.state = state
    this.renderer = renderer
  }

  attach() {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target) return
      if (target.classList.contains('cell')) {
        const small = Number(target.dataset.small)
        const cell = Number(target.dataset.cell)
        if (isValidMove(this.state, small, cell)) {
          this.state = applyMove(this.state, small, cell)
          this.renderer.update(this.state)
        }
      }
    })
  }
}
