import { GameState } from '../types/game-types'

export interface GameSnapshot {
  version: 1
  timestamp: number
  state: GameState
}

export interface HistoryState {
  past: GameSnapshot[]
  present: GameSnapshot
  future: GameSnapshot[]
}

export class HistoryManager {
  static STORAGE_KEY = 'uttt-history'

  private history: HistoryState

  constructor(initialState: GameState) {
    this.history = {
      past: [],
      present: this.createSnapshot(initialState),
      future: [],
    }
  }

  push(newState: GameState): void {
    this.history.past.push(this.history.present)
    this.history.present = this.createSnapshot(newState)
    this.history.future = []
    this.trimPastToMax()
    this.persist()
  }

  canUndo(): boolean {
    return this.history.past.length > 0
  }

  canRedo(): boolean {
    return this.history.future.length > 0
  }

  undo(): GameState | null {
    if (!this.canUndo()) return null

    this.history.future.unshift(this.history.present)
    this.history.present = this.history.past.pop()!
    this.persist()
    return this.history.present.state
  }

  redo(): GameState | null {
    if (!this.canRedo()) return null

    this.history.past.push(this.history.present)
    this.history.present = this.history.future.shift()!
    this.trimPastToMax()
    this.persist()
    return this.history.present.state
  }

  getPresent(): GameState {
    return this.history.present.state
  }

  getAll(): GameSnapshot[] {
    return [...this.history.past, this.history.present, ...this.history.future]
  }

  reset(initialState: GameState): void {
    this.history = {
      past: [],
      present: this.createSnapshot(initialState),
      future: [],
    }
    this.persist()
  }

  getState(): HistoryState {
    return this.history
  }

  private createSnapshot(state: GameState): GameSnapshot {
    return {
      version: 1,
      timestamp: Date.now(),
      state,
    }
  }

  private trimPastToMax(): void {
    if (this.history.past.length > 200) {
      this.history.past.splice(0, this.history.past.length - 200)
    }
  }

  private persist(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(HistoryManager.STORAGE_KEY, JSON.stringify(this.history))
    } catch {
      // ignore persistence errors
    }
  }

  static load(): HistoryManager | null {
    try {
      if (typeof localStorage === 'undefined') return null

      const raw = localStorage.getItem(HistoryManager.STORAGE_KEY)
      if (!raw) return null

      const parsed = JSON.parse(raw) as unknown
      if (!HistoryManager.isValidHistoryState(parsed)) {
        localStorage.removeItem(HistoryManager.STORAGE_KEY)
        return null
      }

      const manager = new HistoryManager(parsed.present.state)
      manager.history = parsed
      return manager
    } catch {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(HistoryManager.STORAGE_KEY)
        }
      } catch {
        // ignore cleanup errors
      }
      return null
    }
  }

  private static isValidHistoryState(value: unknown): value is HistoryState {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<HistoryState>
    if (!Array.isArray(candidate.past) || !Array.isArray(candidate.future)) return false
    if (!HistoryManager.isValidSnapshot(candidate.present)) return false
    return candidate.past.every(HistoryManager.isValidSnapshot) && candidate.future.every(HistoryManager.isValidSnapshot)
  }

  private static isValidSnapshot(value: unknown): value is GameSnapshot {
    if (!value || typeof value !== 'object') return false
    const snapshot = value as Partial<GameSnapshot>
    if (snapshot.version !== 1) return false
    if (typeof snapshot.timestamp !== 'number' || !Number.isFinite(snapshot.timestamp)) return false
    if (!snapshot.state || typeof snapshot.state !== 'object') return false
    return true
  }
}
