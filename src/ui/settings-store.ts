import {
  clampNumber,
  isAIDifficulty,
  UTTT_SETTINGS_DEFAULTS,
  UTTT_SETTINGS_STORAGE_KEY,
  type UTTTSettings,
} from './settings-types'

function hasStorage(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
}

function sanitize(raw: Partial<UTTTSettings>): UTTTSettings {
  return {
    analysisModeDefault:
      typeof raw.analysisModeDefault === 'boolean'
        ? raw.analysisModeDefault
        : UTTT_SETTINGS_DEFAULTS.analysisModeDefault,
    timerPerTurnEnabled:
      typeof raw.timerPerTurnEnabled === 'boolean'
        ? raw.timerPerTurnEnabled
        : UTTT_SETTINGS_DEFAULTS.timerPerTurnEnabled,
    secondsPerTurn:
      typeof raw.secondsPerTurn === 'number'
        ? Math.round(clampNumber(raw.secondsPerTurn, 5, 300))
        : UTTT_SETTINGS_DEFAULTS.secondsPerTurn,
    aiDifficulty: isAIDifficulty(raw.aiDifficulty) ? raw.aiDifficulty : UTTT_SETTINGS_DEFAULTS.aiDifficulty,
    showLastMove: typeof raw.showLastMove === 'boolean' ? raw.showLastMove : UTTT_SETTINGS_DEFAULTS.showLastMove,
    highlightIntensity:
      typeof raw.highlightIntensity === 'number'
        ? clampNumber(raw.highlightIntensity, 0.1, 1)
        : UTTT_SETTINGS_DEFAULTS.highlightIntensity,
  }
}

export function loadSettings(): UTTTSettings {
  if (!hasStorage()) {
    return { ...UTTT_SETTINGS_DEFAULTS }
  }

  try {
    const raw = globalThis.localStorage.getItem(UTTT_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...UTTT_SETTINGS_DEFAULTS }

    const parsed = JSON.parse(raw) as Partial<UTTTSettings>
    return sanitize(parsed)
  } catch {
    return { ...UTTT_SETTINGS_DEFAULTS }
  }
}

export function saveSettings(settings: UTTTSettings): void {
  if (!hasStorage()) return

  try {
    const sanitized = sanitize(settings)
    globalThis.localStorage.setItem(UTTT_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized))
  } catch {
    // no-op by design
  }
}

export function resetSettings(): UTTTSettings {
  const defaults = { ...UTTT_SETTINGS_DEFAULTS }
  saveSettings(defaults)
  return defaults
}
