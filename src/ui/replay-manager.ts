import { GameState } from '../types/game-types'
import { getLegalMoves } from '../game/legal-moves'
import { evaluateSmall } from '../game/engine'
import { findTwoInRow } from '../game/win-detection'

export type HistoryEntry = {
  state: GameState
  move?: { board: number; cell: number }
  ts: number
  analysis?: {
    forcedBoard: number | null
    legalMoves: { board: number; cell: number }[]
    threatLines?: { board: number; a: number; b: number; target: number }[]
  }
  // optional timer snapshot so replay shows correct timer visuals when scrubbing
  timer?: {
    remainingMs: number | null
    running: boolean
    timeoutMs?: number
  }
}

const STORAGE_KEY = 'sut_history_v1'

export class ReplayManager {
  entries: HistoryEntry[] = []
  index: number | null = null
  playing = false
  speedMs = 700 // ms per step
  private playTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.load()
  }

  push(state: GameState, move?: { board: number; cell: number }, opts?: { timer?: { remainingMs: number | null; running: boolean; timeoutMs?: number } }) {
    // compute lightweight analysis snapshot for instant scrubbing
    const legalMoves = getLegalMoves(state)
    let forcedBoard: number | null = null
    if (state.nextBoardIndex !== null) {
      const nb = state.nextBoardIndex
      const st = evaluateSmall(state.bigBoard[nb]).status
      if (st === 'Open') forcedBoard = nb
    }
    const threatLines: { board: number; a: number; b: number; target: number }[] = []
    for (let sb = 0; sb < 9; sb++) {
      const st = evaluateSmall(state.bigBoard[sb]).status
      if (st !== 'Open') continue
      const found = findTwoInRow(state.bigBoard[sb], state.currentPlayer)
      for (const f of found) threatLines.push({ board: sb, a: f.cells[0], b: f.cells[1], target: f.target })
    }
    const entry: HistoryEntry = { state, move, ts: Date.now(), analysis: { forcedBoard, legalMoves, threatLines }, timer: opts?.timer }
    this.entries.push(entry)
    this.save()
  }

  save() {
    try {
      const serial = JSON.stringify(this.entries)
      localStorage.setItem(STORAGE_KEY, serial)
    } catch (e) {
      // ignore
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[]
        this.entries = parsed
      }
    } catch (e) {
      this.entries = []
    }
  }

  clear() {
    this.entries = []
    this.index = null
    this.save()
  }

  canPrev() {
    if (this.index === null) return this.entries.length > 0
    return this.index > 0
  }
  canNext() {
    if (this.index === null) return this.entries.length > 0
    return this.index < this.entries.length - 1
  }

  prev() {
    if (this.index === null) this.index = this.entries.length - 1
    if (this.index > 0) this.index--
    return this.current()
  }

  jumpTo(idx: number) {
    if (this.entries.length === 0) return this.current()
    const bounded = Math.max(0, Math.min(this.entries.length - 1, idx))
    this.index = bounded
    return this.current()
  }

  next() {
    if (this.index === null) this.index = this.entries.length - 1
    if (this.index < this.entries.length - 1) this.index++
    else {
      // reached end
      this.index = null
    }
    return this.current()
  }

  current() {
    if (this.index === null) return this.entries[this.entries.length - 1]?.state ?? null
    return this.entries[this.index]?.state ?? null
  }

  currentEntry() {
    if (this.index === null) return this.entries[this.entries.length - 1] ?? null
    return this.entries[this.index] ?? null
  }

  play(onStep: (s: GameState | null) => void) {
    if (this.playing) return
    this.playing = true
    const step = () => {
      const nextState = this.next()
      onStep(nextState)
      if (!this.playing) return
      if (this.index === null) {
        // reached end, stop
        this.pause()
        return
      }
      this.playTimer = setTimeout(step, this.speedMs)
    }
    this.playTimer = setTimeout(step, this.speedMs)
  }

  pause() {
    this.playing = false
    if (this.playTimer) {
      clearTimeout(this.playTimer as any)
      this.playTimer = null
    }
  }

  setSpeed(ms: number) {
    this.speedMs = Math.max(50, ms)
    if (this.playing) {
      this.pause()
      // will be restarted by caller if desired
    }
  }
}
