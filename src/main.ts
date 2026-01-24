import './style.css'
import { initRemoteLogging } from './ui/logging'

// initialize remote logging (best-effort)
initRemoteLogging()

import { drawGameSurface } from './ui/renderer'
import { CanvasInputController } from './ui/input-controller'
import { getRenderableState } from './ui/view-model-adapter'
import { createNewGame, applyMove as engineApplyMove } from './game/state'
import { isLegalMove, getLegalMoves } from './game/legal-moves'
import { GameState } from './types/game-types'
import { getGameOverButtonRect, getReplayControlRects } from './ui/renderer'
import { ReplayManager } from './ui/replay-manager'
import { HistoryManager } from './ui/history-manager'
import { TurnTimer } from './ui/turn-timer'
import { startAIMove } from './ui/ai-manager'
import { cancelAIMove } from './ui/ai-manager'
import { getWorkerPool, setWorkerPoolSize, getConfiguredPoolSize } from './ai/worker-pool'
import { loadSettings, saveSettings, SETTINGS_KEY } from './ui/settings'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Create a small AI thinking indicator badge in the UI
const appRoot = document.getElementById('app') as HTMLElement | null
let aiThinkingIndicator: HTMLDivElement | null = null
if (appRoot) {
	try {
		appRoot.style.position = appRoot.style.position || 'relative'
		aiThinkingIndicator = document.createElement('div')
		aiThinkingIndicator.id = 'ai-thinking-indicator'
		aiThinkingIndicator.setAttribute('role', 'status')
		aiThinkingIndicator.setAttribute('aria-live', 'polite')
		aiThinkingIndicator.style.position = 'absolute'
		aiThinkingIndicator.style.top = '12px'
		aiThinkingIndicator.style.right = '12px'
		aiThinkingIndicator.style.padding = '6px 10px'
		aiThinkingIndicator.style.background = 'rgba(6,182,212,0.12)'
		aiThinkingIndicator.style.color = '#06b6d4'
		aiThinkingIndicator.style.border = '1px solid rgba(6,182,212,0.18)'
		aiThinkingIndicator.style.borderRadius = '8px'
		aiThinkingIndicator.style.fontSize = '13px'
		aiThinkingIndicator.style.backdropFilter = 'blur(4px)'
		aiThinkingIndicator.style.pointerEvents = 'none'
		aiThinkingIndicator.style.transition = 'opacity 160ms ease'
		aiThinkingIndicator.style.opacity = '0'
		aiThinkingIndicator.textContent = 'AI thinking...'
		appRoot.appendChild(aiThinkingIndicator)
	} catch (e) {
		aiThinkingIndicator = null
	}
}

// AI budget clamped badge (appears briefly when AI budget is reduced)
let aiClampBadge: HTMLDivElement | null = null
if (appRoot) {
	try {
		aiClampBadge = document.createElement('div')
		aiClampBadge.id = 'ai-clamp-badge'
		aiClampBadge.style.position = 'absolute'
		aiClampBadge.style.top = '48px'
		aiClampBadge.style.right = '12px'
		aiClampBadge.style.padding = '6px 10px'
		aiClampBadge.style.background = 'rgba(255,165,0,0.12)'
		aiClampBadge.style.color = '#ff8800'
		aiClampBadge.style.border = '1px solid rgba(255,165,0,0.18)'
		aiClampBadge.style.borderRadius = '8px'
		aiClampBadge.style.fontSize = '12px'
		aiClampBadge.style.backdropFilter = 'blur(4px)'
		aiClampBadge.style.pointerEvents = 'none'
		aiClampBadge.style.transition = 'opacity 160ms ease'
		aiClampBadge.style.opacity = '0'
		aiClampBadge.textContent = ''
		appRoot.appendChild(aiClampBadge)
	} catch (e) {
		aiClampBadge = null
	}
}

document.addEventListener('ai:budget-clamped', (ev: any) => {
	try {
		if (!aiClampBadge) return
		const d = ev && ev.detail ? ev.detail : null
		const ms = d && typeof d.effectiveMs === 'number' ? Math.round(d.effectiveMs) : null
		aiClampBadge.textContent = ms !== null ? `AI time clamped to ${Math.round((ms / 1000) * 10) / 10}s` : 'AI time clamped'
		aiClampBadge.style.opacity = '1'
		setTimeout(() => { if (aiClampBadge) aiClampBadge.style.opacity = '0' }, 2500)
	} catch (e) {}
})

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
let aiEnabled = !!(settings as any).aiEnabled
let aiPlayer: 'O' | 'X' = 'O'
const replay = new ReplayManager()
const history = new HistoryManager()
// ensure at least an initial state
if (replay.entries.length === 0) replay.push(createNewGame(), undefined)
let inReplayMode = false
// settings (persisted)
let settings = loadSettings({ animations: true })

// (settings defaults will be initialized after TurnTimer is created)
// hover smoothing state
let hoverTarget: { smallIndex: number; cellIndex: number } | null = null
let hoverDisplay: { smallIndex: number; cellIndex: number; alpha: number } | null = null
let lastFrameTime = performance.now()

// TurnTimer implementation moved to src/ui/turn-timer.ts

const turnTimer = new TurnTimer((settings as any).turnTimeoutMs)

// initialize new settings with defaults if missing (do this after turnTimer exists)
if ((settings as any).turnTimeoutMs === undefined) (settings as any).turnTimeoutMs = 30000
if ((settings as any).analysisEnabled === undefined) (settings as any).analysisEnabled = false
if ((settings as any).aiDiagnosticsEnabled === undefined) (settings as any).aiDiagnosticsEnabled = false
if ((settings as any).aiDiagnosticsStreaming === undefined) (settings as any).aiDiagnosticsStreaming = false
if ((settings as any).aiDiagnosticsThrottleMs === undefined) (settings as any).aiDiagnosticsThrottleMs = 200
if ((settings as any).turnTimerEnabled === undefined) (settings as any).turnTimerEnabled = false
if ((settings as any).turnTimeoutSec === undefined) (settings as any).turnTimeoutSec = Math.round(((settings as any).turnTimeoutMs ?? 30000) / 1000)
if ((settings as any).autoExpiryBehavior === undefined) (settings as any).autoExpiryBehavior = 'auto-random'
if ((settings as any).showLastMoveHighlight === undefined) (settings as any).showLastMoveHighlight = true
if ((settings as any).forcedBoardIntensity === undefined) (settings as any).forcedBoardIntensity = 0.06
// AI difficulty default
if ((settings as any).aiDifficulty === undefined) (settings as any).aiDifficulty = 'medium'

// reflect analysisEnabled into our runtime flag
// `analysisEnabled` will be initialized after its declaration below
// ensure TurnTimer timeout matches seconds setting
turnTimer.setTimeoutMs(((settings as any).turnTimeoutSec ?? 30) * 1000)

input.onHover((h) => {
	hoverTarget = h
	// update debug overlay
	const dbg = document.getElementById('debug-overlay')
	if (dbg) dbg.textContent = h ? `hover: b${h.smallIndex} c${h.cellIndex}` : 'hover: none'
})

input.onSelect((intent) => {

		// update debug overlay on select
		const dbg = document.getElementById('debug-overlay')
		if (dbg) dbg.textContent = `click: b${intent.boardIndex} c${intent.cellIndex}`
		applyMoveIntent({ board: intent.boardIndex, cell: intent.cellIndex })
})

// Undo/Redo helpers
function makeSnapshotForHistory(state: GameState, move?: { board: number; cell: number }) {
		// compute short state id to allow diagnostics -> history mapping
		let sid: string | undefined = undefined
		try {
			// lazy require to avoid circular import problems in some runtimes
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const s = require('./ai/serialize')
			if (s && typeof s.stateIdFromState === 'function') sid = s.stateIdFromState(state as any)
		} catch (e) {}
		return { state, move, ts: Date.now(), stateId: sid, timer: { remainingMs: turnTimer.getRemainingMs(), running: turnTimer.isRunning(), timeoutMs: (settings as any).turnTimeoutMs } }
}

function performUndo() {
	if (!history.canUndo()) return
	const currentSnap = makeSnapshotForHistory(gameState, lastMove ? { board: lastMove.smallIndex, cell: lastMove.cellIndex } : undefined)
	const prev = history.undo(currentSnap)
	if (!prev) return
	// restore state
	gameState = prev.state
	// restore lastMove based on previous move info
	lastMove = prev.move ? { smallIndex: prev.move.board, cellIndex: prev.move.cell } : null
	// restore game flags
	// compute gameOver/draw/winner from state by mapping to renderable
	const vm = getRenderableState(gameState)
	gameOver = (vm as any).gameOver ?? false
	winner = (vm as any).winner ?? null
	draw = (vm as any).draw ?? false
	// cancel any in-flight AI thinking
	try { cancelAIMove() } catch (e) {}
	// restore timer
	// restore timer snapshot
	turnTimer.restoreSnapshot(prev.timer, gameState.currentPlayer, (epoch, expectedPlayer) => {
		if (epoch !== turnTimer.currentEpoch()) return
		if (inReplayMode || gameOver) return
		if (gameState.currentPlayer !== expectedPlayer) return
		const moves = getLegalMoves(gameState)
		if (moves.length === 0) return
		const mv = moves[Math.floor(Math.random() * moves.length)]
		if (isLegalMove(gameState, mv)) applyMoveIntent({ board: mv.board, cell: mv.cell })
	})
}

function performRedo() {
	if (!history.canRedo()) return
	const currentSnap = makeSnapshotForHistory(gameState, lastMove ? { board: lastMove.smallIndex, cell: lastMove.cellIndex } : undefined)
	const next = history.redo(currentSnap)
	if (!next) return
	gameState = next.state
	lastMove = next.move ? { smallIndex: next.move.board, cellIndex: next.move.cell } : null
	const vm = getRenderableState(gameState)
	gameOver = (vm as any).gameOver ?? false
	winner = (vm as any).winner ?? null
	draw = (vm as any).draw ?? false
	if (next.timer) {
		// restore timer snapshot
		turnTimer.restoreSnapshot(next.timer, gameState.currentPlayer, (epoch, expectedPlayer) => {
			if (epoch !== turnTimer.currentEpoch()) return
			if (inReplayMode || gameOver) return
			if (gameState.currentPlayer !== expectedPlayer) return
			const moves = getLegalMoves(gameState)
			if (moves.length === 0) return
			const mv = moves[Math.floor(Math.random() * moves.length)]
			if (isLegalMove(gameState, mv)) applyMoveIntent({ board: mv.board, cell: mv.cell })
		})
	}
}

// create debug overlay
const debugOverlay = document.createElement('div')
debugOverlay.id = 'debug-overlay'
debugOverlay.style.position = 'fixed'
debugOverlay.style.right = '12px'
debugOverlay.style.bottom = '12px'
debugOverlay.style.background = 'rgba(0,0,0,0.6)'
debugOverlay.style.color = '#fff'
debugOverlay.style.padding = '8px 12px'
debugOverlay.style.borderRadius = '8px'
debugOverlay.style.fontFamily = 'monospace'
debugOverlay.style.zIndex = '9999'
debugOverlay.textContent = 'hover: none'
document.body.appendChild(debugOverlay)

// show recent console messages in overlay (append below hover text)
const recentList = document.createElement('div')
recentList.style.marginTop = '6px'
recentList.style.fontSize = '12px'
recentList.style.maxHeight = '140px'
recentList.style.overflow = 'auto'
debugOverlay.appendChild(recentList)

// Pool instrumentation UI
const poolStats = document.createElement('div')
poolStats.style.marginTop = '8px'
poolStats.style.fontSize = '12px'
debugOverlay.appendChild(poolStats)

function updatePoolStats() {
	try {
		const mctsPool = getWorkerPool('./mcts.worker.ts')
		const explainPool = getWorkerPool('./explain.worker.ts')
		const mctsStats = mctsPool && (mctsPool as any).getStats ? (mctsPool as any).getStats() : null
		const exStats = explainPool && (explainPool as any).getStats ? (explainPool as any).getStats() : null
		poolStats.innerHTML = `MCTS: ${mctsStats ? `${mctsStats.workers} workers, ${mctsStats.tasksRun} run, ${mctsStats.tasksFailed} failed` : 'n/a'}<br>Explain: ${exStats ? `${exStats.workers} workers, ${exStats.tasksRun} run, ${exStats.tasksFailed} failed` : 'n/a'}`
	} catch (e) {
		poolStats.textContent = 'Pool stats unavailable'
	}
}
setInterval(updatePoolStats, 1000)
updatePoolStats()

// Controls to override pool sizes for debug/tuning
const poolControlWrap = document.createElement('div')
poolControlWrap.style.marginTop = '8px'
poolControlWrap.style.display = 'flex'
poolControlWrap.style.flexDirection = 'column'

function mkControl(labelText: string, workerPath: string) {
	const row = document.createElement('div')
	row.style.display = 'flex'
	row.style.gap = '6px'
	const lbl = document.createElement('label')
	lbl.textContent = labelText
	lbl.style.fontSize = '12px'
	const inp = document.createElement('input') as HTMLInputElement
	inp.type = 'number'
	inp.min = '0'
	inp.value = String(getConfiguredPoolSize(workerPath))
	inp.style.width = '56px'
	const btn = document.createElement('button')
	btn.textContent = 'Apply'
	btn.addEventListener('click', () => {
		const v = Number(inp.value)
		if (isNaN(v)) return
		setWorkerPoolSize(workerPath, v)
		updatePoolStats()
	})
	row.appendChild(lbl)
	row.appendChild(inp)
	row.appendChild(btn)
	return row
}

poolControlWrap.appendChild(mkControl('MCTS workers', './mcts.worker.ts'))
poolControlWrap.appendChild(mkControl('Explain workers', './explain.worker.ts'))
debugOverlay.appendChild(poolControlWrap)

// Undo / Redo buttons
const undoBtn = document.createElement('button')
undoBtn.textContent = 'Undo'
undoBtn.style.marginTop = '8px'
undoBtn.style.display = 'inline-block'
undoBtn.addEventListener('click', () => {
	performUndo()
})
const redoBtn = document.createElement('button')
redoBtn.textContent = 'Redo'
redoBtn.style.marginLeft = '8px'
redoBtn.addEventListener('click', () => {
	performRedo()
})
const btnWrap = document.createElement('div')
btnWrap.style.marginTop = '8px'
btnWrap.appendChild(undoBtn)
btnWrap.appendChild(redoBtn)
debugOverlay.appendChild(btnWrap)

// update overlay periodically with recent console messages
setInterval(() => {
	const arr = (window as any).__recentConsole || []
	recentList.innerHTML = ''
	for (let i = Math.max(0, arr.length - 6); i < arr.length; i++) {
		const it = arr[i]
		if (!it) continue
		const el = document.createElement('div')
		el.textContent = `${new Date(it.ts).toLocaleTimeString()} ${it.level}: ${it.msg}`
		recentList.appendChild(el)
	}
}, 400)

// Analysis mode (in-memory only)
let analysisEnabled = false
// apply persisted preference
analysisEnabled = !!(settings as any).analysisEnabled

// diagnostics snapshot (latest) — stored when AI emits `ai:analysisSnapshot`
let latestAIDiagnostics: any = null
document.addEventListener('ai:analysisSnapshot', (ev: any) => {
	try {
		latestAIDiagnostics = ev && ev.detail ? ev.detail.diagnostics : null
		// request a render so UI picks up diagnostics if enabled
		try { requestAnimationFrame(renderLoop) } catch (e) {}
	} catch (e) {}
})

// Add a small checkbox to debug overlay to toggle Analysis (desktop-only)
const isTouch = (navigator as any).maxTouchPoints ? (navigator as any).maxTouchPoints > 0 : ('ontouchstart' in window)
if (!isTouch) {
	const analLabel = document.createElement('label')
	analLabel.style.display = 'flex'
	analLabel.style.alignItems = 'center'
	analLabel.style.marginTop = '8px'
	analLabel.style.gap = '8px'
	const analChk = document.createElement('input')
	analChk.type = 'checkbox'
	analChk.checked = analysisEnabled
	analChk.addEventListener('change', () => {
		analysisEnabled = !!analChk.checked
		console.log('Analysis mode:', analysisEnabled)
	})

	// Diagnostics toggle small checkbox in debug overlay
	const diagChk = document.createElement('input')
	diagChk.type = 'checkbox'
	diagChk.checked = !!(settings as any).aiDiagnosticsEnabled
	diagChk.addEventListener('change', () => {
		(settings as any).aiDiagnosticsEnabled = !!diagChk.checked
		saveSettings(settings)
		console.log('AI diagnostics:', (settings as any).aiDiagnosticsEnabled)
	})
	const diagLabel = document.createElement('span')
	diagLabel.textContent = ' Diagnostics'
	diagLabel.style.fontSize = '12px'
	const diagWrap = document.createElement('label')
	diagWrap.style.display = 'flex'
	diagWrap.style.alignItems = 'center'
	diagWrap.style.gap = '6px'
	diagWrap.style.marginTop = '6px'
	diagWrap.appendChild(diagChk)
	diagWrap.appendChild(diagLabel)
	debugOverlay.appendChild(diagWrap)
	const txt = document.createElement('span')
	txt.textContent = 'Analysis'
	txt.style.fontSize = '12px'
	analLabel.appendChild(analChk)
	analLabel.appendChild(txt)
	debugOverlay.appendChild(analLabel)
}

	// Settings modal (desktop-only)
	let settingsModal: HTMLDivElement | null = null
	let lastFocusedElement: Element | null = null
	let settingsModalKeydownHandler: ((e: KeyboardEvent) => void) | null = null
	function openSettings() {
		if (settingsModal) return
		settingsModal = document.createElement('div')
		settingsModal.setAttribute('role', 'dialog')
		settingsModal.setAttribute('aria-modal', 'true')
		settingsModal.style.position = 'fixed'
		settingsModal.style.left = '50%'
		settingsModal.style.top = '50%'
		settingsModal.style.transform = 'translate(-50%,-50%)'
		settingsModal.style.background = '#fff'
		settingsModal.style.color = '#111'
		settingsModal.style.padding = '18px'
		settingsModal.style.borderRadius = '8px'
		settingsModal.style.boxShadow = '0 6px 30px rgba(0,0,0,0.4)'
		settingsModal.style.zIndex = '10000'

		const title = document.createElement('h3')
		title.id = 'settings-title'
		title.textContent = 'Settings'
		settingsModal.setAttribute('aria-labelledby', 'settings-title')
		settingsModal.appendChild(title)

		// Analysis toggle (grouped)
		const analField = document.createElement('fieldset')
		analField.style.marginBottom = '12px'
		const analLegend = document.createElement('legend')
		analLegend.textContent = 'Analysis'
		analField.appendChild(analLegend)
		const analRow = document.createElement('div')
		const analInp = document.createElement('input')
		analInp.type = 'checkbox'
		analInp.checked = !!(settings as any).analysisEnabled
		analInp.id = 'settings-analysis'
		analInp.addEventListener('change', () => {
			(settings as any).analysisEnabled = analInp.checked
			analysisEnabled = analInp.checked
				saveSettings(settings)
			});

		// AI diagnostics toggle in settings modal
		const diagSettingChk = document.createElement('input')
		diagSettingChk.type = 'checkbox'
		diagSettingChk.checked = !!(settings as any).aiDiagnosticsEnabled
		diagSettingChk.id = 'settings-ai-diagnostics'
		diagSettingChk.addEventListener('change', () => {
			(settings as any).aiDiagnosticsEnabled = diagSettingChk.checked
			saveSettings(settings)
		})
		const diagSettingLabel = document.createElement('label')
		diagSettingLabel.htmlFor = 'settings-ai-diagnostics'
		diagSettingLabel.appendChild(diagSettingChk)
		diagSettingLabel.appendChild(document.createTextNode(' Enable AI diagnostics (Analysis mode overlay)'))
		settingsModal.appendChild(diagSettingLabel)

		// Advanced diagnostics streaming controls
		const advField = document.createElement('fieldset')
		advField.style.marginTop = '8px'
		const advLegend = document.createElement('legend')
		advLegend.textContent = 'Diagnostics (advanced)'
		advField.appendChild(advLegend)
		const streamRow = document.createElement('div')
		const streamChk = document.createElement('input')
		streamChk.type = 'checkbox'
		streamChk.checked = !!(settings as any).aiDiagnosticsStreaming
		streamChk.id = 'settings-ai-diagnostics-stream'
		streamChk.addEventListener('change', () => { (settings as any).aiDiagnosticsStreaming = streamChk.checked; saveSettings(settings) })
		const streamLabel = document.createElement('label')
		streamLabel.htmlFor = 'settings-ai-diagnostics-stream'
		streamLabel.appendChild(streamChk)
		streamLabel.appendChild(document.createTextNode(' Enable streaming diagnostics (throttled)'))
		streamRow.appendChild(streamLabel)
		advField.appendChild(streamRow)

		const throttleRow = document.createElement('div')
		throttleRow.style.marginTop = '6px'
		const throttleLabel = document.createElement('label')
		throttleLabel.textContent = 'Diagnostics throttle ms: '
		const throttleInp = document.createElement('input') as HTMLInputElement
		throttleInp.type = 'number'
		throttleInp.min = '0'
		throttleInp.value = String((settings as any).aiDiagnosticsThrottleMs || 200)
		throttleInp.style.width = '80px'
		throttleInp.addEventListener('change', () => { const v = Math.max(0, Math.floor(Number(throttleInp.value || '200'))); (settings as any).aiDiagnosticsThrottleMs = v; saveSettings(settings) })
		throttleLabel.appendChild(throttleInp)
		throttleRow.appendChild(throttleLabel)
		advField.appendChild(throttleRow)

		settingsModal.appendChild(advField)
		const analLabel2 = document.createElement('label')
		analLabel2.htmlFor = 'settings-analysis'
		analLabel2.appendChild(document.createTextNode(' Show analysis overlays'))
		analRow.appendChild(analInp)
		analRow.appendChild(analLabel2)
		analField.appendChild(analRow)
		settingsModal.appendChild(analField)

		// Timer settings (grouped)
		const timerField = document.createElement('fieldset')
		timerField.style.marginBottom = '12px'
		const timerLegend = document.createElement('legend')
		timerLegend.textContent = 'Turn timer'
		timerField.appendChild(timerLegend)
		const timerRow = document.createElement('div')
		
		const timerChk = document.createElement('input')
		timerChk.type = 'checkbox'
		timerChk.checked = !!(settings as any).turnTimerEnabled
		timerChk.addEventListener('change', () => {
			(settings as any).turnTimerEnabled = timerChk.checked
			if (!timerChk.checked) {
				turnTimer.stop()
			} else {
				// start timer for current player if appropriate
				if (!gameOver && !inReplayMode) {
					turnTimer.startForPlayer(gameState.currentPlayer, (epoch, expectedPlayer) => {
						if (epoch !== turnTimer.currentEpoch()) return
						if (inReplayMode || gameOver) return
						if (gameState.currentPlayer !== expectedPlayer) return
						const moves = getLegalMoves(gameState)
						if (moves.length === 0) return
						if ((settings as any).autoExpiryBehavior === 'auto-loss') {
							// mark as lost for the current player (UI-level)
							gameOver = true
							winner = expectedPlayer === 'X' ? 'O' : 'X'
							input.detach()
							return
						}
						const mv = moves[Math.floor(Math.random() * moves.length)]
						if (isLegalMove(gameState, mv)) applyMoveIntent({ board: mv.board, cell: mv.cell })
					})
				}
			}
			saveSettings(settings)
		})
		const timerLabel = document.createElement('label')
		timerLabel.htmlFor = 'settings-timer'
		timerChk.id = 'settings-timer'
		timerLabel.appendChild(timerChk)
		timerLabel.appendChild(document.createTextNode(' Enable per-turn timer'))
		timerRow.appendChild(timerLabel)
		const secondsInput = document.createElement('input')
		secondsInput.type = 'number'
		secondsInput.min = '1'
		secondsInput.value = String((settings as any).turnTimeoutSec || 30)
		secondsInput.style.marginLeft = '12px'
		secondsInput.addEventListener('change', () => {
			const parsed = Math.floor(Number(secondsInput.value || '30'))
			const v: number = isNaN(parsed) ? 30 : Math.max(1, parsed);
			(settings as any).turnTimeoutSec = v;
			(settings as any).turnTimeoutMs = v * 1000;
			turnTimer.setTimeoutMs(v * 1000);
			saveSettings(settings);
		})
		timerRow.appendChild(secondsInput)
		timerField.appendChild(timerRow)
		settingsModal.appendChild(timerField)

		// AI difficulty selector
		const aiField = document.createElement('fieldset')
		aiField.style.marginBottom = '12px'
		const aiLegend = document.createElement('legend')
		aiLegend.textContent = 'AI difficulty'
		aiField.appendChild(aiLegend)
		const aiRow = document.createElement('div')
		const aiSelect = document.createElement('select')
		aiSelect.id = 'settings-ai-difficulty'
		const aiOpts = ['easy', 'medium', 'hard', 'insane', 'custom']
		aiOpts.forEach((v) => {
			const o = document.createElement('option')
			o.value = v
			o.textContent = v.charAt(0).toUpperCase() + v.slice(1)
			aiSelect.appendChild(o)
		})
		aiSelect.value = (settings as any).aiDifficulty || 'medium'
		aiSelect.addEventListener('change', () => {
			(settings as any).aiDifficulty = aiSelect.value
			saveSettings(settings)
		})
		aiRow.appendChild(aiSelect)
		aiField.appendChild(aiRow)
		settingsModal.appendChild(aiField)

		// Auto-expiry behavior (part of timer group)
		const expiryRow = document.createElement('div')
		expiryRow.style.marginBottom = '8px'
		const expiryLabel = document.createElement('label')
		expiryLabel.htmlFor = 'settings-expiry'
		expiryLabel.textContent = 'On timeout: '
		const expirySelect = document.createElement('select')
		expirySelect.id = 'settings-expiry'
		const opt1 = document.createElement('option')
		opt1.value = 'auto-random'
		opt1.textContent = 'Auto-play random move'
		const opt2 = document.createElement('option')
		opt2.value = 'auto-loss'
		opt2.textContent = 'Auto-loss'
		expirySelect.appendChild(opt1)
		expirySelect.appendChild(opt2)
		expirySelect.value = (settings as any).autoExpiryBehavior || 'auto-random'
		expirySelect.addEventListener('change', () => { (settings as any).autoExpiryBehavior = expirySelect.value; saveSettings(settings) })
		expiryRow.appendChild(expiryLabel)
		expiryRow.appendChild(expirySelect)
		settingsModal.appendChild(expiryRow)

		// Visual toggles
		const visualRow = document.createElement('div')
		visualRow.style.marginBottom = '8px'
		const lastMoveChk = document.createElement('input')
		lastMoveChk.type = 'checkbox'
		lastMoveChk.checked = !!(settings as any).showLastMoveHighlight
		lastMoveChk.id = 'settings-lastmove'
		lastMoveChk.addEventListener('change', () => { (settings as any).showLastMoveHighlight = lastMoveChk.checked; saveSettings(settings) })
		const lastMoveLabel = document.createElement('label')
		lastMoveLabel.htmlFor = 'settings-lastmove'
		lastMoveLabel.appendChild(lastMoveChk)
		lastMoveLabel.appendChild(document.createTextNode(' Show last-move highlight'))
		visualRow.appendChild(lastMoveLabel)
		settingsModal.appendChild(visualRow)

		const forceRow = document.createElement('div')
		const forceLabel = document.createElement('label')
		forceLabel.htmlFor = 'settings-force'
		forceLabel.textContent = 'Forced-board intensity: '
		const forceRange = document.createElement('input')
		forceRange.type = 'range'
		forceRange.min = '0'
		forceRange.max = '1'
		forceRange.step = '0.01'
		forceRange.id = 'settings-force'
		forceRange.value = String((settings as any).forcedBoardIntensity ?? 0.06)
		forceRange.addEventListener('input', () => { (settings as any).forcedBoardIntensity = parseFloat(forceRange.value); saveSettings(settings) })
		forceRow.appendChild(forceLabel)
		forceRow.appendChild(forceRange)
		settingsModal.appendChild(forceRow)

		// Keyboard help (inline, accessible)
		const helpRow = document.createElement('div')
		helpRow.style.marginTop = '12px'
		const helpBtn = document.createElement('button')
		helpBtn.textContent = 'Keyboard shortcuts'
		helpBtn.setAttribute('aria-expanded', 'false')
		helpBtn.setAttribute('aria-controls', 'settings-keyboard-help')
		const helpPanel = document.createElement('section')
		helpPanel.id = 'settings-keyboard-help'
		helpPanel.style.display = 'none'
		helpPanel.setAttribute('aria-hidden', 'true')
		helpPanel.style.marginTop = '8px'
		helpPanel.style.padding = '8px'
		helpPanel.style.border = '1px solid rgba(0,0,0,0.06)'
		helpPanel.innerHTML = `
			<strong>Keyboard shortcuts</strong>
			<ul>
				<li><strong>n</strong> — New game</li>
				<li><strong>a</strong> — Toggle AI</li>
				<li><strong>r</strong> — Retry (when game over)</li>
				<li><strong>y</strong> — Toggle analysis overlays</li>
				<li><strong>Ctrl/Cmd+Z</strong> — Undo</li>
				<li><strong>Ctrl/Cmd+Shift+Z</strong> / <strong>Ctrl/Cmd+Y</strong> — Redo</li>
			</ul>`
		helpBtn.addEventListener('click', () => {
			const expanded = helpBtn.getAttribute('aria-expanded') === 'true'
			helpBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true')
			helpPanel.style.display = expanded ? 'none' : 'block'
			helpPanel.setAttribute('aria-hidden', expanded ? 'true' : 'false')
		})
		helpRow.appendChild(helpBtn)
		helpRow.appendChild(helpPanel)
		settingsModal.appendChild(helpRow)

		// Close button
		const closeRow = document.createElement('div')
		closeRow.style.marginTop = '12px'
		const closeBtn = document.createElement('button')
		closeBtn.textContent = 'Close'
		closeBtn.addEventListener('click', closeSettings)
		closeRow.appendChild(closeBtn)
		settingsModal.appendChild(closeRow)

		// save previous focus to restore later
		lastFocusedElement = document.activeElement
		document.body.appendChild(settingsModal)
		// focus first control
		analInp.focus()

		// trap focus and handle Escape
		settingsModalKeydownHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				closeSettings()
				return
			}
			if (e.key === 'Tab') {
				const focusable = settingsModal!.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
				if (focusable.length === 0) return
				const first = focusable[0]
				const last = focusable[focusable.length - 1]
				if (e.shiftKey) {
					if (document.activeElement === first) {
						last.focus()
						e.preventDefault()
					}
				} else {
					if (document.activeElement === last) {
						first.focus()
						e.preventDefault()
					}
				}
			}
		}
		document.addEventListener('keydown', settingsModalKeydownHandler)
	}

	function closeSettings() {
		if (!settingsModal) return
		document.body.removeChild(settingsModal)
		// remove key handler
		if (settingsModalKeydownHandler) {
			document.removeEventListener('keydown', settingsModalKeydownHandler)
			settingsModalKeydownHandler = null
		}
		// restore focus
		try {
			if (lastFocusedElement && (lastFocusedElement as HTMLElement).focus) (lastFocusedElement as HTMLElement).focus()
		} catch (e) {}
		settingsModal = null
	}

	// Add Settings button to debug overlay (desktop only)
	if (!isTouch) {
		const settingsBtn = document.createElement('button')
		settingsBtn.textContent = 'Settings'
		settingsBtn.style.marginTop = '8px'
		settingsBtn.addEventListener('click', openSettings)
		debugOverlay.appendChild(settingsBtn)
	}

// temporary: auto-click canvas center on load to test pipeline
setTimeout(() => {
	try {
		const rect = canvas.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		const ev = new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true, cancelable: true })
		canvas.dispatchEvent(ev)
		console.log('[autoclick] dispatched at center')

		// capture screenshot from canvas and POST
		try {
			const data = canvas.toDataURL('image/png')
			fetch('http://localhost:5175/screenshot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: `screenshot-${Date.now()}.png`, data }) })
				.then(() => console.log('[screenshot] posted'))
				.catch((e) => console.warn('[screenshot] post failed', e))
		} catch (e) {
			console.warn('[screenshot] capture failed', e)
		}
	} catch (e) {
		console.warn('[autoclick] error', e)
	}
}, 600)

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
		// capture previous snapshot for history before mutating
		const prevSnap = makeSnapshotForHistory(gameState, lastMove ? { board: lastMove.smallIndex, cell: lastMove.cellIndex } : undefined)

		const result = engineApplyMove(gameState, move)
		gameState = result.nextState

		// build after snapshot and push to history (prev -> after)
		const afterSnap = makeSnapshotForHistory(gameState, { board: move.board, cell: move.cell })
		try {
			history.push(prevSnap, afterSnap)
		} catch (e) {
			console.warn('History push failed:', e)
		}

		// append to replay manager with a timer snapshot
		replay.push(gameState, { board: move.board, cell: move.cell }, { timer: { remainingMs: turnTimer.getRemainingMs(), running: turnTimer.isRunning(), timeoutMs: (settings as any).turnTimeoutMs } })
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
	// restart timer for the next player's turn (only if not game over and not replaying)
	setTimeout(() => {
		tryAiTurn()
		if (!gameOver && !inReplayMode) {
			// start timer for the current player
			turnTimer.startForPlayer(gameState.currentPlayer, (epoch, expectedPlayer) => {
				// only act if still the same turn and not in replay
				if (epoch !== turnTimer.currentEpoch()) return
				if (inReplayMode || gameOver) return
				if (gameState.currentPlayer !== expectedPlayer) return
				// expiry: auto-play random legal move (friendly behavior)
				const moves = getLegalMoves(gameState)
				if (moves.length === 0) return
				const mv = moves[Math.floor(Math.random() * moves.length)]
				// apply move if still legal
				if (isLegalMove(gameState, mv)) {
					applyMoveIntent({ board: mv.board, cell: mv.cell })
				}
			})
		}
	}, 10)
}

// simple AI: pick a random legal move for aiPlayer when enabled
function tryAiTurn() {
	if (!aiEnabled || gameOver) return
	if (gameState.currentPlayer !== aiPlayer) return
	const moves = getLegalMoves(gameState)
	if (moves.length === 0) return

	// Start AI move using the ai-manager which ties into the TurnTimer and provides
	// an AbortSignal when the timer expires. Show a small thinking delay to keep
	// the UX consistent with the previous random-AI behavior.
	const aiOptions = {
		difficulty: (settings as any).aiDifficulty,
		timeBudgetMs: (settings as any).turnTimeoutMs ?? undefined,
		// seed could be added for reproducible matches: settings.aiSeed
		seed: (settings as any).aiSeed ?? undefined,
	}

	// propagate diagnostics settings into AI run options
	if ((settings as any).aiDiagnosticsEnabled) {
		aiOptions.diagnosticsStreaming = !!(settings as any).aiDiagnosticsStreaming
		aiOptions.diagnosticsThrottleMs = Number((settings as any).aiDiagnosticsThrottleMs) || 200
	}

	// indicate thinking in the debug overlay
	const dbg = document.getElementById('debug-overlay')
	if (dbg) dbg.textContent = `AI thinking... (${gameState.currentPlayer})`
	if (aiThinkingIndicator) {
		aiThinkingIndicator.textContent = `AI thinking... (${gameState.currentPlayer})`
		aiThinkingIndicator.style.opacity = '1'
	}

	// call startAIMove; it starts the turn timer and returns the move promise
	startAIMove(gameState, gameState.currentPlayer, turnTimer, aiOptions, (thinking) => {
		if (aiThinkingIndicator) aiThinkingIndicator.style.opacity = thinking ? '1' : '0'
		if (!thinking) {
			// restore debug overlay shortly after thinking stops
			setTimeout(() => { if (dbg) dbg.textContent = hoverTarget ? `hover: b${hoverTarget.smallIndex} c${hoverTarget.cellIndex}` : 'hover: none' }, 120)
		}
	}).then((mv) => {
		// apply move only if still legal and game not over
		if (!gameOver && isLegalMove(gameState, mv)) {
			// small delay to match previous pacing
			setTimeout(() => applyMoveIntent({ board: mv.board, cell: mv.cell }), 200)
		}
	}).catch((err) => {
		// on abort or error, fall back to a random move to keep game progressing
		if (gameOver) return
		const avail = getLegalMoves(gameState)
		if (!avail || avail.length === 0) return
		const fallback = avail[Math.floor(Math.random() * avail.length)]
		if (isLegalMove(gameState, fallback)) setTimeout(() => applyMoveIntent({ board: fallback.board, cell: fallback.cell }), 200)
	})
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
			// cancel any in-flight AI thinking before resetting
			try { cancelAIMove() } catch (e) {}
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
				// pause timer while in replay mode
				turnTimer.pause()
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
				// pause timer while in replay mode
				turnTimer.pause()
			}
			replay.next()
			if (replay.index === null) {
				inReplayMode = false
				input.attach()
				// resume timer when leaving replay (keep remaining)
				if (!gameOver) turnTimer.resumeForEpoch(turnTimer.currentEpoch(), (epoch, expected) => {}, gameState.currentPlayer)
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
	const vm = getRenderableState(displayedState, { hoverCell, hoverAlpha, lastMove: lastMove ? { smallIndex: lastMove.smallIndex, cellIndex: lastMove.cellIndex } : null, illegal, gameOver, winner, draw, shake, animatingMove: settings.animations ? animatingMove : null, boardWinAnim: settings.animations ? boardWinAnim : null, replayAvailable: replay.entries.length > 0, inReplayMode, replayIndex: replay.index, historyLength: replay.entries.length, historyEntries, replayPlaying: replay.playing, replaySpeedMs: replay.speedMs, analysisEnabled, aiEnabled, turnTimerRemainingMs: turnTimer.getRemainingMs(), turnTimerRunning: turnTimer.isRunning(), turnTimeoutMs: (settings as any).turnTimeoutMs, settings: (settings as any) })
		// inject diagnostics into renderable when analysis+diagnostics enabled and diagnostics available
		if (analysisEnabled && (settings as any).aiDiagnosticsEnabled && latestAIDiagnostics) {
			// If we're viewing the live game state, attach latest diagnostics directly
			if (displayedState === gameState && latestAIDiagnostics.stateId) {
				;(vm as any).analysis = { ...(vm as any).analysis || {}, diagnostics: latestAIDiagnostics }
			} else {
				// If viewing a replay/history snapshot, try to match diagnostics by stateId
				const entry = replay.currentEntry()
				const histStateId = (entry && (entry as any).stateId) || null
				if (histStateId && latestAIDiagnostics.stateId === histStateId) {
					;(vm as any).analysis = { ...(vm as any).analysis || {}, diagnostics: latestAIDiagnostics }
				}
			}
		}
	drawGameSurface(ctx, { boardSize, hudHeight }, vm)
	requestAnimationFrame(renderLoop)
}

renderLoop()

// If explanation worker warms the cache, request an immediate render to pick up cached results.
if (typeof window !== 'undefined') {
	window.addEventListener('ai:explain-cache-updated', () => {
		try { requestAnimationFrame(renderLoop) } catch (e) {}
	})
}

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
		aiEnabled = !aiEnabled;
		(settings as any).aiEnabled = aiEnabled
		saveSettings(settings)
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
	else if (e.key === 'y') {
		analysisEnabled = !analysisEnabled
		console.log('Toggled analysis:', analysisEnabled)
	}
	// Undo / Redo keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y
	const isMod = e.ctrlKey || e.metaKey
	if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
		e.preventDefault()
		performUndo()
	} else if ((isMod && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMod && e.key.toLowerCase() === 'y')) {
		e.preventDefault()
		performRedo()
	}
})
