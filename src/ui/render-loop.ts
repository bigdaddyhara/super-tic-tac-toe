interface Renderable<TPayload> {
  render(payload: TPayload): void
}

export function createRenderScheduler<TPayload>({
  renderer,
  getPayload,
}: {
  renderer: Renderable<TPayload>
  getPayload: () => TPayload
}) {
  let rafPending = false

  function scheduleRender(): void {
    if (rafPending) return
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      renderer.render(getPayload())
    })
  }

  return { scheduleRender }
}