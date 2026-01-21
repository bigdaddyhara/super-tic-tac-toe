import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReplayManager } from '../src/ui/replay-manager'

// Simple mock GameState shape for tests
const makeState = (id: number) => ({ bigBoard: Array.from({ length: 9 }).map(() => Array.from({ length: 9 }).map(() => null)), currentPlayer: 'X', nextBoardIndex: null, winner: null, __id: id } as any)

describe('ReplayManager', () => {
  let origLocal: Storage
  beforeEach(() => {
    origLocal = (global as any).localStorage
    const store: Record<string, string> = {}
    ;(global as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => (store[k] = v),
      removeItem: (k: string) => delete store[k],
    }
  })
  afterEach(() => {
    (global as any).localStorage = origLocal
    vi.useRealTimers()
  })

  test('push and persist/load', () => {
    const r = new ReplayManager()
    r.clear()
    r.push(makeState(1), { board: 0, cell: 0 })
    r.push(makeState(2), { board: 1, cell: 1 })
    expect(r.entries.length).toBe(2)
    const r2 = new ReplayManager()
    expect(r2.entries.length).toBe(2)
    expect(r2.entries[1].move).toEqual({ board: 1, cell: 1 })
  })

  test('prev/next stepping and play auto-advances', () => {
    vi.useFakeTimers()
    const r = new ReplayManager()
    r.clear()
    r.push(makeState(1), { board: 0, cell: 0 })
    r.push(makeState(2), { board: 1, cell: 1 })
    r.push(makeState(3), { board: 2, cell: 2 })
    expect(r.entries.length).toBe(3)
    // start at end
    r.index = r.entries.length - 1
    r.prev()
    expect(r.index).toBe(1)
    r.prev()
    expect(r.index).toBe(0)
    r.next()
    expect(r.index).toBe(1)

    // test play: will advance until end
    let steps = 0
    r.index = 0
    r.setSpeed(50)
    r.play((s) => {
      steps++
    })
    // advance timers
    vi.advanceTimersByTime(200)
    // play should have advanced a couple steps
    expect(steps).toBeGreaterThanOrEqual(1)
    r.pause()
  })
})
