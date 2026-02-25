/**
 * Logging and debugging utilities for property-based testing.
 * Provides pretty-printing, failure capture, and state visualization.
 */

import * as fs from 'fs'
import * as path from 'path'
import { GameState, Move, Player, SmallBoard } from '../../src/types/game-types'
import { evaluateSmall } from '../../src/game/engine'
import { FAILURES_DIR } from './config'

/**
 * Failure artifact stored as JSON when a property test fails.
 */
export interface FailureArtifact {
  testName: string
  timestamp: string
  seed: number
  path: string
  shrunkSequenceLength: number
  initialState: GameState
  moveSequence: Move[]
  stateHistory: GameState[]
  failingStepIndex: number
  failingMove: Move | null
  stateBefore: GameState
  stateAfter: GameState | null
  invariantName: string
  errorMessage: string
  stackTrace: string
}

/**
 * Pretty-print a single small board (3x3 grid).
 */
function prettyPrintSmallBoard(cells: SmallBoard): string {
  const lines: string[] = []
  for (let row = 0; row < 3; row++) {
    const r = cells.slice(row * 3, row * 3 + 3).map(c => c || '·')
    lines.push(r.join(' '))
  }
  return lines.join('\n')
}

/**
 * Pretty-print the entire game state with big board, small boards, and meta-grid.
 */
export function prettyPrint(state: GameState): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push(`Current Player: ${state.currentPlayer}`)
  lines.push(`Next Board Index: ${state.nextBoardIndex === null ? 'FREE' : state.nextBoardIndex}`)
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
  
  // Display big board as 3x3 grid of small boards
  lines.push('Big Board (9 small boards):')
  lines.push('')
  
  for (let bigRow = 0; bigRow < 3; bigRow++) {
    // For each row of small boards, print 3 rows of cells
    const boardRows: string[][] = [[], [], []]
    
    for (let bigCol = 0; bigCol < 3; bigCol++) {
      const boardIdx = bigRow * 3 + bigCol
      const board = state.bigBoard[boardIdx]
      const { status, winner } = evaluateSmall(board)
      
      // Header showing board index and status
      const header = `[${boardIdx}:${status.slice(0, 1)}${winner ? winner : ''}]`
      
      // Print each row of the small board
      for (let smallRow = 0; smallRow < 3; smallRow++) {
        const cells = board.slice(smallRow * 3, smallRow * 3 + 3)
        const cellStr = cells.map(c => c || '·').join(' ')
        if (smallRow === 0) {
          boardRows[smallRow].push(`${header} ${cellStr}`)
        } else {
          boardRows[smallRow].push(`      ${cellStr}`)
        }
      }
    }
    
    // Print the 3 rows of this big board row
    for (const row of boardRows) {
      lines.push('  ' + row.join('  |  '))
    }
    
    if (bigRow < 2) {
      lines.push('  ' + '-'.repeat(55))
    }
  }
  
  lines.push('')
  lines.push('Legend: [BoardIndex:Status] (O=Open, W=Won, D=Draw)')
  lines.push('='.repeat(60))
  
  return lines.join('\n')
}

/**
 * Pretty-print a move sequence as compact notation.
 */
export function prettyPrintMoveSequence(moves: Move[]): string {
  return moves.map((m, i) => `${i + 1}. B${m.board}C${m.cell}`).join(', ')
}

/**
 * Count cells by player in a game state.
 */
export function countCells(state: GameState, player: Player | null): number {
  let count = 0
  for (const board of state.bigBoard) {
    for (const cell of board) {
      if (cell === player) count++
    }
  }
  return count
}

/**
 * Count occupied cells (X or O) in a game state.
 */
export function countOccupied(state: GameState): number {
  return countCells(state, 'X') + countCells(state, 'O')
}

/**
 * Count empty cells in a game state.
 */
export function countEmpty(state: GameState): number {
  return countCells(state, null)
}

/**
 * Find cells that changed between two states.
 */
export function findChangedCells(before: GameState, after: GameState): Array<{ board: number, cell: number, before: Player | null, after: Player | null }> {
  const changes: Array<{ board: number, cell: number, before: Player | null, after: Player | null }> = []
  
  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      const beforeCell = before.bigBoard[b][c]
      const afterCell = after.bigBoard[b][c]
      if (beforeCell !== afterCell) {
        changes.push({ board: b, cell: c, before: beforeCell, after: afterCell })
      }
    }
  }
  
  return changes
}

/**
 * Capture a failure artifact to disk for later replay and debugging.
 */
export function captureFailure(artifact: FailureArtifact): void {
  // Ensure failures directory exists
  if (!fs.existsSync(FAILURES_DIR)) {
    fs.mkdirSync(FAILURES_DIR, { recursive: true })
  }
  
  // Sanitize test name for filename
  const sanitized = artifact.testName.replace(/[^a-zA-Z0-9-]/g, '_')
  const filename = `${sanitized}-seed-${artifact.seed}.json`
  const filepath = path.join(FAILURES_DIR, filename)
  
  // Write JSON artifact
  fs.writeFileSync(filepath, JSON.stringify(artifact, null, 2), 'utf-8')
  
  console.error('\n' + '!'.repeat(60))
  console.error('PROPERTY TEST FAILURE CAPTURED')
  console.error('!'.repeat(60))
  console.error(`Test: ${artifact.testName}`)
  console.error(`Seed: ${artifact.seed}`)
  console.error(`Path: ${artifact.path}`)
  console.error(`Invariant: ${artifact.invariantName}`)
  console.error(`Error: ${artifact.errorMessage}`)
  console.error(`Artifact saved to: ${filepath}`)
  console.error('!'.repeat(60))
  console.error('\nState before failure:')
  console.error(prettyPrint(artifact.stateBefore))
  
  if (artifact.stateAfter) {
    console.error('\nState after failure:')
    console.error(prettyPrint(artifact.stateAfter))
  }
  
  console.error('\nMove sequence:')
  console.error(prettyPrintMoveSequence(artifact.moveSequence))
  console.error('')
}

/**
 * Load a failure artifact from disk for replay.
 */
export function loadFailure(filepath: string): FailureArtifact {
  const content = fs.readFileSync(filepath, 'utf-8')
  return JSON.parse(content) as FailureArtifact
}
