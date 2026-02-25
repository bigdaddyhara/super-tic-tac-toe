import { beforeEach, describe, expect, it } from 'vitest'
import { loadUISettings, saveUISettings, SETTINGS_STORAGE_KEY, type UISettings } from '../src/ui/ui-settings'

function installLocalStorageMock(): void {
  const store = new Map<string, string>()

  const localStorageMock = {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string): void {
      store.set(key, value)
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    clear(): void {
      store.clear()
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  })
}

describe('ui-settings Phase 6', () => {
  beforeEach(() => {
    installLocalStorageMock()
    localStorage.clear()
  })

  it('loads defaults with game mode when nothing persisted', () => {
    const settings = loadUISettings()
    expect(settings).toEqual({
      showLegalMoves: true,
      showForcedBoard: true,
      gameMode: 'hvh',
    })
  })

  it('persists and restores game mode and toggles', () => {
    const custom: UISettings = {
      showLegalMoves: false,
      showForcedBoard: false,
      gameMode: 'hva',
    }

    saveUISettings(custom)
    const loaded = loadUISettings()

    expect(loaded).toEqual(custom)
  })

  it('falls back to hvh for unknown persisted game mode', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ showLegalMoves: true, showForcedBoard: true, gameMode: 'unknown' }),
    )

    const loaded = loadUISettings()
    expect(loaded.gameMode).toBe('hvh')
  })
})
