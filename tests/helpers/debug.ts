/**
 * Debugging aids for Ultimate Tic-Tac-Toe engine tests.
 *
 * prettyPrint  — deterministic text representation of a GameState
 * stateDiff    — shows only fields that changed between two states
 * captureFailure — formatted failure report for playSequence errors
 */

import { GameState, Move, Player, SmallBoard } from '../../src/types/game-types'
import { evaluateSmall } from '../../src/game/engine'

// ─── prettyPrint ─────────────────────────────────────────────────

/**
 * Produces a deterministic text representation of a GameState.
 *
 * Format:
 *   Player to move : X
 *   Next board     : 4  ("any" if null)
 *   Game winner    : none
 *   META BOARD (small-board winners)
 *   BOARD 0 [Open]  BOARD 1 [Open]  ...
 *     .  .  .         .  .  .
 */
export function prettyPrint(state: GameState): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════')
  lines.push(`Player to move : ${state.currentPlayer}`)
  lines.push(`Next board     : ${state.nextBoardIndex !== null ? state.nextBoardIndex : 'any'}` +
    (state.nextBoardIndex !== null ? ` [FORCED]` : ''))
  lines.push(`Game winner    : ${state.winner ?? 'none'}`)
  lines.push('───────────────────────────────────────────────────────')

  // Meta board (small-board winners)
  const statuses = state.bigBoard.map(b => evaluateSmall(b))
  const metaCells = statuses.map(s => s.winner ?? '.')
  lines.push('META BOARD (small-board winners)')
  for (let row = 0; row < 3; row++) {
    const cells = metaCells.slice(row * 3, row * 3 + 3)
    lines.push(`  ${cells[0]}  |  ${cells[1]}  |  ${cells[2]}`)
    if (row < 2) lines.push('-----+-----+-----')
  }
  lines.push('───────────────────────────────────────────────────────')

  // Small boards in rows of 3
  for (let bRow = 0; bRow < 3; bRow++) {
    // Header line
    const headers: string[] = []
    for (let bCol = 0; bCol < 3; bCol++) {
      const bi = bRow * 3 + bCol
      const st = statuses[bi]
      let label = st.status === 'Won' ? `Won:${st.winner}` : st.status
      if (state.nextBoardIndex === bi) label += ' FORCED'
      headers.push(`BOARD ${bi} [${label}]`.padEnd(18))
    }
    lines.push(headers.join('  '))

    // 3 cell rows
    for (let cRow = 0; cRow < 3; cRow++) {
      const rowParts: string[] = []
      for (let bCol = 0; bCol < 3; bCol++) {
        const bi = bRow * 3 + bCol
        const cells = state.bigBoard[bi]
        const c0 = cells[cRow * 3 + 0] ?? '.'
        const c1 = cells[cRow * 3 + 1] ?? '.'
        const c2 = cells[cRow * 3 + 2] ?? '.'
        rowParts.push(`  ${c0}  ${c1}  ${c2}`.padEnd(18))
      }
      lines.push(rowParts.join('  '))
    }
    lines.push('')
  }

  lines.push('═══════════════════════════════════════════════════════')
  return lines.join('\n')
}

// ─── stateDiff ───────────────────────────────────────────────────

/**
 * Renders only the fields that changed between two states.
 */
export function stateDiff(before: GameState, after: GameState): string {
  const lines: string[] = ['DIFF (before → after):']

  // currentPlayer
  if (before.currentPlayer !== after.currentPlayer) {
    lines.push(`  currentPlayer  : ${before.currentPlayer} → ${after.currentPlayer}`)
  }

  // nextBoardIndex
  const nb = (v: number | null) => v !== null ? String(v) : 'null'
  if (before.nextBoardIndex !== after.nextBoardIndex) {
    lines.push(`  nextBoardIndex : ${nb(before.nextBoardIndex)} → ${nb(after.nextBoardIndex)}`)
  }

  // winner
  if (before.winner !== after.winner) {
    lines.push(`  winner         : ${before.winner ?? 'null'} → ${after.winner ?? 'null'}`)
  }

  // bigBoard cell-by-cell
  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      const bv = before.bigBoard[b]?.[c] ?? null
      const av = after.bigBoard[b]?.[c] ?? null
      if (bv !== av) {
        lines.push(`  bigBoard[${b}][${c}] : ${bv ?? 'null'} → ${av ?? 'null'}`)
      }
    }
  }

  // Small board status changes
  for (let b = 0; b < 9; b++) {
    const bEv = evaluateSmall(before.bigBoard[b])
    const aEv = evaluateSmall(after.bigBoard[b])
    if (bEv.status !== aEv.status || bEv.winner !== aEv.winner) {
      lines.push(`  smallStatus[${b}] : ${bEv.status}${bEv.winner ? `(${bEv.winner})` : ''} → ${aEv.status}${aEv.winner ? `(${aEv.winner})` : ''}`)
    }
  }

  if (lines.length === 1) {
    lines.push('  (no changes)')
  }

  return lines.join('\n')
}

// ─── captureFailure ──────────────────────────────────────────────

/**
 * Returns a formatted string for a failure at a specific move index.
 */
export function captureFailure(moveIndex: number, preMoveState: GameState, move: Move, error?: Error): string {
  const parts: string[] = [
    `Failure at move index #${moveIndex}: { board: ${move.board}, cell: ${move.cell} }`,
  ]
  if (error) {
    parts.push(`Error: ${error.constructor.name} — ${error.message}`)
  }
  parts.push('')
  parts.push('Pre-move state:')
  parts.push(prettyPrint(preMoveState))
  return parts.join('\n')
}
