import { GameState } from '../types/game-types'

export type TimerSnapshot = { remainingMs: number | null; running: boolean; timeoutMs?: number }
export type HistorySnapshot = {
  state: GameState
  move?: { board: number; cell: number }
  ts: number
  timer?: TimerSnapshot
}

export class HistoryManager {
  private past: HistorySnapshot[] = []
  private future: HistorySnapshot[] = []
  // current snapshot is not stored here; caller holds current `gameState`

  push(prev: HistorySnapshot, after: HistorySnapshot) {
    // When a new move is made, push prev onto past, clear future
    this.past.push(prev)
    this.future = []
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
    // move current into future
    this.future.push(current)
    return prev
  }

  redo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canRedo()) return null
    const next = this.future.pop()!
    // push current onto past
    this.past.push(current)
    return next
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
}
