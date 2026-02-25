import tokensCssText from '../../styles/tokens.css?inline'
import componentsCssText from '../../styles/components.css?inline'

const styles = `${tokensCssText}\n${componentsCssText}`

export class UTTTHelpElement extends HTMLElement {
  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }
    this.render()
    this.attachHandlers()
  }

  open(): void {
    const dialog = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }

  close(): void {
    const dialog = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
    if (dialog && dialog.open) {
      dialog.close()
    }
  }

  private attachHandlers(): void {
    if (!this.shadowRoot) return
    
    this.shadowRoot.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      const action = target?.closest('[data-action]') as HTMLElement | null
      if (!action) return
      if (action.dataset.action === 'close-help') {
        this.close()
      }
    })

    const dialog = this.shadowRoot.querySelector('dialog') as HTMLDialogElement | null
    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault()
      this.close()
    })
  }

  private render(): void {
    if (!this.shadowRoot) return
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <dialog class="help-dialog" aria-label="Help and shortcuts">
        <div class="help-content">
          <header class="help-header">
            <h3>How to Play</h3>
            <button
              type="button"
              class="button"
              data-action="close-help"
              aria-label="Close help"
              title="Close help"
            >Close</button>
          </header>

          <section class="help-section" aria-label="Rules summary">
            <h4>Rules summary</h4>
            <ul>
              <li>Play in any cell for the first move.</li>
              <li>Your move sends the opponent to the matching small board.</li>
              <li>If that board is closed, the opponent gets a free move.</li>
              <li>Win three small boards in a line to win the game.</li>
            </ul>
          </section>

          <section class="help-section" aria-label="Keyboard shortcuts">
            <h4>Keyboard shortcuts</h4>
            <ul>
              <li><strong>⌘/Ctrl + Z</strong>: Undo</li>
              <li><strong>⌘/Ctrl + Shift + Z</strong>: Redo</li>
              <li><strong>N</strong>: New game</li>
            </ul>
          </section>
        </div>
      </dialog>
    `
  }
}

export function registerUTTTHelp(): void {
  if (!customElements.get('uttt-help')) {
    customElements.define('uttt-help', UTTTHelpElement)
  }
}