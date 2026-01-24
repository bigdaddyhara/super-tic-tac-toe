import { GameState } from "../types/game-types"
import { createSeededRng } from "./rng"

// Lightweight Zobrist-ish hashing + per-worker bounded transposition table.

function makeZobrist(seed?: number) {
  const rng = seed != null ? createSeededRng(seed) : Math.random
  const table: number[] = []
  // 9 boards * 9 cells * 2 players
  for (let i = 0; i < 9 * 9 * 2; i++) table.push(Math.floor(rng() * 0xffffffff))
  // nextBoardIndex sentinel values (null + 0..8)
  for (let i = 0; i < 10; i++) table.push(Math.floor(rng() * 0xffffffff))
  return function hashState(state: GameState): number {
    let h = 2166136261 >>> 0
    const add = (x: number) => {
      h ^= x >>> 0
      h = Math.imul(h, 16777619) >>> 0
    }
    for (let b = 0; b < 9; b++) {
      const small = state.bigBoard[b]
      for (let c = 0; c < 9; c++) {
        const v = small[c]
        if (v === 'X') add(table[(b * 9 + c) * 2 + 0])
        else if (v === 'O') add(table[(b * 9 + c) * 2 + 1])
      }
    }
    const nbi = state.nextBoardIndex == null ? 0 : state.nextBoardIndex + 1
    add(table[9 * 9 * 2 + nbi])
    return h >>> 0
  }
}

export type TTEntry = { value: number; visits: number }

export class TranspositionTable {
  private map: Map<number, TTEntry>
  private maxEntries: number
  private hashFn: (s: GameState) => number

  constructor(maxEntries = 10000, seed?: number) {
    this.map = new Map()
    this.maxEntries = maxEntries
    this.hashFn = makeZobrist(seed)
  }

  get(state: GameState): TTEntry | undefined {
    const h = this.hashFn(state)
    const v = this.map.get(h)
    if (!v) return undefined
    // touch to make it recently used
    this.map.delete(h)
    this.map.set(h, v)
    return v
  }

  set(state: GameState, entry: TTEntry) {
    const h = this.hashFn(state)
    if (this.map.has(h)) this.map.delete(h)
    this.map.set(h, entry)
    // simple LRU eviction by insertion order
    if (this.map.size > this.maxEntries) {
      const firstKey = this.map.keys().next().value
      this.map.delete(firstKey)
    }
  }

  clear() {
    this.map.clear()
  }
}

export default TranspositionTable
