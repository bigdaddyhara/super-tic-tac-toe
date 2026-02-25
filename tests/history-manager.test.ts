import { beforeEach, describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/state'
import { HistoryManager } from '../src/ui/history-manager'

function installLocalStorageMock(): void {
  const store = new Map<string, string>()

  const localStorageMock = {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    clear(): void {
      store.clear()
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    get length(): number {
      return store.size
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  })
}

describe('history-manager', () => {
  beforeEach(() => {
    installLocalStorageMock()
    localStorage.clear()
  })

  it('push -> undo -> redo preserves original state object references', () => {
    const initial = createNewGame()
    const next = createNewGame()
    next.currentPlayer = 'O'

    const manager = new HistoryManager(initial)
    manager.push(next)

    const undone = manager.undo()
    expect(undone).toBe(initial)

    const redone = manager.redo()
    expect(redone).toBe(next)
  })

  it('push after undo clears future stack', () => {
    const s0 = createNewGame()
    const s1 = createNewGame()
    s1.currentPlayer = 'O'
    const s2 = createNewGame()
    const s3 = createNewGame()

    const manager = new HistoryManager(s0)
    manager.push(s1)
    manager.push(s2)

    expect(manager.canRedo()).toBe(false)
    manager.undo()
    expect(manager.canRedo()).toBe(true)

    manager.push(s3)
    expect(manager.canRedo()).toBe(false)
    expect(manager.getState().future.length).toBe(0)
  })

  it('canUndo is false on a fresh manager', () => {
    const manager = new HistoryManager(createNewGame())
    expect(manager.canUndo()).toBe(false)
  })

  it('canRedo is false after a new move', () => {
    const s0 = createNewGame()
    const s1 = createNewGame()
    const s2 = createNewGame()

    const manager = new HistoryManager(s0)
    manager.push(s1)
    manager.undo()
    expect(manager.canRedo()).toBe(true)

    manager.push(s2)
    expect(manager.canRedo()).toBe(false)
  })

  it('returns null when undo/redo are unavailable', () => {
    const manager = new HistoryManager(createNewGame())
    expect(manager.undo()).toBeNull()
    expect(manager.redo()).toBeNull()
  })

  it('trims past stack to <= 200 entries', () => {
    const manager = new HistoryManager(createNewGame())

    for (let i = 0; i < 250; i += 1) {
      manager.push(createNewGame())
    }

    expect(manager.getState().past.length).toBeLessThanOrEqual(200)
  })

  it('persists and loads history from localStorage', () => {
    const s0 = createNewGame()
    const s1 = createNewGame()
    s1.currentPlayer = 'O'
    const s2 = createNewGame()

    const manager = new HistoryManager(s0)
    manager.push(s1)
    manager.push(s2)
    manager.undo()

    const loaded = HistoryManager.load()
    expect(loaded).not.toBeNull()

    const loadedState = loaded!.getState()
    expect(loadedState.present.version).toBe(1)
    expect(loadedState.past.length).toBe(1)
    expect(loadedState.future.length).toBe(1)
    expect(loaded!.canUndo()).toBe(true)
    expect(loaded!.canRedo()).toBe(true)
    expect(loaded!.getPresent().currentPlayer).toBe('O')
  })

  it('load clears storage and returns null for unknown snapshot version', () => {
    const invalidHistory = {
      past: [
        {
          version: 2,
          timestamp: Date.now(),
          state: createNewGame(),
        },
      ],
      present: {
        version: 1,
        timestamp: Date.now(),
        state: createNewGame(),
      },
      future: [],
    }

    localStorage.setItem(HistoryManager.STORAGE_KEY, JSON.stringify(invalidHistory))

    const loaded = HistoryManager.load()
    expect(loaded).toBeNull()
    expect(localStorage.getItem(HistoryManager.STORAGE_KEY)).toBeNull()
  })
})