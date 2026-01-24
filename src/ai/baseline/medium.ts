import { GameState, Move } from "../../types/game-types"
import { getLegalMoves } from "../../game/legal-moves"
import { applyMove, evaluateSmall } from "../../game/engine"
import { findTwoInRow } from "../../game/win-detection"
import { createSeededRng } from "../rng"
import { ChooseOptions } from "../types"
import { getHeuristicProfile } from "../policy"

function positionalValue(cellIndex: number) {
  if (cellIndex === 4) return 3 // center
  if (cellIndex === 0 || cellIndex === 2 || cellIndex === 6 || cellIndex === 8) return 2 // corners
  return 1 // edges
}

// Simple heuristic scorer for medium bot. Fast, main-thread, depth-1 lookahead for risky sends.
export async function mediumChooseMove(state: GameState, options?: ChooseOptions): Promise<Move> {
  const legal = getLegalMoves(state as any)
  if (!legal || legal.length === 0) throw new Error("No legal moves available")
  if (legal.length === 1) return legal[0]

  const rng = options && options.seed != null ? createSeededRng(options.seed) : Math.random
  const randomness = options?.randomness ?? 0.05
  const me = state.currentPlayer
  const opp = me === 'X' ? 'O' : 'X'
  const weights = getHeuristicProfile('medium')

  let bestScore = -Infinity
  let bestMoves: Move[] = []

  for (const mv of legal) {
    let score = 0
    // Apply move to get next state
    const res = applyMove(state, mv)
    const ns = res.nextState

    // 1) Immediate big win
    if (ns.winner === me) {
      score += weights.bigWin
    }

    // 2) Immediate local win on the small board
    const smallEval = evaluateSmall(ns.bigBoard[mv.board])
    if (smallEval.status === 'Won' && smallEval.winner === me) score += weights.localWin
    if (smallEval.status === 'Won' && smallEval.winner === opp) score += weights.localLossPenalty

    // 3) Avoid sending opponent to a board where they can win immediately
    const nextBoard = ns.nextBoardIndex
    if (nextBoard !== null) {
      const oppMoves = getLegalMoves(ns as any).filter((x: Move) => x.board === nextBoard)
      for (const om of oppMoves) {
        const r = applyMove(ns, om).nextState
        if (r.winner === opp) {
          score += weights.avoidSendingOpponentWin
          break
        }
      }
    }

    // 4) Force opponent into closed board is good — small benefit
    if (nextBoard !== null) {
      const st = evaluateSmall(ns.bigBoard[nextBoard]).status
      if (st !== 'Open') score += weights.forceClosedBoardBonus
    }

    // 5) Create two-in-a-row threats for me on the moved small board
    try {
      const threats = findTwoInRow(ns.bigBoard[mv.board], me)
      if (threats && threats.length > 0) score += weights.makeThreatBonus * threats.length
    } catch (e) {}

    // 6) Block opponent two-in-a-row on moved board
    try {
      const oppThreats = findTwoInRow(ns.bigBoard[mv.board], opp)
      if (oppThreats && oppThreats.length > 0) score += weights.blockThreatBonus * oppThreats.length
    } catch (e) {}

    // 7) Positional preference (center/corner)
    score += positionalValue(mv.cell) * weights.positionalMultiplier

    // 8) Mobility: prefer moves that leave more legal moves for me
    const myFutureMoves = getLegalMoves(ns as any).filter((x: Move) => x)
    score += Math.min(10, myFutureMoves.length) * weights.mobilityMultiplier

    // tie-breaker randomness
    score += (rng() * 2 - 1) * randomness

    if (score > bestScore) {
      bestScore = score
      bestMoves = [mv]
    } else if (score === bestScore) {
      bestMoves.push(mv)
    }
  }

  // pick among bestMoves using rng
  const idx = Math.floor((rng() as any) * bestMoves.length)
  return bestMoves[idx]
}

// Expose a fast, synchronous move scoring helper for use by MCTS (ordering, rollouts)
export function scoreMove(state: GameState, mv: Move, seedOrRng?: number | (() => number), options?: {randomness?: number}): number {
  const rng = typeof seedOrRng === 'number' ? createSeededRng(seedOrRng) : (typeof seedOrRng === 'function' ? seedOrRng : Math.random)
  const randomness = options?.randomness ?? 0.05
  const me = state.currentPlayer
  const opp = me === 'X' ? 'O' : 'X'
  const weights = getHeuristicProfile('medium')

  let score = 0
  const res = applyMove(state, mv)
  const ns = res.nextState

  if (ns.winner === me) score += weights.bigWin

  const smallEval = evaluateSmall(ns.bigBoard[mv.board])
  if (smallEval.status === 'Won' && smallEval.winner === me) score += weights.localWin
  if (smallEval.status === 'Won' && smallEval.winner === opp) score += weights.localLossPenalty

  const nextBoard = ns.nextBoardIndex
  if (nextBoard !== null) {
    const oppMoves = getLegalMoves(ns as any).filter((x: Move) => x.board === nextBoard)
    for (const om of oppMoves) {
      const r = applyMove(ns, om).nextState
      if (r.winner === opp) {
        score += weights.avoidSendingOpponentWin
        break
      }
    }
  }

  if (nextBoard !== null) {
    const st = evaluateSmall(ns.bigBoard[nextBoard]).status
    if (st !== 'Open') score += weights.forceClosedBoardBonus
  }

  try {
    const threats = findTwoInRow(ns.bigBoard[mv.board], me)
    if (threats && threats.length > 0) score += weights.makeThreatBonus * threats.length
  } catch (e) {}

  try {
    const oppThreats = findTwoInRow(ns.bigBoard[mv.board], opp)
    if (oppThreats && oppThreats.length > 0) score += weights.blockThreatBonus * oppThreats.length
  } catch (e) {}

  score += positionalValue(mv.cell) * weights.positionalMultiplier

  const myFutureMoves = getLegalMoves(ns as any).filter((x: Move) => x)
  score += Math.min(10, myFutureMoves.length) * weights.mobilityMultiplier

  score += (rng() * 2 - 1) * randomness

  return score
}
