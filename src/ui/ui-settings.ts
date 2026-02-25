export interface UISettings {
  showLegalMoves: boolean
  showForcedBoard: boolean
  gameMode: 'hvh' | 'hva'
  showLastMoveHighlight?: boolean
  forcedBoardIntensity?: number
}

export const SETTINGS_STORAGE_KEY = 'uttt-ui-settings'

const DEFAULT_UI_SETTINGS: UISettings = {
  showLegalMoves: true,
  showForcedBoard: true,
  gameMode: 'hvh',
}

function hasLocalStorage(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
}

export function loadUISettings(): UISettings {
  if (!hasLocalStorage()) {
    return { ...DEFAULT_UI_SETTINGS }
  }

  try {
    const raw = globalThis.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_UI_SETTINGS }
    }

    const parsed = JSON.parse(raw) as Partial<UISettings> | null

    return {
      showLegalMoves:
        typeof parsed?.showLegalMoves === 'boolean'
          ? parsed.showLegalMoves
          : DEFAULT_UI_SETTINGS.showLegalMoves,
      showForcedBoard:
        typeof parsed?.showForcedBoard === 'boolean'
          ? parsed.showForcedBoard
          : DEFAULT_UI_SETTINGS.showForcedBoard,
      gameMode: parsed?.gameMode === 'hva' ? 'hva' : DEFAULT_UI_SETTINGS.gameMode,
    }
  } catch {
    return { ...DEFAULT_UI_SETTINGS }
  }
}

export function saveUISettings(settings: UISettings): void {
  if (!hasLocalStorage()) return

  try {
    globalThis.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // no-op by design
  }
}
