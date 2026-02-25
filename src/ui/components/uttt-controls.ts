import type { GameState } from '../../types/game-types'

const controlsStyles = `
  :host {
    display: block;
    color: var(--color-text, #e2e8f0);
    font-family: var(--font-family-base, Inter, sans-serif);
  }

  .controls {
    display: grid;
    gap: 0.625rem;
  }

  .controls__title {
    margin: 0;
    font-size: var(--font-size-lg, 1.125rem);
    font-weight: 600;
  }

  .controls__row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .button {
    border: 1px solid var(--color-border, #32415f);
    border-radius: var(--radius-1, 0.5rem);
    padding: 0.5rem 0.75rem;
    background: var(--color-surface-muted, #17233b);
    color: var(--color-text, #e2e8f0);
    cursor: pointer;
  }

  .button:hover {
    background: var(--color-accent-strong, #3b82f6);
  }

  .button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .toggle[aria-pressed='true'] {
    background: var(--color-accent, #60a5fa);
    color: #0b1220;
  }
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

    this.shadowRoot.innerHTML = `
      <style>${controlsStyles}</style>
      <section class="controls" aria-label="Game controls">
        <h2 class="controls__title">Controls</h2>
        <div class="controls__row">
          <button
            class="button"
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
          <button
            class="button"
            type="button"
            data-action="undo"
            title="${undoTitle}"
            aria-label="Undo last move"
            ${this.canUndo ? '' : 'disabled'}
          >Undo</button>
          <button
            class="button"
            type="button"
            data-action="redo"
            title="${redoTitle}"
            aria-label="Redo move"
            ${this.canRedo ? '' : 'disabled'}
          >Redo</button>
          <button
            class="button toggle"
            type="button"
            data-action="toggle-analysis"
            title="${analysisTitle}"
            aria-label="Toggle analysis"
            aria-pressed="${this.analysisEnabled ? 'true' : 'false'}"
            ${this.analysisAvailable ? '' : 'disabled'}
          >Analysis</button>
        </div>
        <div class="controls__row" aria-live="polite">
          <span class="button" aria-label="Current turn" title="Current turn">Turn: ${currentPlayer}</span>
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
