export type Player = 'X' | 'O'

export type Cell = Player | null

export type SmallBoard = Cell[] // length 9

export type BigBoard = SmallBoard[] // length 9

export interface GameState {
  bigBoard: BigBoard
  currentPlayer: Player
  nextBoardIndex: number | null // forced small-board index (0-8) or null for any
  winner: Player | null
}

export type CellIndex = number // 0..8
export type BoardIndex = number // 0..8

export type SmallBoardStatus = 'Open' | 'Won' | 'Draw'
export type GameStatus = 'Ongoing' | Player | 'Draw'

export interface SmallBoardState {
  cells: SmallBoard
  status: SmallBoardStatus
  winner: Player | null
}

export interface BigBoardState {
  boards: SmallBoardState[] // length 9
}
