
// Canvas-based renderer for board and HUD
export interface RendererOptions {
  boardSize: number;
  hudHeight: number;
}

import { RenderableState } from './view-model-adapter'
import { easingProgress, now } from './animations'
import tokens from './visual-tokens'

function hexToRgba(hex: string, alpha: number) {
  // Accept #rrggbb or #rgb
  const h = hex.replace('#', '')
  let r = 0, g = 0, b = 0
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16)
    g = parseInt(h[1] + h[1], 16)
    b = parseInt(h[2] + h[2], 16)
  } else if (h.length === 6) {
    r = parseInt(h.substring(0, 2), 16)
    g = parseInt(h.substring(2, 4), 16)
    b = parseInt(h.substring(4, 6), 16)
  }
  return `rgba(${r},${g},${b},${alpha})`
}

export function drawGameSurface(
  ctx: CanvasRenderingContext2D,
  options: RendererOptions,
  view: RenderableState
) {
  function safeFillText(text: string, x: number, y: number) {
    // wrap call to avoid ASI pitfalls
    ctx.fillText(text, x, y)
  }
  const { boardSize, hudHeight } = options;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw HUD background
  ctx.save();
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, boardSize, hudHeight);
  ctx.restore();

  // Small status badges (right side)
  ctx.save();
  const analysisOn = !!((view as any).settings?.analysisEnabled ?? (view as any).analysisEnabled)
  const aiOn = !!(view as any).aiEnabled
  ctx.fillStyle = '#222';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  const pad = 12
  safeFillText(`AI: ${aiOn ? 'ON' : 'OFF'}`, boardSize - pad, hudHeight / 2 - 6)
  safeFillText(`Analysis: ${analysisOn ? 'ON' : 'OFF'}`, boardSize - pad, hudHeight / 2 + 12)
  ctx.restore();

  // Show top explanation when analysis enabled
  if (analysisOn && (view as any).analysis && (view as any).analysis.bestExplanation) {
    const be = (view as any).analysis.bestExplanation as { board: number; cell: number; explanation: { score?: number; reasons?: string[] } }
    if (be && be.explanation) {
      ctx.save()
      const panelX = boardSize + 16
      const panelY = 8
      const panelW = 240
      const panelH = 60
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      roundRect(ctx, panelX, panelY, panelW, panelH, 8, true, false)
      ctx.fillStyle = '#111'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      const title = `Top move: B${be.board} C${be.cell} (score ${Math.round(be.explanation.score ?? 0)})`
      safeFillText(title, panelX + 8, panelY + 18)
      if (be.explanation.reasons && be.explanation.reasons.length > 0) {
        safeFillText(be.explanation.reasons[0], panelX + 8, panelY + 36)
        if (be.explanation.reasons.length > 1) safeFillText(be.explanation.reasons[1], panelX + 8, panelY + 52)
      }
      ctx.restore()
    }
  }

  // Draw per-turn timer (if provided)
  if (typeof (view as any).turnTimerRemainingMs !== 'undefined' && typeof (view as any).turnTimeoutMs === 'number') {
    const rem = (view as any).turnTimerRemainingMs as number | null
    const tout = (view as any).turnTimeoutMs as number
    const running = !!(view as any).turnTimerRunning
    const pct = rem === null ? 0 : Math.max(0, Math.min(1, rem / Math.max(1, tout)))
    // Draw small circular progress at HUD left
    const cx = 48
    const cy = hudHeight / 2
    const radius = 18
    // background ring
    ctx.save()
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(200,200,200,0.5)'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    // progress arc
    ctx.strokeStyle = running ? 'rgba(2,112,255,0.95)' : 'rgba(120,120,120,0.6)'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
    ctx.stroke()
    // time text
    ctx.fillStyle = '#222'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const sec = rem === null ? Math.ceil(tout / 1000) : Math.ceil(rem / 1000)
    safeFillText(`${sec}s`, cx, cy)
    ctx.restore()
  }

  // If shake is active, apply translation to the board drawing region
  const shakeX = view.shake?.x ?? 0
  const shakeY = view.shake?.y ?? 0

  // Draw board background (apply shake by translating the board group)
  ctx.save();
  // translate to allow shaking the board area only
  ctx.translate(shakeX, shakeY);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, hudHeight, boardSize, boardSize);
  ctx.restore();

  // Draw outer board grid (9x9 for super ultimate tic-tac-toe)
  ctx.save();
  ctx.strokeStyle = tokens.colors.boardGrid;
  ctx.lineWidth = tokens.strokes.cellLine;
  const cellSize = boardSize / 9;
  for (let i = 0; i <= 9; i++) {
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(i * cellSize, hudHeight);
    ctx.lineTo(i * cellSize, hudHeight + boardSize);
    ctx.stroke();
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, hudHeight + i * cellSize);
    ctx.lineTo(boardSize, hudHeight + i * cellSize);
    ctx.stroke();
  }
  ctx.restore();

  // Draw sub-board separators (thicker)
  ctx.save();
  ctx.strokeStyle = tokens.colors.boardGridStrong;
  ctx.lineWidth = tokens.strokes.subboardLine;
  for (let i = 0; i <= 9; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, hudHeight);
    ctx.lineTo(i * cellSize, hudHeight + boardSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, hudHeight + i * cellSize);
    ctx.lineTo(boardSize, hudHeight + i * cellSize);
    ctx.stroke();
  }
  ctx.restore();

  // Draw small-board overlays (won/full) and active highlight
  // Apply the same shake translation when drawing board elements so overlays and cells move together
  ctx.save();
  ctx.translate(shakeX, shakeY);
  for (let sb = 0; sb < 9; sb++) {
    const sbRow = Math.floor(sb / 3)
    const sbCol = sb % 3
    const x = sbCol * cellSize * 3
    const y = hudHeight + sbRow * cellSize * 3

    const status = view.smallBoardStatus[sb]

    // Gray out closed boards
    if (status.kind === 'won') {
      ctx.save()
      ctx.fillStyle = status.winner === 'X' ? 'rgba(212,63,63,0.18)' : 'rgba(31,98,212,0.18)'
      ctx.fillRect(x, y, cellSize * 3, cellSize * 3)
      // Large glyph
      ctx.fillStyle = 'rgba(34,34,34,0.9)'
      ctx.font = `${Math.floor(cellSize * 2)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      safeFillText(status.winner, x + (cellSize * 3) / 2, y + (cellSize * 3) / 2)
      ctx.restore()
    } else if (status.kind === 'full') {
      ctx.save()
      ctx.fillStyle = 'rgba(102,102,102,0.12)'
      ctx.fillRect(x, y, cellSize * 3, cellSize * 3)
      ctx.restore()
    }

    // Active small board highlight
    if (view.activeSmallIndex === sb && status.kind === 'open') {
      ctx.save()
      ctx.fillStyle = hexToRgba(tokens.colors.accent, 0.06)
      ctx.fillRect(x, y, cellSize * 3, cellSize * 3)
      ctx.lineWidth = Math.max(2, tokens.strokes.subboardLine)
      ctx.strokeStyle = hexToRgba(tokens.colors.accentStrong || tokens.colors.accent, 0.92)
      ctx.strokeRect(x + 2, y + 2, cellSize * 3 - 4, cellSize * 3 - 4)
      ctx.restore()
    }
  }
  ctx.restore()

  // Analysis overlays: forced-board highlight (board-level)
  if ((view as any).analysisEnabled && (view as any).analysis) {
    const analysis = (view as any).analysis as { forcedBoard: number | null; legalMoves: { board: number; cell: number }[] }
    const fb = analysis.forcedBoard
    if (typeof fb === 'number') {
      const sbRow = Math.floor(fb / 3)
      const sbCol = fb % 3
      const x = sbCol * cellSize * 3
      const y = hudHeight + sbRow * cellSize * 3
      ctx.save()
      ctx.translate(shakeX, shakeY)
      // use intensity from settings if provided
      const intensity = (view.settings && typeof view.settings.forcedBoardIntensity === 'number') ? view.settings.forcedBoardIntensity : 0.06
      ctx.fillStyle = hexToRgba(tokens.colors.forced, Math.max(0, Math.min(1, intensity)))
      ctx.fillRect(x, y, cellSize * 3, cellSize * 3)
      ctx.lineWidth = Math.max(1, 2 * intensity)
      ctx.strokeStyle = hexToRgba(tokens.colors.accentStrong || tokens.colors.accent, Math.max(0, Math.min(1, Math.min(0.95, 0.92 + intensity))))
      ctx.strokeRect(x + 2, y + 2, cellSize * 3 - 4, cellSize * 3 - 4)
      ctx.restore()
    }
  }

  // Draw thin cell separators on top so overlays don't hide lines
  ctx.save();
  ctx.strokeStyle = tokens.colors.boardGrid;
  ctx.lineWidth = tokens.strokes.cellLine;
  for (let i = 0; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, hudHeight);
    ctx.lineTo(i * cellSize, hudHeight + boardSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, hudHeight + i * cellSize);
    ctx.lineTo(boardSize, hudHeight + i * cellSize);
    ctx.stroke();
  }
  ctx.restore();

  // Threat lines (2-in-a-row) - draw above separators but beneath last-move and cell marks
  if ((view as any).analysisEnabled && (view as any).analysis && (view as any).analysis.threatLines) {
    const threats = (view as any).analysis.threatLines as { board: number; a: number; b: number; target: number }[]
    ctx.save()
    ctx.translate(shakeX, shakeY)
    // color for current player's threats
    const col = hexToRgba(tokens.colors.winLine, 0.9)
    ctx.strokeStyle = col
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (const t of threats) {
      const sbRow = Math.floor(t.board / 3)
      const sbCol = t.board % 3
      const aRow = Math.floor(t.a / 3)
      const aCol = t.a % 3
      const bRow = Math.floor(t.b / 3)
      const bCol = t.b % 3
      const globalARow = sbRow * 3 + aRow
      const globalACol = sbCol * 3 + aCol
      const globalBRow = sbRow * 3 + bRow
      const globalBCol = sbCol * 3 + bCol
      const ax = globalACol * cellSize + cellSize / 2
      const ay = hudHeight + globalARow * cellSize + cellSize / 2
      const bx = globalBCol * cellSize + cellSize / 2
      const by = hudHeight + globalBRow * cellSize + cellSize / 2
      // draw line between the two occupied cells
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
      // draw small target marker
      const tRow = Math.floor(t.target / 3)
      const tCol = t.target % 3
      const globalTRow = sbRow * 3 + tRow
      const globalTCol = sbCol * 3 + tCol
      const tx = globalTCol * cellSize + cellSize / 2
      const ty = hudHeight + globalTRow * cellSize + cellSize / 2
      ctx.save()
      ctx.fillStyle = hexToRgba(tokens.colors.winLine, 0.18)
      ctx.beginPath()
      ctx.arc(tx, ty, cellSize * 0.22, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }

  // AI diagnostics heatmap + top-N list (subtle)
  if ((view as any).analysisEnabled && (view as any).settings?.aiDiagnosticsEnabled && (view as any).analysis && (view as any).analysis.diagnostics) {
    try {
      const diag = (view as any).analysis.diagnostics as any
      const top = Array.isArray(diag.topMoves) ? diag.topMoves : []
      // draw heatmap: circles at cell centers with alpha proportional to visits (normalized)
      const maxVisits = top.reduce((m, t) => Math.max(m, t.visits || 0), 0) || 1
      ctx.save()
      ctx.translate(shakeX, shakeY)
      for (const t of top) {
        const sb = t.board
        const cell = t.cell
        const sbRow = Math.floor(sb / 3)
        const sbCol = sb % 3
        const cellRow = Math.floor(cell / 3)
        const cellCol = cell % 3
        const globalRow = sbRow * 3 + cellRow
        const globalCol = sbCol * 3 + cellCol
        const cx = globalCol * cellSize + cellSize / 2
        const cy = hudHeight + globalRow * cellSize + cellSize / 2
        const alpha = Math.max(0.06, Math.min(0.9, (t.visits || 0) / maxVisits * 0.9))
        ctx.beginPath()
        ctx.fillStyle = `rgba(200,40,40,${alpha.toFixed(3)})`
        ctx.arc(cx, cy, cellSize * 0.36, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // top-N list panel
      const panelX = boardSize + 16
      const panelY = 80 + 80
      const panelW = 240
      const itemH = 18
      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      roundRect(ctx, panelX, panelY, panelW, Math.min(12, top.length) * itemH + 12, 8, true, false)
      ctx.fillStyle = '#111'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      for (let i = 0; i < Math.min(10, top.length); i++) {
        const t = top[i]
        const y = panelY + 8 + i * itemH
        const label = `#${i + 1} B${t.board}C${t.cell}`
        const stats = `${t.visits} visits ${Math.round((t.value ?? 0) * 100) / 100}`
        safeFillText(label.padEnd(18) + stats, panelX + 8, y + 12)
      }
      ctx.restore()
    } catch (e) {}
  }

  // Draw cell-level marks (X/O) and last-move highlight + hover
  ctx.save()
  ctx.translate(shakeX, shakeY)
  for (let sb = 0; sb < 9; sb++) {
    const sbRow = Math.floor(sb / 3)
    const sbCol = sb % 3
    for (let cell = 0; cell < 9; cell++) {
      const cellRow = Math.floor(cell / 3)
      const cellCol = cell % 3
      const globalRow = sbRow * 3 + cellRow
      const globalCol = sbCol * 3 + cellCol
      const cx = globalCol * cellSize + cellSize / 2
      const cy = hudHeight + globalRow * cellSize + cellSize / 2

      const val = view.bigBoard[sb][cell]
      if (val) {
        ctx.save()
        ctx.fillStyle = '#111'
        ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        safeFillText(val, cx, cy)
        ctx.restore()
      }

      // Analysis: legal move marker (draw under last-move highlight)
      if ((view as any).analysisEnabled && (view as any).analysis) {
        const analysis = (view as any).analysis as { forcedBoard: number | null; legalMoves: { board: number; cell: number }[] }
        const isLegal = analysis.legalMoves.some((m) => m.board === sb && m.cell === cell)
        // don't draw markers in closed boards
        const sbStatus = view.smallBoardStatus[sb]
        if (isLegal && sbStatus.kind === 'open') {
          ctx.save()
          ctx.fillStyle = hexToRgba(tokens.colors.accent, 0.12)
          ctx.beginPath()
          ctx.arc(cx, cy, cellSize * 0.16, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      // Last move
      const showLast = view.settings?.showLastMoveHighlight ?? true
      if (showLast && view.lastMove && view.lastMove.smallIndex === sb && view.lastMove.cellIndex === cell) {
        ctx.save()
        ctx.beginPath()
        ctx.fillStyle = tokens.colors.lastMove
        ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Hover (smoothed alpha if provided)
      const hoverAlpha = (view as any).hoverAlpha ?? 1
      if (view.hoverCell && view.hoverCell.smallIndex === sb && view.hoverCell.cellIndex === cell && hoverAlpha > 0) {
        ctx.save()
        const baseFill = 0.12
        const baseStroke = 0.95
        ctx.fillStyle = `rgba(255,215,0,${(baseFill * hoverAlpha).toFixed(3)})`
        ctx.fillRect(globalCol * cellSize + 1, hudHeight + globalRow * cellSize + 1, cellSize - 2, cellSize - 2)
        ctx.strokeStyle = `rgba(255,183,0,${(baseStroke * hoverAlpha).toFixed(3)})`
        ctx.lineWidth = 2 * Math.max(0.6, hoverAlpha)
        ctx.strokeRect(globalCol * cellSize + 4, hudHeight + globalRow * cellSize + 4, cellSize - 8, cellSize - 8)
        ctx.restore()
      }
    }
  }
  ctx.restore()

  // Animating move (scale/fade)
  if (view.animatingMove) {
    const a = view.animatingMove
    const progress = Math.max(0, Math.min(1, (now() - a.start) / a.duration))
    const p = 1 - Math.pow(1 - progress, 3)
    const sb = a.smallIndex
    const cell = a.cellIndex
    const sbRow = Math.floor(sb / 3)
    const sbCol = sb % 3
    const cellRow = Math.floor(cell / 3)
    const cellCol = cell % 3
    const globalRow = sbRow * 3 + cellRow
    const globalCol = sbCol * 3 + cellCol
    const cx = globalCol * cellSize + cellSize / 2 + shakeX
    const cy = hudHeight + globalRow * cellSize + cellSize / 2 + shakeY
    const val = view.bigBoard[sb][cell]
    if (val) {
      ctx.save()
      ctx.globalAlpha = p
      const scale = 0.6 + 0.4 * p
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)
      ctx.fillStyle = '#111'
      ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      safeFillText(val, 0, 0)
      ctx.restore()
    }
  }

  // Board win animation
  if (view.boardWinAnim) {
    const b = view.boardWinAnim
    const progress = Math.max(0, Math.min(1, (now() - b.start) / b.duration))
    const p = Math.sin(progress * Math.PI) // ease in/out
    const sb = b.smallIndex
    const sbRow = Math.floor(sb / 3)
    const sbCol = sb % 3
    const x = sbCol * cellSize * 3 + shakeX
    const y = hudHeight + sbRow * cellSize * 3 + shakeY
    // draw expanding translucent overlay and large glyph scale
    ctx.save()
    ctx.globalAlpha = 0.18 + 0.6 * p
    ctx.fillStyle = '#ffd54d'
    ctx.fillRect(x, y, cellSize * 3, cellSize * 3)
    ctx.restore()
    // large glyph
    const glyphX = x + (cellSize * 3) / 2
    const glyphY = y + (cellSize * 3) / 2
    ctx.save()
    ctx.translate(glyphX, glyphY)
    const scale = 0.6 + 0.6 * p
    ctx.scale(scale, scale)
    ctx.fillStyle = 'rgba(34,34,34,0.95)'
    ctx.font = `${Math.floor(cellSize * 1.2)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // determine winner glyph by inspecting small board center
    const centerCell = view.bigBoard[sb][4]
    safeFillText(centerCell ? centerCell : ' ', 0, 0)
    ctx.restore()
  }

  // (Illegal feedback handled as shake animation applied to board)

  // Draw HUD: current player + forced board indicator
  ctx.save()
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(boardSize + 16, 0, 200, hudHeight)
  ctx.fillStyle = '#222'
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'left'
  safeFillText(`Current: ${view.currentPlayer}`, boardSize + 28, hudHeight / 2 + 6)
  const forcedText = view.activeSmallIndex === null ? 'Free move' : `Forced: ${view.activeSmallIndex}`
  safeFillText(forcedText, boardSize + 28, hudHeight / 2 + 28)
  // settings indicator
  const animOn = (view as any).settings?.animations !== false
  safeFillText(`Animations: ${animOn ? 'On' : 'Off'}`, boardSize + 28, hudHeight / 2 + 48)
  ctx.restore()

  // Move list panel (right side under HUD)
  if ((view as any).historyEntries && (view as any).historyEntries.length > 0) {
    ctx.save()
    const list = (view as any).historyEntries as { move?: { board: number; cell: number }; ts?: number }[]
    const panelX = boardSize + 16
    const panelY = hudHeight + 8
    const panelW = 240
    const itemH = 20
    const maxItems = Math.min(10, list.length)
    ctx.fillStyle = 'rgba(250,250,250,0.98)'
    roundRect(ctx, panelX, panelY, panelW, itemH * maxItems + 12, 8, true, false)
    ctx.fillStyle = '#222'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    for (let i = 0; i < maxItems; i++) {
      const entry = list[list.length - 1 - i]
      const y = panelY + 8 + i * itemH
      const idx = list.length - i
      const moveLabel = entry.move ? `#${idx} B${entry.move.board}C${entry.move.cell}` : `#${idx} (start)`
      const ts = entry.ts ? new Date(entry.ts).toLocaleTimeString() : ''
      safeFillText(moveLabel.padEnd(18) + ts, panelX + 8, y + 14)
    }
    ctx.restore()
  }

  // Game over banner (win or draw) with an in-canvas Retry button
  if (view.gameOver) {
    ctx.save()
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    // dim background
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, w, h)

    // banner panel
    const panelW = Math.min(640, w - 80)
    const panelH = 160
    const px = (w - panelW) / 2
    const py = (h - panelH) / 2
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, px, py, panelW, panelH, 12, true, false)

    // message
    ctx.fillStyle = '#111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '36px sans-serif'
    const msg = view.winner ? `${view.winner} wins!` : view.draw ? 'Draw' : 'Game Over'
    safeFillText(msg, w / 2, py + 20)

    // Retry button
    const btnW = 140
    const btnH = 44
    const bx = w / 2 - btnW / 2
    const by = py + panelH - btnH - 18
    ctx.fillStyle = '#0b74ff'
    roundRect(ctx, bx, by, btnW, btnH, 8, true, false)
    ctx.fillStyle = '#fff'
    ctx.font = '18px sans-serif'
    ctx.textBaseline = 'middle'
    safeFillText('Retry', w / 2, by + btnH / 2)

    // store last banner button rect on the canvas element for click testing
    ;(ctx.canvas as any).__gameOverButton = { x: bx, y: by, w: btnW, h: btnH }

    ctx.restore()
  } else {
    // clear any previous stored rect
    delete (ctx.canvas as any).__gameOverButton
  }

  // Replay controls
  if (view.replayAvailable) {
    ctx.save()
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    const btnSize = 44
    const gap = 12
    const right = w - 20
    const bottom = h - 20
    // Next button
    const nextX = right - btnSize
    const nextY = bottom - btnSize
    // Prev button
    const prevX = nextX - btnSize - gap
    const prevY = nextY

    // Draw prev
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, prevX, prevY, btnSize, btnSize, 6, true, false)
    ctx.fillStyle = '#111'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    safeFillText('Prev', prevX + btnSize / 2, prevY + btnSize / 2)

    // Draw next
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, nextX, nextY, btnSize, btnSize, 6, true, false)
    ctx.fillStyle = '#111'
    safeFillText('Next', nextX + btnSize / 2, nextY + btnSize / 2)

    // Play/Pause button left of prev
    const playX = prevX - btnSize - gap
    const playY = prevY
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, playX, playY, btnSize, btnSize, 6, true, false)
    ctx.fillStyle = '#111'
    ctx.font = '18px sans-serif'
    const playLabel = view.replayPlaying ? 'Pause' : 'Play'
    safeFillText(playLabel, playX + btnSize / 2, playY + btnSize / 2)

    // Speed display and +/- small buttons
    const speedW = 80
    const speedH = 28
    const speedX = playX - speedW - gap
    const speedY = playY + (btnSize - speedH) / 2
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    roundRect(ctx, speedX, speedY, speedW, speedH, 6, true, false)
    ctx.fillStyle = '#111'
    ctx.font = '14px sans-serif'
    const spMs = (view.replaySpeedMs ?? 700);
    const spLabel = `${Math.round(spMs)}ms`;
    // avoid calling an undefined fillText in some environments
    const _ft = (ctx as any).fillText
    if (typeof _ft === 'function') _ft.call(ctx, spLabel, speedX + speedW / 2, speedY + speedH / 2)

    // store controls rects
    (ctx.canvas as any).__replayControls = {
      prev: { x: prevX, y: prevY, w: btnSize, h: btnSize },
      next: { x: nextX, y: nextY, w: btnSize, h: btnSize },
      play: { x: playX, y: playY, w: btnSize, h: btnSize },
      speed: { x: speedX, y: speedY, w: speedW, h: speedH },
    }

    // Draw replay index if provided
    if (typeof view.replayIndex === 'number' && typeof view.historyLength === 'number') {
      ctx.fillStyle = '#fff'
      ctx.font = '14px sans-serif'
      safeFillText(`${view.replayIndex + 1}/${view.historyLength}`, prevX - 46, prevY + btnSize / 2)
    }

    // handled above

    ctx.restore()
  } else {
    delete (ctx.canvas as any).__replayControls
  }

  // Timeline bar above controls
  if (view.replayAvailable) {
    ctx.save()
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    const barW = Math.min(480, w - 140)
    const barH = 10
    const barX = (w - barW) / 2
    const barY = h - 80
    // background track
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    roundRect(ctx, barX, barY, barW, barH, 6, true, false)
    // progress
    const total = (view.historyLength ?? 1)
    const idx = (typeof view.replayIndex === 'number' ? view.replayIndex : total - 1)
    const progressW = total > 0 ? (idx / Math.max(1, total - 1)) * barW : 0
    ctx.fillStyle = '#0b74ff'
    roundRect(ctx, barX, barY, Math.max(4, progressW), barH, 6, true, false)
    // store timeline rect
    ;(ctx.canvas as any).__replayTimeline = { x: barX, y: barY, w: barW, h: barH }
    ctx.restore()
  } else {
    delete (ctx.canvas as any).__replayTimeline
  }
}

// helper: rounded rectangle
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
  if (r < 0) r = 0
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}

export function getGameOverButtonRect(canvas: HTMLCanvasElement) {
  return (canvas as any).__gameOverButton || null
}

export function getReplayControlRects(canvas: HTMLCanvasElement) {
  return (canvas as any).__replayControls || null
}
