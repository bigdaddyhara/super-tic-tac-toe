import { Move, GameState } from '../types/game-types'
import { applyMove, evaluateSmall } from '../game/engine'
import { findTwoInRow } from '../game/win-detection'

type Explanation = { score?: number; reasons?: string[]; simulatedState?: any } | null

const cache = new Map<string, Explanation>()
let worker: Worker | null = null
const pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>()

function keyFor(state: GameState, board: number, cell: number) {
  // simple cache key: JSON of state + move coordinates (acceptable tradeoff)
  return JSON.stringify({ s: state, b: board, c: cell })
}

function explainSync(state: GameState, mv: Move): Explanation {
  try {
    const res = applyMove(state, mv)
    const ns = res.nextState
    const reasons: string[] = []
    let score = 0
    if (ns.winner === state.currentPlayer) {
      score += 10000
      reasons.push('Wins the game')
    }
    const smallEval = evaluateSmall(ns.bigBoard[mv.board])
    if (smallEval.status === 'Won' && smallEval.winner === state.currentPlayer) {
      score += 500
      reasons.push('Takes local small board')
    }
    try {
      const threats = findTwoInRow(ns.bigBoard[mv.board], state.currentPlayer)
      if (threats && threats.length > 0) reasons.push(`Creates ${threats.length} local threat(s)`)
    } catch (e) {}
    return { score, reasons, simulatedState: ns }
  } catch (e) {
    return null
  }
}

import { getWorkerPool } from './worker-pool'

function ensureWorker() {
  if (worker) return worker
  if (typeof Worker === 'undefined') return null
  const pool = getWorkerPool('./explain.worker.ts')
  if (!pool) return null
  // return the pool object which has run/terminate (we reuse variable name worker for truthiness)
  worker = pool as unknown as Worker
  return worker
}

export async function explainMoves(state: GameState, moves: Move[]): Promise<{ board: number; cell: number; explanation: Explanation }[]> {
  const results: { board: number; cell: number; explanation: Explanation }[] = []
  const toAsk: Move[] = []
  const wantIndexes: number[] = []
  for (let i = 0; i < moves.length; i++) {
    const mv = moves[i]
    const k = keyFor(state, mv.board, mv.cell)
    const cached = cache.get(k)
    if (cached !== undefined) {
      results.push({ board: mv.board, cell: mv.cell, explanation: cached })
    } else {
      toAsk.push(mv)
      wantIndexes.push(i)
      results.push({ board: mv.board, cell: mv.cell, explanation: null })
    }
  }

  if (toAsk.length === 0) return results

  // Try worker first in browser
  const w = ensureWorker()
  if (!w) {
    // fallback sync compute
    for (const mv of toAsk) {
      const exp = explainSync(state, mv)
      const k = keyFor(state, mv.board, mv.cell)
      cache.set(k, exp)
    }
    // rebuild results with cached entries
    return results.map(r => ({ ...r, explanation: cache.get(keyFor(state, r.board, r.cell)) ?? null }))
  }
  // Use pool.run to dispatch task; pool will add id
  const pool = getWorkerPool('./explain.worker.ts')
  if (!pool) {
    // defensive fallback
    for (const mv of toAsk) {
      const exp = explainSync(state, mv)
      const k = keyFor(state, mv.board, mv.cell)
      cache.set(k, exp)
    }
    return results.map(r => ({ ...r, explanation: cache.get(keyFor(state, r.board, r.cell)) ?? null }))
  }

  try {
    const resp = await (pool as any).run({ state, moves: toAsk })
    const arr = resp && resp.results ? resp.results : resp
    if (Array.isArray(arr)) {
      for (const r of arr) {
        const k = keyFor(state, r.board, r.cell)
        cache.set(k, r.explanation)
      }
      // Notify UI that cache was updated (best-effort)
      try {
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai:explain-cache-updated', { detail: { count: arr.length } }))
        }
      } catch (e) {}
    }
  } catch (e) {
    // ignore worker errors; leave cache untouched
  }

  return results.map(r => ({ ...r, explanation: cache.get(keyFor(state, r.board, r.cell)) ?? null }))
}

export async function explainMove(state: GameState, mv: Move): Promise<Explanation> {
  const k = keyFor(state, mv.board, mv.cell)
  const cached = cache.get(k)
  if (cached !== undefined) return cached
  const arr = await explainMoves(state, [mv])
  return arr[0].explanation
}

export function clearExplainCache() { cache.clear() }

export function getCachedExplanation(state: GameState, mv: Move): Explanation | undefined {
  const k = keyFor(state, mv.board, mv.cell)
  return cache.get(k)
}

export function cacheSize() { return cache.size }
