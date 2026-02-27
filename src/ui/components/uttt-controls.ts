import type { GameState } from '../../types/game-types'

const controlsStyles = `
  :host {
    display: block;
    color: var(--color-text, #e8f0fe);
    font-family: var(--font-family-base, Inter, sans-serif);
  }

  .controls {
    display: grid;
    gap: 0.875rem;
  }

  .controls__label {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-dim, #4a6280);
    margin: 0 0 0.125rem;
  }

  .controls__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .controls__row--single {
    grid-template-columns: 1fr;
  }

  .controls__row--history {
    grid-template-columns: 1fr 1fr;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    border: 1px solid var(--color-border, #1e3154);
    border-radius: 0.625rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface-muted, #111f35);
    color: var(--color-text, #e8f0fe);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
  }

  .button:hover {
    background: var(--color-accent-strong, #3b82f6);
    border-color: var(--color-accent-strong, #3b82f6);
    box-shadow: 0 0 12px rgba(59,130,246,0.35);
  }

  .button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
  }

  .button:active {
    transform: scale(0.97);
  }

  .button--new-game {
    background: var(--color-accent-strong, #3b82f6);
    border-color: var(--color-accent-strong, #3b82f6);
    color: #fff;
    font-weight: 600;
  }

  .button--new-game:hover {
    background: var(--color-accent, #60a5fa);
    border-color: var(--color-accent, #60a5fa);
  }

  .toggle[aria-pressed='true'] {
    background: rgba(79,195,247,0.15);
    border-color: var(--color-o, #4fc3f7);
    color: var(--color-o, #4fc3f7);
    box-shadow: 0 0 10px rgba(79,195,247,0.2);
  }

  .turn-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.625rem;
    border: 1px solid var(--color-border, #1e3154);
    background: var(--color-surface-muted, #111f35);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-text-muted, #8ba4c4);
  }

  .turn-display__mark {
    font-size: 1rem;
    font-weight: 800;
  }

  .turn-display__mark--x { color: var(--color-x, #ff6b6b); }
  .turn-display__mark--o { color: var(--color-o, #4fc3f7); }
`

interface ToggleAnalysisDetail {
  enabled: boolean
}

export class UTTTControlsElement extends HTMLElement {
  private state: GameState | null = null
  private canUndo = false
  private canRedo = false
  private analysisEnabled = false
  private analysisAvailable = false

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }

    this.render()
    this.bindEvents()
  }

  setState(state: GameState): void {
    this.state = state
    this.render()
  }

  setHistoryAvailability(canUndo: boolean, canRedo: boolean): void {
    this.canUndo = canUndo
    this.canRedo = canRedo
    this.render()
  }

  setAnalysisAvailable(available: boolean): void {
    this.analysisAvailable = available
    if (!available) {
      this.analysisEnabled = false
    }
    this.render()
  }

  setAnalysisEnabled(enabled: boolean): void {
    this.analysisEnabled = enabled
    this.render()
  }

  private emit(name: string, detail?: ToggleAnalysisDetail): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
      }),
    )
  }

  private bindEvents(): void {
    if (!this.shadowRoot) return

    this.shadowRoot.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const button = target.closest('button[data-action]') as HTMLButtonElement | null
      if (!button) return

      const action = button.dataset.action
      if (!action) return

      if (action === 'new-game') {
        this.emit('uttt:new-game')
        return
      }

      if (action === 'reset') {
        this.emit('uttt:reset')
        return
      }

      if (action === 'undo') {
        this.emit('uttt:undo')
        return
      }

      if (action === 'redo') {
        this.emit('uttt:redo')
        return
      }

      if (action === 'toggle-analysis') {
        if (!this.analysisAvailable) return
        this.analysisEnabled = !this.analysisEnabled
        this.emit('uttt:toggle-analysis', { enabled: this.analysisEnabled })
        this.render()
      }
    })
  }

  private render(): void {
    if (!this.shadowRoot) return

    const currentPlayer = this.state?.currentPlayer ?? 'X'
    const undoTitle = this.canUndo ? 'Undo last move (Cmd/Ctrl+Z)' : 'Undo unavailable: no moves to undo'
    const redoTitle = this.canRedo ? 'Redo move (Cmd/Ctrl+Shift+Z)' : 'Redo unavailable: no moves to redo'
    const analysisTitle = this.analysisAvailable
      ? 'Toggle analysis'
      : 'Analysis unavailable: AI integration not enabled in this build'

    const markClass = currentPlayer === 'O' ? 'turn-display__mark--o' : 'turn-display__mark--x'
    const markSymbol = currentPlayer === 'O' ? '○' : '✕'

    this.shadowRoot.innerHTML = `
      <style>${controlsStyles}</style>
      <section class="controls" aria-label="Game controls">
        <p class="controls__label">Game</p>
        <div class="controls__row">
          <button
            class="button button--new-game"
            type="button"
            data-action="new-game"
            title="Start a new game"
            aria-label="Start a new game"
          >New Game</button>
          <button
            class="button"
            type="button"
            data-action="reset"
            title="Reset current game"
            aria-label="Reset current game"
          >Reset</button>
        </div>

        <p class="controls__label">History</p>
        <div class="controls__row controls__row--history">
          <button
            class="button"
            type="button"
            data-action="undo"
            title="${undoTitle}"
            aria-label="Undo last move"
            ${this.canUndo ? '' : 'disabled'}
          >↩ Undo</button>
          <button
            class="button"
            type="button"
            data-action="redo"
            title="${redoTitle}"
            aria-label="Redo move"
            ${this.canRedo ? '' : 'disabled'}
          >↪ Redo</button>
        </div>

        <p class="controls__label">Analysis</p>
        <div class="controls__row controls__row--single">
          <button
            class="button toggle"
            type="button"
            data-action="toggle-analysis"
            title="${analysisTitle}"
            aria-label="Toggle analysis"
            aria-pressed="${this.analysisEnabled ? 'true' : 'false'}"
            ${this.analysisAvailable ? '' : 'disabled'}
          >${this.analysisEnabled ? '◉ Analysis On' : '◎ Analysis Off'}</button>
        </div>

        <div class="turn-display" aria-live="polite" aria-label="Current turn">
          <span class="turn-display__mark ${markClass}">${markSymbol}</span>
          <span>${currentPlayer === 'O' ? 'Player O' : 'Player X'} to move</span>
        </div>
      </section>
    `
  }
}

export function registerUTTTControls(): void {
  if (!customElements.get('uttt-controls')) {
    customElements.define('uttt-controls', UTTTControlsElement)
  }
}
