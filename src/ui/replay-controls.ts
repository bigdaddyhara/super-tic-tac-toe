import { GameController } from './game-controller'
import { HistoryManager } from './history-manager'

export function initKeyboardShortcuts(controller: GameController): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    const hasMod = event.metaKey || event.ctrlKey
    if (!hasMod) return

    const key = event.key.toLowerCase()

    if (key === 'z' && event.shiftKey) {
      event.preventDefault()
      controller.redo()
      return
    }

    if (key === 'z' && !event.shiftKey) {
      event.preventDefault()
      controller.undo()
      return
    }

    if (key === 'y') {
      event.preventDefault()
      controller.redo()
    }
  }

  window.addEventListener('keydown', onKeyDown)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
  }
}

export function updateButtonStates(
  undoBtn: HTMLButtonElement | null,
  redoBtn: HTMLButtonElement | null,
  manager: HistoryManager,
): void {
  if (!undoBtn || !redoBtn) return

  undoBtn.disabled = !manager.canUndo()
  redoBtn.disabled = !manager.canRedo()
  undoBtn.setAttribute('aria-disabled', String(undoBtn.disabled))
  redoBtn.setAttribute('aria-disabled', String(redoBtn.disabled))
}

export function wireHistoryButtons(
  undoBtn: HTMLButtonElement | null,
  redoBtn: HTMLButtonElement | null,
  controller: GameController,
): () => void {
  const update = (): void => {
    updateButtonStates(undoBtn, redoBtn, controller.getHistoryManager())
  }

  const onUndoClick = (): void => {
    controller.undo()
    update()
  }

  const onRedoClick = (): void => {
    controller.redo()
    update()
  }

  const onHistoryChanged = (): void => {
    update()
  }

  undoBtn?.addEventListener('click', onUndoClick)
  redoBtn?.addEventListener('click', onRedoClick)
  window.addEventListener('history:changed', onHistoryChanged)
  update()

  return () => {
    undoBtn?.removeEventListener('click', onUndoClick)
    redoBtn?.removeEventListener('click', onRedoClick)
    window.removeEventListener('history:changed', onHistoryChanged)
  }
}