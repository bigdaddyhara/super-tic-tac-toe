import { GameState } from "../types/game-types";

export type SerializedState = {
  version: number;
  bigBoard: ("X" | "O" | null)[][];
  currentPlayer: "X" | "O";
  nextBoardIndex: number | null;
  winner: "X" | "O" | "Draw" | "Ongoing";
  turnCount?: number;
};

export function serializeState(s: GameState): SerializedState {
  return {
    version: 1,
    bigBoard: s.bigBoard.map((b) => b.slice()),
    currentPlayer: s.currentPlayer,
    nextBoardIndex: s.nextBoardIndex,
    winner: s.winner,
    turnCount: (s as any).turnCount ?? undefined,
  };
}

export function deserializeState(obj: any): GameState {
  // assume obj conforms to SerializedState
  return {
    bigBoard: (obj.bigBoard as any).map((b: any) => b.slice()),
    currentPlayer: obj.currentPlayer,
    nextBoardIndex: obj.nextBoardIndex,
    winner: obj.winner,
    // preserve other fields if present
    bigWinner: (obj as any).bigWinner ?? undefined,
  } as unknown as GameState;
}

// Produce a short stable id for a game state (hex string). Uses JSON of the
// SerializedState and a simple FNV-1a hash to keep ids compact and deterministic.
export function stateIdFromState(s: GameState): string {
  const ss = serializeState(s)
  const str = JSON.stringify(ss)
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  // return 8-char hex
  return (h >>> 0).toString(16).padStart(8, '0')
}
