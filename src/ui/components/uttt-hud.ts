import type { GameState } from '../../types/game-types'
import { getActiveForcedBoard, isDraw, isFreeMove, isGameOver } from '../game-adapter'

const hudStyles = `
  :host {
    display: block;
    color: var(--color-text, #e8f0fe);
    font-family: var(--font-family-base, Inter, sans-serif);
  }

  .hud {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.75rem;
    border: 1px solid transparent;
    background: transparent;
    transition: all 180ms ease;
    opacity: 0.45;
  }

  .player-card--active {
    opacity: 1;
  }

  .player-card--x.player-card--active {
    background: var(--color-x-bg, rgba(255,71,87,0.1));
    border-color: var(--color-x, #ff6b6b);
    box-shadow: 0 0 16px var(--color-x-glow, rgba(255,107,107,0.3));
  }

  .player-card--o.player-card--active {
    background: var(--color-o-bg, rgba(79,195,247,0.1));
    border-color: var(--color-o, #4fc3f7);
    box-shadow: 0 0 16px var(--color-o-glow, rgba(79,195,247,0.3));
  }

  .player-mark {
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
  }

  .player-card--x .player-mark {
    color: var(--color-x, #ff6b6b);
    background: rgba(255, 107, 107, 0.12);
  }

  .player-card--o .player-mark {
    color: var(--color-o, #4fc3f7);
    background: rgba(79, 195, 247, 0.12);
  }

  .player-label {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .player-name {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .player-card--x .player-name { color: var(--color-x, #ff6b6b); }
  .player-card--o .player-name { color: var(--color-o, #4fc3f7); }

  .player-status {
    font-size: 0.6875rem;
    color: var(--color-text-muted, #8ba4c4);
    font-weight: 400;
  }

  .vs-divider {
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--color-text-dim, #4a6280);
    padding: 0 0.125rem;
    flex-shrink: 0;
  }

  .constraint-badge {
    margin-left: 0.25rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border, #1e3154);
    background: var(--color-surface-muted, #111f35);
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--color-text-muted, #8ba4c4);
    white-space: nowrap;
  }

  .constraint-badge--forced {
    border-color: rgba(250, 204, 21, 0.5);
    color: #facc15;
    background: rgba(250, 204, 21, 0.08);
  }

  .game-over-badge {
    padding: 0.375rem 0.875rem;
    border-radius: 0.625rem;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .game-over-badge--win-x {
    color: var(--color-x, #ff6b6b);
    background: var(--color-x-bg, rgba(255,71,87,0.1));
    border: 1px solid var(--color-x, #ff6b6b);
    box-shadow: 0 0 12px var(--color-x-glow, rgba(255,107,107,0.3));
  }

  .game-over-badge--win-o {
    color: var(--color-o, #4fc3f7);
    background: var(--color-o-bg, rgba(79,195,247,0.1));
    border: 1px solid var(--color-o, #4fc3f7);
    box-shadow: 0 0 12px var(--color-o-glow, rgba(79,195,247,0.3));
  }

  .game-over-badge--draw {
    color: var(--color-text-muted, #8ba4c4);
    background: rgba(139, 164, 196, 0.08);
    border: 1px solid var(--color-border, #1e3154);
  }

  .score-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.375rem;
    min-width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0 0.25rem;
    vertical-align: middle;
  }

  .score-badge--x {
    background: rgba(255, 107, 107, 0.18);
    color: var(--color-x, #ff6b6b);
  }

  .score-badge--o {
    background: rgba(79, 195, 247, 0.18);
    color: var(--color-o, #4fc3f7);
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
  private aiMode: { enabled: boolean; aiPlayer: 'X' | 'O' } = { enabled: false, aiPlayer: 'O' }
  private score: { X: number; O: number } = { X: 0, O: 0 }

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

  setAIMode(enabled: boolean, aiPlayer: 'X' | 'O'): void {
    this.aiMode = { enabled, aiPlayer }
    this.render()
  }

  setScore(score: { X: number; O: number }): void {
    this.score = { ...score }
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot) return

    const state = this.state
    const currentPlayer = state?.currentPlayer ?? 'X'
    const gameOver = state ? isGameOver(state) : false
    const draw = state ? isDraw(state) : false

    // Resolve display names based on AI mode
    const aiEnabled = this.aiMode.enabled
    const aiPlayer = this.aiMode.aiPlayer
    const xName = aiEnabled ? (aiPlayer === 'X' ? 'AI' : 'You') : 'Player X'
    const oName = aiEnabled ? (aiPlayer === 'O' ? 'AI' : 'You') : 'Player O'

    let constraintHTML = ''
    let gameOverBadge = ''

    if (gameOver && state) {
      const winnerClass = state.winner === 'X' ? 'game-over-badge--win-x' : 'game-over-badge--win-o'
      const winnerName = state.winner === 'X' ? xName : oName
      gameOverBadge = `<span class="game-over-badge ${winnerClass}" aria-live="polite">${winnerName} Wins!</span>`
    } else if (draw) {
      gameOverBadge = `<span class="game-over-badge game-over-badge--draw" aria-live="polite">Draw</span>`
    } else if (state && !isFreeMove(state)) {
      const forced = getActiveForcedBoard(state)
      if (forced !== null) {
        const { row, col } = boardIndexToRowCol(forced)
        constraintHTML = `<span class="constraint-badge constraint-badge--forced" aria-live="polite" aria-label="Forced board">Board (${row},${col})</span>`
      }
    } else if (state) {
      constraintHTML = `<span class="constraint-badge" aria-live="polite" aria-label="Free move">Free move</span>`
    }

    const xActive = !gameOver && !draw && currentPlayer === 'X'
    const oActive = !gameOver && !draw && currentPlayer === 'O'

    const xThinking = aiEnabled && aiPlayer === 'X' && xActive
    const oThinking = aiEnabled && aiPlayer === 'O' && oActive

    const xStatus = gameOver && state?.winner === 'X' ? 'Winner!' : xThinking ? 'Thinking…' : xActive ? 'Your turn' : ''
    const oStatus = gameOver && state?.winner === 'O' ? 'Winner!' : oThinking ? 'Thinking…' : oActive ? 'Your turn' : ''

    const xScoreBadge = this.score.X > 0
      ? `<span class="score-badge score-badge--x">${this.score.X}</span>`
      : ''
    const oScoreBadge = this.score.O > 0
      ? `<span class="score-badge score-badge--o">${this.score.O}</span>`
      : ''

    this.shadowRoot.innerHTML = `
      <style>${hudStyles}</style>
      <div class="hud" aria-label="Game HUD">
        <div class="player-card player-card--x ${xActive ? 'player-card--active' : ''}" aria-label="${xName}${xActive ? ' (current)' : ''}">
          <div class="player-mark">✕</div>
          <div class="player-label">
            <span class="player-name">${xName}${xScoreBadge}</span>
            ${xStatus ? `<span class="player-status">${xStatus}</span>` : ''}
          </div>
        </div>

        <span class="vs-divider">VS</span>

        <div class="player-card player-card--o ${oActive ? 'player-card--active' : ''}" aria-label="${oName}${oActive ? ' (current)' : ''}">
          <div class="player-mark">○</div>
          <div class="player-label">
            <span class="player-name">${oName}${oScoreBadge}</span>
            ${oStatus ? `<span class="player-status">${oStatus}</span>` : ''}
          </div>
        </div>

        ${gameOverBadge || constraintHTML}
      </div>
    `
  }
}

export function registerUTTTHud(): void {
  if (!customElements.get('uttt-hud')) {
    customElements.define('uttt-hud', UTTTHudElement)
  }
}
