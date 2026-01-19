import { GameState } from '../types/game-types'

export class DOMRenderer {
  private root: HTMLElement
  private state: GameState

  constructor(root: HTMLElement, state: GameState) {
    this.root = root
    this.state = state
  }

  render() {
    this.root.innerHTML = ''
    const board = document.createElement('div')
    board.className = 'board-grid'
    board.style.gridTemplateColumns = 'repeat(3, 240px)'
    for (let i = 0; i < 9; i++) {
      const sb = document.createElement('div')
      sb.className = 'small-board panel'
      sb.dataset.index = String(i)
      sb.style.display = 'grid'
      sb.style.gridTemplateColumns = 'repeat(3, 1fr)'
      sb.style.width = '240px'
      sb.style.height = '240px'
      sb.style.background = '#071225'
      sb.style.padding = '6px'
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('button')
        cell.className = 'cell'
        cell.dataset.small = String(i)
        cell.dataset.cell = String(c)
        cell.style.border = '1px solid rgba(255,255,255,0.06)'
        cell.style.background = 'transparent'
        cell.style.color = 'white'
        cell.style.fontSize = '36px'
        cell.style.display = 'flex'
        cell.style.alignItems = 'center'
        cell.style.justifyContent = 'center'
        const val = this.state.bigBoard[i][c]
        cell.textContent = val ? val : ''
        sb.appendChild(cell)
      }
      board.appendChild(sb)
    }
    this.root.appendChild(board)
  }

  update(state: GameState) {
    this.state = state
    this.render()
  }
}
