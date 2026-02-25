import type { GameController } from './game-controller'
import type { GameState } from '../types/game-types'
import type { UTTTControlsElement } from './components/uttt-controls'
import type { UTTTHudElement } from './components/uttt-hud'

interface DOMBindingsOptions {
  controller: GameController
  hud: UTTTHudElement
  controls: UTTTControlsElement
  eventTarget: EventTarget
  onToggleAnalysis?: (enabled: boolean) => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable
}

export function bindControllerToDOM(options: DOMBindingsOptions): () => void {
  const { controller, hud, controls, onToggleAnalysis } = options
  const eventTarget = options.eventTarget

  const syncState = (): void => {
    const state: GameState = controller.getState()
    hud.setState(state)
    controls.setState(state)
    controls.setHistoryAvailability(controller.canUndo(), controller.canRedo())
  }

  const onHistoryChanged = (): void => {
    syncState()
  }

  const onNewGame = (): void => {
    controller.resetGame()
    syncState()
  }

  const onReset = (): void => {
    controller.resetGame()
    syncState()
  }

  const onUndo = (): void => {
    controller.undo()
    syncState()
  }

  const onRedo = (): void => {
    controller.redo()
    syncState()
  }

  const onToggle = (event: Event): void => {
    const customEvent = event as CustomEvent<{ enabled?: boolean }>
    onToggleAnalysis?.(Boolean(customEvent.detail?.enabled))
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return

    const key = event.key.toLowerCase()
    const hasMod = event.metaKey || event.ctrlKey

    if (hasMod && key === 'z' && event.shiftKey) {
      event.preventDefault()
      controller.redo()
      syncState()
      return
    }

    if (hasMod && key === 'z' && !event.shiftKey) {
      event.preventDefault()
      controller.undo()
      syncState()
      return
    }

    if (!hasMod && !event.shiftKey && key === 'n') {
      event.preventDefault()
      controller.resetGame()
      syncState()
    }
  }

  window.addEventListener('history:changed', onHistoryChanged)
  window.addEventListener('keydown', onKeyDown)
  eventTarget.addEventListener('uttt:new-game', onNewGame as EventListener)
  eventTarget.addEventListener('uttt:reset', onReset as EventListener)
  eventTarget.addEventListener('uttt:undo', onUndo as EventListener)
  eventTarget.addEventListener('uttt:redo', onRedo as EventListener)
  eventTarget.addEventListener('uttt:toggle-analysis', onToggle as EventListener)

  syncState()

  return () => {
    window.removeEventListener('history:changed', onHistoryChanged)
    window.removeEventListener('keydown', onKeyDown)
    eventTarget.removeEventListener('uttt:new-game', onNewGame as EventListener)
    eventTarget.removeEventListener('uttt:reset', onReset as EventListener)
    eventTarget.removeEventListener('uttt:undo', onUndo as EventListener)
    eventTarget.removeEventListener('uttt:redo', onRedo as EventListener)
    eventTarget.removeEventListener('uttt:toggle-analysis', onToggle as EventListener)
  }
}
