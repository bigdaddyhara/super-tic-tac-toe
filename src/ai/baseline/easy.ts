import { GameState, Move } from "../../types/game-types"
import { getLegalMoves } from "../../game/legal-moves"
import { createSeededRng, pickRandom } from "../rng"
import { ChooseOptions } from "../types"

export async function easyChooseMove(state: GameState, options?: ChooseOptions): Promise<Move> {
  const legal = getLegalMoves(state as any)
  if (!legal || legal.length === 0) throw new Error("No legal moves available")
  const rng = options && options.seed != null ? createSeededRng(options.seed) : Math.random
  return pickRandom(legal, rng as any)
}
