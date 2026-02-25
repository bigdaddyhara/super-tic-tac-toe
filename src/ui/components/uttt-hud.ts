import type { GameState } from '../../types/game-types'
import { getActiveForcedBoard, isDraw, isFreeMove, isGameOver } from '../game-adapter'

const hudStyles = `
  :host {
    display: block;
    color: var(--color-text, #e2e8f0);
    font-family: var(--font-family-base, Inter, sans-serif);
  }

  .hud {
    display: grid;
    gap: 0.5rem;
  }

  .hud__title {
    margin: 0;
    font-size: var(--font-size-lg, 1.125rem);
    font-weight: 600;
  }

  .hud__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    border: 1px solid var(--color-border, #32415f);
    border-radius: var(--radius-1, 0.5rem);
    background: var(--color-surface-muted, #17233b);
    padding: 0.375rem 0.625rem;
    font-size: var(--font-size-sm, 0.8125rem);
  }

  .chip--x {
    color: var(--color-danger, #f87171);
  }

  .chip--o {
    color: var(--color-accent, #60a5fa);
  }
`

function boardIndexToRowCol(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / 3),
    col: index % 3,
  }
}

export class UTTTHudElement extends HTMLElement {
  private state: GameState | null = null

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }

    this.render()
  }

  setState(state: GameState): void {
    this.state = state
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot) return

    const state = this.state

    let gameStatus = 'Ongoing'
    let turnLabel = 'Current player: X'
    let constraintLabel = 'Free move'

    if (state) {
      if (isGameOver(state)) {
        gameStatus = `Winner: ${state.winner}`
      } else if (isDraw(state)) {
        gameStatus = 'Draw'
      }

      turnLabel = `Current player: ${state.currentPlayer}`

      if (isFreeMove(state)) {
        constraintLabel = 'Free move'
      } else {
        const forced = getActiveForcedBoard(state)
        if (forced !== null) {
          const { row, col } = boardIndexToRowCol(forced)
          constraintLabel = `Forced board: (${row},${col}) / ${forced}`
        } else {
          constraintLabel = 'Free move'
        }
      }
    }

    const playerChipClass = state?.currentPlayer === 'O' ? 'chip chip--o' : 'chip chip--x'

    this.shadowRoot.innerHTML = `
      <style>${hudStyles}</style>
      <section class="hud" aria-label="Game HUD">
        <h2 class="hud__title">Game HUD</h2>
        <div class="hud__chips">
          <div class="chip" aria-live="polite" aria-label="Game status">${gameStatus}</div>
          <div class="${playerChipClass}" aria-live="polite" aria-label="Current player">${turnLabel}</div>
          <div class="chip" aria-live="polite" aria-label="Constraint indicator">${constraintLabel}</div>
        </div>
      </section>
    `
  }
}

export function registerUTTTHud(): void {
  if (!customElements.get('uttt-hud')) {
    customElements.define('uttt-hud', UTTTHudElement)
  }
}
