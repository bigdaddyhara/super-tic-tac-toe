import { GameState } from '../types/game-types'

export type TimerSnapshot = { remainingMs: number | null; running: boolean; timeoutMs?: number }
export type HistorySnapshot = {
  state: GameState
  move?: { board: number; cell: number }
  ts: number
  timer?: TimerSnapshot
  stateId?: string
}

export class HistoryManager {
  private past: HistorySnapshot[] = []
  private future: HistorySnapshot[] = []
  private capacity = 200
  // current snapshot is not stored here; caller holds current `gameState`

  // Utility: deep-clone a snapshot to avoid later mutation corrupting history
  private cloneSnapshot(s: HistorySnapshot) {
    // Prefer structuredClone when available for correctness and preserving types
    // Fallback to JSON deep clone which is acceptable for the simple snapshot shape
    // (no functions or circular refs expected)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
      // @ts-ignore - structuredClone may be available at runtime
      return structuredClone(s) as HistorySnapshot
    } catch (e) {
      return JSON.parse(JSON.stringify(s)) as HistorySnapshot
    }
  }

  push(prev: HistorySnapshot, after: HistorySnapshot) {
    // When a new move is made, push a cloned prev onto past and clear future
    this.past.push(this.cloneSnapshot(prev))
    this.future = []
    // enforce capacity
    this.trimOld(this.capacity)
    // Note: caller will set current state to after.state
  }

  canUndo() {
    return this.past.length > 0
  }

  canRedo() {
    return this.future.length > 0
  }

  undo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canUndo()) return null
    const prev = this.past.pop()!
    // move a clone of current into future to avoid mutation
    this.future.push(this.cloneSnapshot(current))
    return this.cloneSnapshot(prev)
  }

  redo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canRedo()) return null
    const next = this.future.pop()!
    // push a clone of current onto past
    this.past.push(this.cloneSnapshot(current))
    return this.cloneSnapshot(next)
  }

  clear() {
    this.past = []
    this.future = []
  }

  // optional cap support
  trimOld(maxEntries: number) {
    if (this.past.length <= maxEntries) return
    const excess = this.past.length - maxEntries
    this.past.splice(0, excess)
  }

  // Introspection helpers
  hasPast() {
    return this.canUndo()
  }

  hasFuture() {
    return this.canRedo()
  }

  pastLength() {
    return this.past.length
  }

  futureLength() {
    return this.future.length
  }

  setCapacity(n: number) {
    this.capacity = Math.max(0, Math.floor(n))
    this.trimOld(this.capacity)
  }
}
