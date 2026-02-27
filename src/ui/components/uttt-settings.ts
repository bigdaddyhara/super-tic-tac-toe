import type { UTTTSettings } from '../settings-types'
import { UTTT_SETTINGS_DEFAULTS, type AIDifficulty } from '../settings-types'
import tokensCssText from '../../styles/tokens.css?inline'
import componentsCssText from '../../styles/components.css?inline'

const styles = `${tokensCssText}\n${componentsCssText}`

export class UTTTSettingsElement extends HTMLElement {
  private settings: UTTTSettings = { ...UTTT_SETTINGS_DEFAULTS }
  private aiAvailable = false

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }
    this.render()
    this.attachHandlers()
  }

  setSettings(settings: UTTTSettings): void {
    this.settings = { ...settings }
    this.render()
  }

  setAIAvailable(available: boolean): void {
    this.aiAvailable = available
    this.render()
  }

  open(): void {
    const dialog = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
    if (!dialog) return
    if (!dialog.open) {
      dialog.showModal()
    }
  }

  close(): void {
    const dialog = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
    if (!dialog) return
    if (dialog.open) {
      dialog.close()
    }
  }

  private attachHandlers(): void {
    if (!this.shadowRoot) return
    
    this.shadowRoot.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const action = target.closest('[data-action]') as HTMLElement | null
      if (!action) return

      const type = action.dataset.action
      if (type === 'close-settings') {
        this.close()
      }

      if (type === 'reset-settings') {
        this.settings = { ...UTTT_SETTINGS_DEFAULTS }
        this.render()
        this.emitSettingsChanged()
        this.dispatchEvent(
          new CustomEvent('uttt:settings-reset', {
            bubbles: true,
            composed: true,
          }),
        )
      }
    })

    this.shadowRoot.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement | null
      if (!target) return

      const name = target.getAttribute('name')
      if (!name) return

      if (name === 'analysisModeDefault' && target instanceof HTMLInputElement) {
        this.settings.analysisModeDefault = target.checked
      }

      if (name === 'timerPerTurnEnabled' && target instanceof HTMLInputElement) {
        this.settings.timerPerTurnEnabled = target.checked
      }

      if (name === 'secondsPerTurn' && target instanceof HTMLInputElement) {
        const nextValue = Number.parseInt(target.value, 10)
        if (Number.isFinite(nextValue)) {
          this.settings.secondsPerTurn = Math.max(5, Math.min(300, nextValue))
        }
      }

      if (name === 'aiDifficulty' && target instanceof HTMLSelectElement) {
        const value = target.value
        if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'insane') {
          this.settings.aiDifficulty = value as AIDifficulty
        }
      }

      if (name === 'aiEnabled' && target instanceof HTMLInputElement) {
        this.settings.aiEnabled = target.checked
      }

      if (name === 'aiPlayer' && target instanceof HTMLSelectElement) {
        const value = target.value
        if (value === 'X' || value === 'O') {
          this.settings.aiPlayer = value
        }
      }

      if (name === 'showLastMove' && target instanceof HTMLInputElement) {
        this.settings.showLastMove = target.checked
      }

      if (name === 'highlightIntensity' && target instanceof HTMLInputElement) {
        const sliderValue = Number.parseFloat(target.value)
        if (Number.isFinite(sliderValue)) {
          this.settings.highlightIntensity = Math.max(0.1, Math.min(1, sliderValue))
        }
      }

      this.emitSettingsChanged()
      this.render()
    })

    const dialog = this.shadowRoot.querySelector('dialog') as HTMLDialogElement | null
    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault()
      this.close()
    })
  }

  private emitSettingsChanged(): void {
    this.dispatchEvent(
      new CustomEvent('uttt:settings-changed', {
        bubbles: true,
        composed: true,
        detail: { ...this.settings },
      }),
    )
  }

  private render(): void {
    if (!this.shadowRoot) return
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <dialog class="settings-dialog" aria-label="Settings dialog">
        <form class="settings-form" method="dialog">
          <header class="settings-header">
            <h3>Settings</h3>
            <button
              type="button"
              class="button settings-close"
              data-action="close-settings"
              aria-label="Close settings"
              title="Close settings"
            >Close</button>
          </header>

          <label class="field field--checkbox">
            <input name="analysisModeDefault" type="checkbox" ${this.settings.analysisModeDefault ? 'checked' : ''} />
            Analysis mode default
          </label>

          <label class="field field--checkbox">
            <input name="timerPerTurnEnabled" type="checkbox" ${this.settings.timerPerTurnEnabled ? 'checked' : ''} />
            Enable timer per turn
          </label>

          <label class="field">
            <span>Seconds per turn</span>
            <input
              name="secondsPerTurn"
              type="number"
              min="5"
              max="300"
              step="1"
              value="${this.settings.secondsPerTurn}"
            />
          </label>

          <label class="field">
            <span>AI difficulty</span>
            <select name="aiDifficulty" ${this.aiAvailable ? '' : 'disabled'}>
              <option value="easy" ${this.settings.aiDifficulty === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="medium" ${this.settings.aiDifficulty === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="hard" ${this.settings.aiDifficulty === 'hard' ? 'selected' : ''}>Hard</option>
              <option value="insane" ${this.settings.aiDifficulty === 'insane' ? 'selected' : ''}>Insane</option>
            </select>
            ${this.aiAvailable ? '' : '<small>AI difficulty coming soon</small>'}
          </label>

          <label class="field field--checkbox">
            <input name="aiEnabled" type="checkbox" ${this.settings.aiEnabled ? 'checked' : ''} ${this.aiAvailable ? '' : 'disabled'} />
            Enable AI opponent
          </label>

          <label class="field">
            <span>AI plays as</span>
            <select name="aiPlayer" ${this.settings.aiEnabled && this.aiAvailable ? '' : 'disabled'}>
              <option value="O" ${this.settings.aiPlayer === 'O' ? 'selected' : ''}>O (second player)</option>
              <option value="X" ${this.settings.aiPlayer === 'X' ? 'selected' : ''}>X (first player)</option>
            </select>
          </label>

          <label class="field field--checkbox">
            <input name="showLastMove" type="checkbox" ${this.settings.showLastMove ? 'checked' : ''} />
            Show last move
          </label>

          <label class="field">
            <span>Highlight intensity</span>
            <input
              name="highlightIntensity"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value="${this.settings.highlightIntensity.toFixed(2)}"
            />
          </label>

          <footer class="settings-footer">
            <button
              type="button"
              class="button"
              data-action="reset-settings"
              aria-label="Reset settings"
              title="Reset settings"
            >Reset settings</button>
          </footer>
        </form>
      </dialog>
    `
  }
}

export function registerUTTTSettings(): void {
  if (!customElements.get('uttt-settings')) {
    customElements.define('uttt-settings', UTTTSettingsElement)
  }
}
