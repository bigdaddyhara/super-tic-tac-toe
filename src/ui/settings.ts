export const SETTINGS_KEY = 'sut_settings_v1'

// Ensure a global localStorage shim exists when running in Node (tests).
if (typeof localStorage === 'undefined') {
  if (!(globalThis as any).__inMemoryLocalStorage) {
    ;(globalThis as any).__inMemoryLocalStorage = {
      _store: {} as Record<string, string>,
      getItem(k: string) { return this._store[k] ?? null },
      setItem(k: string, v: string) { this._store[k] = v },
      removeItem(k: string) { delete this._store[k] },
      clear() { this._store = {} }
    }
  }
  ;(globalThis as any).localStorage = (globalThis as any).__inMemoryLocalStorage
}

export function loadSettings(defaults: Record<string, any> = {}) {
  try {
    let storage: any
    if (typeof localStorage !== 'undefined') {
      storage = localStorage
    } else {
      if (!(globalThis as any).__inMemoryLocalStorage) {
        ;(globalThis as any).__inMemoryLocalStorage = {
          _store: {} as Record<string, string>,
          getItem(k: string) { return this._store[k] ?? null },
          setItem(k: string, v: string) { this._store[k] = v },
          removeItem(k: string) { delete this._store[k] },
          clear() { this._store = {} }
        }
      }
      storage = (globalThis as any).__inMemoryLocalStorage
    }
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw)
    return { ...defaults, ...parsed }
  } catch (e) {
    return { ...defaults }
  }
}

export function saveSettings(settings: Record<string, any>) {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (globalThis as any).__inMemoryLocalStorage
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    // swallow
  }
}
