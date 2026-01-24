#!/usr/bin/env ts-node
// Simple headless AI benchmark harness.
// Usage (needs ts-node):
// AI_FORCE_DIRECT=1 ts-node scripts/ai-bench.ts --games 100 --p1 medium --p2 easy

import { chooseMove } from '../src/ai'
import { applyMove } from '../src/game/engine'
import { GameState, Move } from '../src/types/game-types'

function emptyBigBoard(): GameState['bigBoard'] {
  return Array.from({ length: 9 }).map(() => Array.from({ length: 9 }).map(() => null))
}

function makeInitialState(): GameState {
  return { bigBoard: emptyBigBoard(), currentPlayer: 'X', nextBoardIndex: null, winner: null }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

async function runGame(p1: string, p2: string, opts: any = {}) {
  let state = makeInitialState()
  const moves: { player: string; move: Move; elapsedMs: number }[] = []
  let turn = 0
  while (!state.winner) {
    const playerPreset = turn % 2 === 0 ? p1 : p2
    const start = Date.now()
    // wrap in try to ensure we always produce a move
    let mv: Move | null = null
    try {
      mv = await chooseMove(state, { difficulty: playerPreset, timeBudgetMs: opts.timeBudgetMs, seed: opts.seed })
    } catch (e) {
      // fallback to first legal move
      const legal = (require('../src/game/legal-moves') as any).getLegalMoves(state)
      mv = legal[0]
    }
    const elapsed = Date.now() - start
    moves.push({ player: playerPreset, move: mv as Move, elapsedMs: elapsed })
    try {
      const res = applyMove(state, mv as Move)
      state = res.nextState
    } catch (e) {
      // illegal move — abort
      return { error: 'illegal-move', moves }
    }
    turn++
    // safety cap to avoid infinite loops
    if (turn > 200) { break }
  }
  return { winner: state.winner, moves }
}

async function main() {
  const argv = process.argv.slice(2)
  const args: any = { games: 100, p1: 'medium', p2: 'easy', timeBudgetMs: 50 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--games') args.games = Number(argv[++i])
    if (argv[i] === '--p1') args.p1 = argv[++i]
    if (argv[i] === '--p2') args.p2 = argv[++i]
    if (argv[i] === '--time') args.timeBudgetMs = Number(argv[++i])
    if (argv[i] === '--seed') args.seed = argv[++i]
  }

  const results: any[] = []
  for (let g = 0; g < args.games; g++) {
    const r = await runGame(args.p1, args.p2, { timeBudgetMs: args.timeBudgetMs, seed: args.seed })
    results.push(r)
    if ((g + 1) % 10 === 0) process.stdout.write('.')
    await sleep(10)
  }
  console.log('\nDone — writing ai-bench-results.json')
  const fs = require('fs')
  fs.writeFileSync('logs/ai-bench-results.json', JSON.stringify({ args, results }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
