// Event types for Ultimate Tic-Tac-Toe engine
import { Player, BoardIndex, CellIndex } from './game-types'

export type SmallBoardWonEvent = {
  type: 'SmallBoardWon',
  board: BoardIndex,
  winner: Player
}

export type BigBoardWonEvent = {
  type: 'BigBoardWon',
  winner: Player
}

export type DrawEvent = {
  type: 'Draw'
}

export type FreeMoveActivatedEvent = {
  type: 'FreeMoveActivated'
}

export type CellMarkedEvent = {
  type: 'CellMarked',
  board: BoardIndex,
  cell: CellIndex,
  player: Player
}

export type MoveEvents =
  | SmallBoardWonEvent
  | BigBoardWonEvent
  | DrawEvent
  | FreeMoveActivatedEvent
  | CellMarkedEvent
