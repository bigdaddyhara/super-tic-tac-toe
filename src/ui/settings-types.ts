export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'insane'

export interface UTTTSettings {
  analysisModeDefault: boolean
  timerPerTurnEnabled: boolean
  secondsPerTurn: number
  aiDifficulty: AIDifficulty
  aiEnabled: boolean
  aiPlayer: 'X' | 'O'
  showLastMove: boolean
  highlightIntensity: number
}

export const UTTT_SETTINGS_DEFAULTS: UTTTSettings = {
  analysisModeDefault: false,
  timerPerTurnEnabled: false,
  secondsPerTurn: 15,
  aiDifficulty: 'medium',
  aiEnabled: false,
  aiPlayer: 'O',
  showLastMove: true,
  highlightIntensity: 0.6,
}

export const UTTT_SETTINGS_STORAGE_KEY = 'uttt:settings:v1'

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function isAIDifficulty(value: unknown): value is AIDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard' || value === 'insane'
}

export function isUTTTSettings(value: unknown): value is UTTTSettings {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<UTTTSettings>

  return (
    typeof candidate.analysisModeDefault === 'boolean' &&
    typeof candidate.timerPerTurnEnabled === 'boolean' &&
    typeof candidate.secondsPerTurn === 'number' &&
    isAIDifficulty(candidate.aiDifficulty) &&
    typeof candidate.aiEnabled === 'boolean' &&
    (candidate.aiPlayer === 'X' || candidate.aiPlayer === 'O') &&
    typeof candidate.showLastMove === 'boolean' &&
    typeof candidate.highlightIntensity === 'number'
  )
}
