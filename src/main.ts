import './style.css'
import { createNewGame } from './game/state'
import { DOMRenderer } from './ui/renderer'
import { InputController } from './ui/input-controller'

const root = document.getElementById('app')!

const game = createNewGame()

const renderer = new DOMRenderer(root, game)
const controller = new InputController(game, renderer)

renderer.render()
controller.attach()
