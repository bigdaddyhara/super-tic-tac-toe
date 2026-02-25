/**
 * Trace formatting and diagnostics for stateful model-based testing.
 *
 * Responsibilities:
 * - Pretty-print command traces
 * - Convert game state to human-readable strings
 * - State diffing for failure diagnostics
 * - Trace step formatting
 */

import { GameState, Move, Player } from '../../src/types/game-types'
import { evaluateSmall } from '../../src/game/engine'
import { ConstraintState, TraceGameStatus } from './types'

/**
 * TraceStep interface (re-export for commands.ts).
 */
export interface TraceStep {
  stepIndex: number
  commandName: 'PlayLegalMove' | 'AttemptIllegalMove' | 'ResetGame'
  moveAttempted: Move | null
  constraintBefore: ConstraintState
  constraintAfter: ConstraintState
  playerBefore: Player
  playerAfter: Player
  statusBefore: TraceGameStatus
  statusAfter: TraceGameStatus
  legalMovesAfter: number
  errorThrown: string | null
  agreementsOk: boolean
}

/**
 * Convert GameState to TraceGameStatus.
 */
export function gameStatusFromState(state: GameState): TraceGameStatus {
  if (state.winner === 'X') return 'WIN_X'
  if (state.winner === 'O') return 'WIN_O'
  if (state.winner === 'Draw') return 'DRAW'
  return 'ONGOING'
}

/**
 * Pretty-print a single trace step.
 */
export function prettyPrintTraceStep(step: TraceStep): string {
  const move = step.moveAttempted
    ? `B${step.moveAttempted.board}C${step.moveAttempted.cell}`
    : 'N/A'
  const constraint = formatConstraint(step.constraintBefore, step.constraintAfter)
  const status =
    step.statusBefore === step.statusAfter
      ? step.statusBefore
      : `${step.statusBefore} → ${step.statusAfter}`
  const error = step.errorThrown ? ` ✗ Error: ${step.errorThrown}` : ''
  const ok = step.agreementsOk ? '✓' : '✗'

  return `[Step ${step.stepIndex}] ${step.commandName}(${move})
  Constraint: ${constraint}
  Player: ${step.playerBefore} → ${step.playerAfter}
  Status: ${status}
  Legal moves after: ${step.legalMovesAfter}
  ${ok} Agreements${error}`
}

/**
 * Format constraint change.
 */
function formatConstraint(before: ConstraintState, after: ConstraintState): string {
  const b =
    before.type === 'FORCED' ? `FORCED(B${before.forcedBoardId})` : 'FREE'
  const a = after.type === 'FORCED' ? `FORCED(B${after.forcedBoardId})` : 'FREE'
  return b === a ? b : `${b} → ${a}`
}

/**
 * Pretty-print full trace (all steps).
 */
export function prettyPrintTrace(trace: TraceStep[], title?: string): string {
  const lines: string[] = []
  lines.push('═'.repeat(70))
  if (title) {
    lines.push(title)
    lines.push('═'.repeat(70))
  } else {
    lines.push('STATEFUL TEST TRACE: Ultimate Tic-Tac-Toe Model-Based Testing')
    lines.push('═'.repeat(70))
  }
  lines.push(`Sequence Length: ${trace.length}`)
  lines.push('')

  for (const step of trace) {
    lines.push(prettyPrintTraceStep(step))
    lines.push('')
  }

  lines.push('═'.repeat(70))
  return lines.join('\n')
}

/**
 * Pretty-print a game state.
 */
export function prettyPrintState(state: GameState): string {
  const lines: string[] = []

  lines.push('─'.repeat(50))
  lines.push(`Current Player: ${state.currentPlayer}`)
  lines.push(
    `Next Board Index: ${state.nextBoardIndex === null ? 'FREE' : state.nextBoardIndex}`,
  )
  lines.push(`Game Winner: ${state.winner || 'None (Ongoing)'}`)
  lines.push('')

  // Count cells
  let xCount = 0
  let oCount = 0
  let emptyCount = 0
  for (const board of state.bigBoard) {
    for (const cell of board) {
      if (cell === 'X') xCount++
      else if (cell === 'O') oCount++
      else emptyCount++
    }
  }
  lines.push(`Cell counts: X=${xCount}, O=${oCount}, Empty=${emptyCount}`)
  lines.push('')

  // Display big board as 3x3 grid of small boards (compact)
  lines.push('Big Board:')
  for (let bigRow = 0; bigRow < 3; bigRow++) {
    const boardIndices: string[] = []
    const row1: string[] = []
    const row2: string[] = []
    const row3: string[] = []

    for (let bigCol = 0; bigCol < 3; bigCol++) {
      const boardIdx = bigRow * 3 + bigCol
      const board = state.bigBoard[boardIdx]
      const { status, winner } = evaluateSmall(board)

      const statusStr = status === 'Open' ? 'O' : status === 'Won' ? winner : 'D'
      boardIndices.push(`[${boardIdx}:${statusStr}]`)

      for (let smallRow = 0; smallRow < 3; smallRow++) {
        const cells = board.slice(smallRow * 3, smallRow * 3 + 3)
        const cellStr = cells.map(c => c || '·').join(' ')
        if (smallRow === 0) row1.push(cellStr)
        else if (smallRow === 1) row2.push(cellStr)
        else row3.push(cellStr)
      }
    }

    lines.push(`  ${boardIndices.join('  ')}`)
    lines.push(`  ${row1.join('  |  ')}`)
    lines.push(`  ${row2.join('  |  ')}`)
    lines.push(`  ${row3.join('  |  ')}`)
    if (bigRow < 2) lines.push(`  ${'─'.repeat(30)}`)
  }

  lines.push('─'.repeat(50))
  return lines.join('\n')
}

/**
 * Diff two states (highlight differences).
 */
export function diffStates(
  before: GameState,
  after: GameState,
  label?: string,
): string {
  const lines: string[] = []

  lines.push('═'.repeat(70))
  if (label) lines.push(`STATE DIFF: ${label}`)
  else lines.push('STATE DIFF')
  lines.push('═'.repeat(70))

  // Diff currentPlayer
  if (before.currentPlayer !== after.currentPlayer) {
    lines.push(
      `✗ currentPlayer: ${before.currentPlayer} → ${after.currentPlayer}`,
    )
  }

  // Diff nextBoardIndex
  if (before.nextBoardIndex !== after.nextBoardIndex) {
    lines.push(
      `✗ nextBoardIndex: ${before.nextBoardIndex} → ${after.nextBoardIndex}`,
    )
  }

  // Diff winner
  if (before.winner !== after.winner) {
    lines.push(`✗ winner: ${before.winner} → ${after.winner}`)
  }

  // Diff bigBoard (find changed cells)
  const changedCells: { board: number; cell: number; was: any; now: any }[] = []
  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      if (before.bigBoard[b][c] !== after.bigBoard[b][c]) {
        changedCells.push({
          board: b,
          cell: c,
          was: before.bigBoard[b][c] || 'null',
          now: after.bigBoard[b][c] || 'null',
        })
      }
    }
  }

  if (changedCells.length > 0) {
    lines.push(`✗ Changed cells (${changedCells.length}):`)
    for (const { board, cell, was, now } of changedCells) {
      lines.push(`    B${board}C${cell}: ${was} → ${now}`)
    }
  }

  if (
    before.currentPlayer === after.currentPlayer &&
    before.nextBoardIndex === after.nextBoardIndex &&
    before.winner === after.winner &&
    changedCells.length === 0
  ) {
    lines.push('✓ States are identical')
  }

  lines.push('═'.repeat(70))
  return lines.join('\n')
}

/**
 * Format a move sequence as compact notation (e.g., "B0C4, B4C2, B2C1").
 */
export function formatMoveSequence(moves: Move[]): string {
  return moves.map(m => `B${m.board}C${m.cell}`).join(', ')
}
