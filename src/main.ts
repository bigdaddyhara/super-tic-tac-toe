import './style.css'

import { drawGameSurface } from './ui/renderer'
import { CanvasInputController } from './ui/input-controller'
import { getRenderableState } from './ui/view-model-adapter'
import { createNewGame, applyMove as engineApplyMove } from './game/state'
import { isLegalMove, getLegalMoves } from './game/legal-moves'
import { GameState } from './types/game-types'
import { getGameOverButtonRect, getReplayControlRects } from './ui/renderer'
import { ReplayManager } from './ui/replay-manager'
import { ReplayManager } from './ui/replay-manager'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// For now, just use fixed sizes matching the canvas
const boardSize = 720;
const hudHeight = 80;

const input = new CanvasInputController(canvas, { hudHeight, boardSize })
input.attach()

let gameState: GameState = createNewGame()
let lastMove: { smallIndex: number; cellIndex: number } | null = null
let illegal: { smallIndex: number; cellIndex: number } | null = null
let gameOver = false
let winner: 'X' | 'O' | null = null
let draw = false
let shakeStart: number | null = null
let shakeDuration = 0
let animatingMove: { smallIndex: number; cellIndex: number; start: number; duration: number } | null = null
let boardWinAnim: { smallIndex: number; start: number; duration: number } | null = null
let aiEnabled = false
let aiPlayer: 'O' | 'X' = 'O'
const replay = new ReplayManager()
// ensure at least an initial state
if (replay.entries.length === 0) replay.push(createNewGame(), undefined)
let inReplayMode = false
// settings (persisted)
const SETTINGS_KEY = 'sut_settings_v1'
let settings = { animations: true }
try {
	const raw = localStorage.getItem(SETTINGS_KEY)
	if (raw) settings = JSON.parse(raw)
} catch (e) {}
// hover smoothing state
let hoverTarget: { smallIndex: number; cellIndex: number } | null = null
let hoverDisplay: { smallIndex: number; cellIndex: number; alpha: number } | null = null
let lastFrameTime = performance.now()

input.onHover((h) => {
	hoverTarget = h
})

input.onSelect((intent) => {

	applyMoveIntent({ board: intent.boardIndex, cell: intent.cellIndex })
})

function applyMoveIntent(move: { board: number; cell: number }) {
  if (gameOver) return
  const legal = isLegalMove(gameState, move)
  if (!legal) {
    illegal = { smallIndex: move.board, cellIndex: move.cell }
    const now = performance.now()
    shakeStart = now
    shakeDuration = 420
    setTimeout(() => (illegal = null), 450)
    return
  }

  try {
    const result = engineApplyMove(gameState, move)
    gameState = result.nextState
    	// append to replay manager
    	replay.push(gameState, { board: move.board, cell: move.cell })
    lastMove = { smallIndex: move.board, cellIndex: move.cell }
    animatingMove = { smallIndex: move.board, cellIndex: move.cell, start: performance.now(), duration: 420 }
    setTimeout(() => (animatingMove = null), 520)

    const drew = result.events.some((e: any) => e.type === 'Draw')
    const bigWin = result.events.find((e: any) => e.type === 'BigBoardWon')
    if (bigWin) {
      gameOver = true
      winner = (bigWin as any).winner
      input.detach()
      const sbWon = result.events.find((e: any) => e.type === 'SmallBoardWon')
      if (sbWon) {
        boardWinAnim = { smallIndex: (sbWon as any).board, start: performance.now(), duration: 700 }
        setTimeout(() => (boardWinAnim = null), 900)
      }
    } else if (drew) {
      gameOver = true
      draw = true
      input.detach()
    }
  } catch (err) {
    console.warn('Engine rejected move:', err)
    illegal = { smallIndex: move.board, cellIndex: move.cell }
    setTimeout(() => (illegal = null), 450)
  }
  // after applying a human move, schedule AI if enabled
  setTimeout(() => tryAiTurn(), 10)
}

// simple AI: pick a random legal move for aiPlayer when enabled
function tryAiTurn() {
	if (!aiEnabled || gameOver) return
	if (gameState.currentPlayer !== aiPlayer) return
	const moves = getLegalMoves(gameState)
	if (moves.length === 0) return
	// pick random
	const mv = moves[Math.floor(Math.random() * moves.length)]
	setTimeout(() => {
		applyMoveIntent({ board: mv.board, cell: mv.cell })
	}, 480)
}

// invoke AI after moves where appropriate

// Handle clicks on in-canvas Retry button when gameOver
canvas.addEventListener('click', (e) => {
	// If game over, check for in-canvas Retry button
	if (gameOver) {
		const rect = canvas.getBoundingClientRect()
		const scaleX = canvas.width / rect.width
		const scaleY = canvas.height / rect.height
		const x = (e.clientX - rect.left) * scaleX
		const y = (e.clientY - rect.top) * scaleY
		const btn = getGameOverButtonRect(canvas)
		if (!btn) return
		if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
			// reset
			gameState = createNewGame()
			lastMove = null
			illegal = null
			gameOver = false
			winner = null
			draw = false
			input.attach()
		}
	}
	// Check replay controls when not in live input-mode or even during
	const rect = canvas.getBoundingClientRect()
	const scaleX = canvas.width / rect.width
	const scaleY = canvas.height / rect.height
	const x = (e.clientX - rect.left) * scaleX
	const y = (e.clientY - rect.top) * scaleY
	const replayRects = getReplayControlRects(canvas)
	if (replayRects) {
		// Prev
		if (x >= replayRects.prev.x && x <= replayRects.prev.x + replayRects.prev.w && y >= replayRects.prev.y && y <= replayRects.prev.y + replayRects.prev.h) {
			if (!inReplayMode) {
				inReplayMode = true
				replay.index = replay.entries.length - 1
				input.detach()
			}
			replay.prev()
			return
		}
		// Next
		if (x >= replayRects.next.x && x <= replayRects.next.x + replayRects.next.w && y >= replayRects.next.y && y <= replayRects.next.y + replayRects.next.h) {
			if (!inReplayMode) {
				inReplayMode = true
				replay.index = replay.entries.length - 1
				input.detach()
			}
			replay.next()
			if (replay.index === null) {
				inReplayMode = false
				input.attach()
			}
			return
		}
		// Play/Pause
		if (x >= replayRects.play.x && x <= replayRects.play.x + replayRects.play.w && y >= replayRects.play.y && y <= replayRects.play.y + replayRects.play.h) {
			if (!replay.playing) {
				replay.play((s) => {
					if (s) gameState = s
				})
			} else {
				replay.pause()
			}
			return
		}
				// Speed box toggle
				if (x >= replayRects.speed.x && x <= replayRects.speed.x + replayRects.speed.w && y >= replayRects.speed.y && y <= replayRects.speed.y + replayRects.speed.h) {
						const next = replay.speedMs === 700 ? 300 : replay.speedMs === 300 ? 120 : 700
						replay.setSpeed(next)
						return
				}
	}
		// timeline jump
		const trect = (canvas as any).__replayTimeline
		if (trect) {
			if (x >= trect.x && x <= trect.x + trect.w && y >= trect.y && y <= trect.y + trect.h) {
				const ratio = (x - trect.x) / trect.w
				const idx = Math.floor(ratio * Math.max(1, replay.entries.length - 1))
				inReplayMode = true
				replay.jumpTo(idx)
				input.detach()
				return
			}
		}
})

function renderLoop() {
	const nowTime = performance.now()
	const dt = Math.max(0, nowTime - lastFrameTime)
	lastFrameTime = nowTime

	// smooth hover alpha (time-based)
	const speedPerMs = 0.01 // alpha per ms -> ~100ms to full
	if (hoverTarget) {
		if (!hoverDisplay || hoverDisplay.smallIndex !== hoverTarget.smallIndex || hoverDisplay.cellIndex !== hoverTarget.cellIndex) {
			hoverDisplay = { smallIndex: hoverTarget.smallIndex, cellIndex: hoverTarget.cellIndex, alpha: 0 }
		}
		hoverDisplay.alpha = Math.min(1, hoverDisplay.alpha + dt * speedPerMs)
	} else if (hoverDisplay) {
		hoverDisplay.alpha = Math.max(0, hoverDisplay.alpha - dt * speedPerMs)
		if (hoverDisplay.alpha <= 0) hoverDisplay = null
	}
	// compute shake offset if requested
	let shake = null
	if (shakeStart !== null) {
		const t = performance.now() - shakeStart
		if (t >= shakeDuration) {
			shakeStart = null
			shake = null
		} else {
			const progress = t / shakeDuration
			const decay = 1 - progress
			const amp = 12 * decay
			const freq = 25
			const x = Math.sin(t / freq * Math.PI * 2) * amp
			const y = Math.sin(t / (freq * 1.5) * Math.PI * 2) * (amp * 0.35)
			shake = { x, y }
		}
	}

	const displayedState = inReplayMode && replay.index !== null ? (replay.current() ?? gameState) : gameState
	const hoverCell = hoverDisplay ? { smallIndex: hoverDisplay.smallIndex, cellIndex: hoverDisplay.cellIndex } : null
	const hoverAlpha = hoverDisplay ? hoverDisplay.alpha : 0
	const historyEntries = replay.entries.map((e) => ({ move: e.move, ts: e.ts }))
	const vm = getRenderableState(displayedState, { hoverCell, hoverAlpha, lastMove: lastMove ? { smallIndex: lastMove.smallIndex, cellIndex: lastMove.cellIndex } : null, illegal, gameOver, winner, draw, shake, animatingMove: settings.animations ? animatingMove : null, boardWinAnim: settings.animations ? boardWinAnim : null, replayAvailable: replay.entries.length > 0, inReplayMode, replayIndex: replay.index, historyLength: replay.entries.length, historyEntries, replayPlaying: replay.playing, replaySpeedMs: replay.speedMs, })
	drawGameSurface(ctx, { boardSize, hudHeight }, vm)
	requestAnimationFrame(renderLoop)
}

renderLoop()

// Keyboard shortcuts: 'n' New game, 'a' toggle AI, 'r' Retry when game over
window.addEventListener('keydown', (e) => {
	if (e.key === 'n') {
		gameState = createNewGame()
		lastMove = null
		illegal = null
		gameOver = false
		winner = null
		draw = false
		input.attach()
	} else if (e.key === 'a') {
		aiEnabled = !aiEnabled
		console.log('AI enabled:', aiEnabled)
		// if enabling AI and it's AI's turn, trigger
		setTimeout(() => tryAiTurn(), 50)
	} else if (e.key === 'r') {
		if (gameOver) {
			gameState = createNewGame()
			lastMove = null
			illegal = null
			gameOver = false
			winner = null
			draw = false
			input.attach()
		}
	} else if (e.key === 'ArrowLeft') {
		if (!inReplayMode) return
		if (replay.index === null) replay.index = replay.entries.length - 1
		if (replay.index !== null && replay.index > 0) replay.prev()
	} else if (e.key === 'ArrowRight') {
		if (!inReplayMode) return
		if (replay.index === null) replay.index = replay.entries.length - 1
		if (replay.index !== null && replay.index < replay.entries.length - 1) replay.next()
		if (replay.index === null) {
			inReplayMode = false
			input.attach()
		}
	}
})
