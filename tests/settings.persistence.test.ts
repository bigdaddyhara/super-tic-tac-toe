import { describe, it, expect, beforeEach } from 'vitest'
import { loadSettings, saveSettings, SETTINGS_KEY } from '../src/ui/settings'

describe('settings persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads defaults when nothing persisted and persists changes', () => {
    const defs = { animations: true, turnTimeoutSec: 30 }
    const s1 = loadSettings(defs)
    expect(s1.animations).toBe(true)
    expect(s1.turnTimeoutSec).toBe(30)

    s1.analysisEnabled = true
    saveSettings(s1)

    const s2 = loadSettings(defs)
    expect(s2.analysisEnabled).toBe(true)
    expect(s2.animations).toBe(true)
  })

  it('stores and retrieves numeric and boolean values', () => {
    const s = { analysisEnabled: false, turnTimeoutSec: 15 }
    saveSettings(s)
    const got = loadSettings({})
    expect(got.turnTimeoutSec).toBe(15)
    expect(got.analysisEnabled).toBe(false)
  })
})
