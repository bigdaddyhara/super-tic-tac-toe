export function createOverlay(text: string) {
  const o = document.createElement('div')
  o.className = 'overlay'
  o.textContent = text
  return o
}
