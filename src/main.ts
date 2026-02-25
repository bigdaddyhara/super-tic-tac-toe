import './style.css'
import { GameController } from './ui/game-controller'
import { initKeyboardShortcuts, wireHistoryButtons } from './ui/replay-controls'
import { HUD } from './ui/hud'
import { EndgameOverlay } from './ui/endgame-overlay'
import { initSettingsPanel } from './ui/settings-panel'

declare global {
  interface Window {
    controller: GameController
  }
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
const controller = new GameController(canvas)

const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null
const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null
const newGameBtn = document.getElementById('new-game-btn') as HTMLButtonElement | null
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement | null
const settingsPanel = document.getElementById('settings-panel') as HTMLElement | null

const overlayEl = document.getElementById('endgame-overlay') as HTMLElement | null
const messageEl = document.getElementById('endgame-message') as HTMLElement | null
const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement | null

const hud = new HUD(controller)
controller.attachHUD(hud)
controller.attachHistoryButtons(undoBtn, redoBtn)

let endgameOverlay: EndgameOverlay | null = null
if (overlayEl && messageEl) {
  endgameOverlay = new EndgameOverlay(overlayEl, messageEl)
  controller.attachEndgameOverlay(endgameOverlay)
}

initKeyboardShortcuts(controller)

wireHistoryButtons(undoBtn, redoBtn, controller)

newGameBtn?.addEventListener('click', () => {
  controller.resetGame()
})

playAgainBtn?.addEventListener('click', () => {
  controller.resetGame()
  endgameOverlay?.hide()
})

if (settingsBtn && settingsPanel) {
  initSettingsPanel(settingsBtn, settingsPanel, controller.getUISettings(), (settings) => {
    controller.setUISettings(settings)
  })
}

hud.update(controller.getState())

window.controller = controller
