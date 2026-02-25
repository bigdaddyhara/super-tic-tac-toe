type ToastKind = 'info' | 'success' | 'warning' | 'error'

import tokensCssText from '../../styles/tokens.css?inline'
import componentsCssText from '../../styles/components.css?inline'

const styles = `${tokensCssText}\n${componentsCssText}`

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

export class UTTTToastElement extends HTMLElement {
  private items: ToastItem[] = []
  private nextId = 1

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }
    this.render()
  }

  notify(message: string, kind: ToastKind = 'info', durationMs = 2400): void {
    const text = String(message || '').trim()
    if (!text) return

    const toast: ToastItem = {
      id: this.nextId,
      message: text,
      kind,
    }
    this.nextId += 1
    this.items = [...this.items, toast]
    this.render()

    globalThis.setTimeout(() => {
      this.items = this.items.filter((item) => item.id !== toast.id)
      this.render()
    }, Math.max(800, durationMs))
  }

  private render(): void {
    if (!this.shadowRoot) return
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="toast-stack" aria-label="Notifications" role="status" aria-live="polite" aria-atomic="false">
        ${this.items
          .map(
            (item) =>
              `<div class="toast toast--${item.kind}" data-kind="${item.kind}" role="status">${item.message}</div>`,
          )
          .join('')}
      </section>
    `
  }
}

export function registerUTTTToast(): void {
  if (!customElements.get('uttt-toast')) {
    customElements.define('uttt-toast', UTTTToastElement)
  }
}