import { describe, test, expect } from 'vitest'

const SETTINGS_KEY = 'sut_settings_v1'

describe('settings persistence', () => {
  test('saves and loads animation setting in localStorage', () => {
    const orig = (global as any).localStorage
    const store: Record<string, string> = {}
    ;(global as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => (store[k] = v),
      removeItem: (k: string) => delete store[k],
    }

    const s = { animations: false }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    expect(parsed).not.toBeNull()
    expect(parsed.animations).toBe(false)

    ;(global as any).localStorage = orig
  })

  test('saves and loads multiple settings', () => {
    const orig = (global as any).localStorage
    const store: Record<string, string> = {}
    ;(global as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => (store[k] = v),
      removeItem: (k: string) => delete store[k],
    }

    const SETTINGS_KEY = 'sut_settings_v1'
    const s = {
      analysisEnabled: true,
      turnTimerEnabled: true,
      turnTimeoutSec: 12,
      showLastMoveHighlight: false,
      forcedBoardIntensity: 0.2,
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    expect(parsed).not.toBeNull()
    expect(parsed.analysisEnabled).toBe(true)
    expect(parsed.turnTimerEnabled).toBe(true)
    expect(parsed.turnTimeoutSec).toBe(12)
    expect(parsed.showLastMoveHighlight).toBe(false)
    expect(parsed.forcedBoardIntensity).toBeCloseTo(0.2)

    ;(global as any).localStorage = orig
  })
})
