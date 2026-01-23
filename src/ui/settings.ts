export const SETTINGS_KEY = 'sut_settings_v1'

export function loadSettings(defaults: Record<string, any> = {}) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw)
    return { ...defaults, ...parsed }
  } catch (e) {
    return { ...defaults }
  }
}

export function saveSettings(settings: Record<string, any>) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    // swallow
  }
}
