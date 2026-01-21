// lightweight animation hooks; stubs for now
export function pulse(element: HTMLElement) {
  element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 240 })
}

// Simple timing helper: returns progress 0..1 for elapsed t in [0,duration]
export function easingProgress(start: number, duration: number) {
  const now = performance.now()
  const t = Math.max(0, Math.min(1, (now - start) / duration))
  // easeOutCubic
  return 1 - Math.pow(1 - t, 3)
}

export function now() {
  return performance.now()
}
