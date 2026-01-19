import { GameState } from '../types/game-types'

export function createBoardElement(state: GameState) {
  const container = document.createElement('div')
  container.className = 'board-grid'
  return container
}
