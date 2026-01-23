import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TurnTimer } from '../src/ui/turn-timer'

describe('TurnTimer restoreSnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules an expiry according to remainingMs when restored (running=true)', () => {
    const t = new TurnTimer(5000)
    const cb = vi.fn()
    // restore with 3000ms remaining
    t.restoreSnapshot({ remainingMs: 3000, running: true }, 'X', cb)
    expect(t.isRunning()).toBe(true)
    // advance just before expiry
    vi.advanceTimersByTime(2999)
    expect(cb).not.toHaveBeenCalled()
    // advance to expiry
    vi.advanceTimersByTime(2)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not schedule expiry when running=false', () => {
    const t = new TurnTimer(4000)
    const cb = vi.fn()
    t.restoreSnapshot({ remainingMs: 2000, running: false }, 'X', cb)
    expect(t.isRunning()).toBe(false)
    vi.advanceTimersByTime(3000)
    expect(cb).not.toHaveBeenCalled()
  })
})
