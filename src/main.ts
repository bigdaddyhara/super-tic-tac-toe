import './styles/base.css'
import { GameController } from './ui/game-controller'
import { EndgameOverlay } from './ui/endgame-overlay'
import { registerUTTTApp, UTTTAppElement } from './ui/components/uttt-app'
import { registerUTTTHud } from './ui/components/uttt-hud'
import { registerUTTTControls } from './ui/components/uttt-controls'
import { registerUTTTSettings } from './ui/components/uttt-settings'
import { registerUTTTToast } from './ui/components/uttt-toast'
import { registerUTTTHelp } from './ui/components/uttt-help'

declare global {
  interface Window {
    controller: GameController
  }
}

registerUTTTApp()
registerUTTTHud()
registerUTTTControls()
registerUTTTSettings()
registerUTTTToast()
registerUTTTHelp()

const app = document.querySelector('uttt-app') as UTTTAppElement | null
if (!app) {
  throw new Error('Bootstrap: expected <uttt-app> root element, but none was found.')
}

const mountPoints = app.getMountPoints()
const controller = new GameController(mountPoints.canvas)

const overlayEl = mountPoints.endgameOverlay
const messageEl = mountPoints.endgameMessage
const playAgainBtn = mountPoints.playAgainBtn
app.bindController(controller)

let endgameOverlay: EndgameOverlay | null = null
if (overlayEl && messageEl) {
  endgameOverlay = new EndgameOverlay(overlayEl, messageEl)
  controller.attachEndgameOverlay(endgameOverlay)
}

playAgainBtn?.addEventListener('click', () => {
  controller.resetGame()
  endgameOverlay?.hide()
})

window.controller = controller
