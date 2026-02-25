import { MoveEvents } from '../types/events'
import { GameState } from '../types/game-types'

export interface EventProcessorHooks {
  onSmallBoardWon?: (board: number, winner: 'X' | 'O') => void
  onBigBoardWon?: (winner: 'X' | 'O', newState: GameState) => void
  onDraw?: (newState: GameState) => void
}

export function processEvents(events: MoveEvents[], newState: GameState, hooks: EventProcessorHooks = {}): void {
  void newState

  for (const event of events) {
    switch (event.type) {
      case 'CellMarked':
        break
      case 'SmallBoardWon':
        hooks.onSmallBoardWon?.(event.board, event.winner)
        console.log(`Board ${event.board} won by ${event.winner}`)
        break
      case 'BigBoardWon':
        hooks.onBigBoardWon?.(event.winner, newState)
        console.log(`Game won by ${event.winner}`)
        break
      case 'Draw':
        hooks.onDraw?.(newState)
        console.log('Game draw')
        break
      case 'FreeMoveActivated':
        console.log('Free move active')
        break
      default:
        break
    }
  }
}
