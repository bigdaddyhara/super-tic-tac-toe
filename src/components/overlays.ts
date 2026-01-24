export function createOverlay(text: string) {
  const o = document.createElement('div')
  o.className = 'overlay'
  o.textContent = text
  return o
}

export function createEndStateBanner(resultText: string, options?: { dismissible?: boolean }) {
  const banner = document.createElement('div')
  banner.className = 'endstate-banner'
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-live', 'polite')

  const inner = document.createElement('div')
  inner.className = 'endstate-inner'
  inner.textContent = resultText
  banner.appendChild(inner)

  if (options?.dismissible !== false) {
    const btn = document.createElement('button')
    btn.className = 'endstate-dismiss'
    btn.type = 'button'
    btn.textContent = 'Close'
    btn.addEventListener('click', () => {
      banner.style.opacity = '0'
      setTimeout(() => banner.remove(), 200)
    })
    banner.appendChild(btn)
  }

  return banner
}
