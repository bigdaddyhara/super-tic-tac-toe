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
