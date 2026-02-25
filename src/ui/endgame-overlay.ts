import { GameState } from '../types/game-types'
import { isDraw } from './game-adapter'

export class EndgameOverlay {
  constructor(
    private readonly overlayEl: HTMLElement,
    private readonly messageEl: HTMLElement,
  ) {}

  show(state: GameState): void {
    this.messageEl.classList.remove('winner-x', 'winner-o')

    if (state.winner === 'X') {
      this.messageEl.textContent = '🎉 X Wins!'
      this.messageEl.classList.add('winner-x')
    } else if (state.winner === 'O') {
      this.messageEl.textContent = '🎉 O Wins!'
      this.messageEl.classList.add('winner-o')
    } else if (isDraw(state)) {
      this.messageEl.textContent = "It's a Draw!"
    } else {
      return
    }

    this.overlayEl.hidden = false
    this.overlayEl.classList.remove('overlay-enter')
    void this.overlayEl.offsetWidth
    this.overlayEl.classList.add('overlay-enter')
  }

  hide(): void {
    this.overlayEl.hidden = true
    this.overlayEl.classList.remove('overlay-enter')
    this.messageEl.classList.remove('winner-x', 'winner-o')
  }
}
