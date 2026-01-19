import { Player, SmallBoard, BigBoard } from '../types/game-types'

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

export function checkSmallWin(board: SmallBoard): Player | null {
  for (const [a,b,c] of LINES) {
    const v = board[a]
    if (v && v === board[b] && v === board[c]) return v
  }
  return null
}

export function checkBigWin(big: BigBoard): Player | null {
  // map each small board to its winner (or null)
  const winners = big.map(b => checkSmallWin(b))
  for (const [a,b,c] of LINES) {
    const v = winners[a]
    if (v && v === winners[b] && v === winners[c]) return v
  }
  return null
}
