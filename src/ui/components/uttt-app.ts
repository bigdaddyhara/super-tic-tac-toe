import tokensCssText from '../../styles/tokens.css?inline'
import layoutCssText from '../../styles/layout.css?inline'
import componentsCssText from '../../styles/components.css?inline'
import type { GameController } from '../game-controller'
import { bindControllerToDOM } from '../dom-bindings'
import type { UTTTHudElement } from './uttt-hud'
import type { UTTTControlsElement } from './uttt-controls'
import type { UTTTSettingsElement } from './uttt-settings'
import type { UTTTToastElement } from './uttt-toast'
import type { UTTTHelpElement } from './uttt-help'
import { loadSettings, resetSettings, saveSettings } from '../settings-store'
import type { UTTTSettings } from '../settings-types'
import { isDraw, isGameOver } from '../game-adapter'

const styles = `${tokensCssText}\n${layoutCssText}\n${componentsCssText}`

export interface UTTTMountPoints {
  canvas: HTMLCanvasElement | null
  hud: HTMLElement | null
  controls: HTMLElement | null
  settings: HTMLElement | null
  help: HTMLElement | null
  toast: HTMLElement | null
  openSettingsBtn: HTMLButtonElement | null
  openHelpBtn: HTMLButtonElement | null
  statusAnnouncer: HTMLElement | null
  aiIndicator: HTMLElement | null
  endgameOverlay: HTMLElement | null
  endgameMessage: HTMLElement | null
  playAgainBtn: HTMLButtonElement | null
}

export class UTTTAppElement extends HTMLElement {
  private cleanupBindings: (() => void) | null = null
  private controller: GameController | null = null
  private settings: UTTTSettings = loadSettings()
  private lastAnnouncedStatus = ''
  private settingsSavedToastTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  private boundOpenHelp = (): void => {
    const helpEl = this.getMountPoints().help as UTTTHelpElement | null
    helpEl?.open()
  }
  private boundOpenSettings = (): void => {
    const settingsEl = this.getMountPoints().settings as UTTTSettingsElement | null
    settingsEl?.open()
  }
  private boundHistoryChanged = (): void => {
    this.updateLiveStatus()
  }
  private boundMoveRejected = (event: Event): void => {
    const customEvent = event as CustomEvent<{ reason?: string }>
    const reason = customEvent.detail?.reason
    const message =
      reason === 'terminal'
        ? 'Game already finished. Start a new game to continue.'
        : 'Illegal move. Choose a highlighted legal cell.'
    this.notify(message, 'warning')
  }
  private boundGameOver = (event: Event): void => {
    const customEvent = event as CustomEvent<{ result?: 'win' | 'draw'; winner?: 'X' | 'O' | null }>
    const result = customEvent.detail?.result
    const winner = customEvent.detail?.winner
    const message = result === 'draw' ? 'Game over: Draw.' : `Game over: ${winner ?? 'Unknown'} wins.`
    this.notify(message, 'success', 4200)
    this.updateLiveStatus(message)
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }

    if (!this.shadowRoot || this.shadowRoot.childElementCount > 0) {
      return
    }

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="shell">
        <header class="shell__header panel" aria-label="Application header">
          <div class="app-header-inner">
            <div class="app-title-group">
              <h1 class="app-title">Super Tic-Tac-Toe</h1>
              <p class="app-subtitle">Ultimate Edition — outsmart the grid</p>
            </div>
            <div class="status-row" data-testid="hud-host" aria-label="HUD host">
              <uttt-hud id="hud"></uttt-hud>
            </div>
          </div>
        </header>

        <main class="shell__main" aria-label="Board area">
          <section class="canvas-stage">
            <div class="canvas-host" data-testid="canvas-host">
              <canvas
                id="game-canvas"
                class="canvas"
                width="720"
                height="800"
                tabindex="0"
                role="application"
                aria-label="Super Tic-Tac-Toe board"
              ></canvas>
              <div id="endgame-overlay" hidden aria-live="polite" aria-label="Game result overlay">
                <div id="endgame-message">Game Over</div>
                <button id="play-again-btn" class="button" type="button" aria-label="Play game again">Play Again</button>
              </div>
            </div>
          </section>
        </main>

        <aside class="shell__aside" aria-label="Controls panel">
          <section class="panel" id="controls-host" data-testid="controls-host">
            <uttt-controls id="controls"></uttt-controls>
          </section>

          <section class="panel" id="settings-host" data-testid="settings-host" aria-label="Settings host">
            <div class="settings-action-row">
              <button
                id="open-settings-btn"
                class="button button--wide"
                type="button"
                aria-label="Open settings"
                title="Open settings"
              >⚙ Settings</button>

              <button
                id="open-help-btn"
                class="button button--ghost button--wide"
                type="button"
                aria-label="Open help"
                title="Open help and shortcuts"
              >? How to Play</button>
            </div>

            <div class="ai-indicator" id="ai-indicator" role="status" aria-live="polite">
              AI: idle
            </div>

            <uttt-settings id="settings"></uttt-settings>
            <uttt-help id="help"></uttt-help>
          </section>
        </aside>

        <footer class="shell__footer panel">
          <p class="footer-help">⌘/Ctrl+Z undo &nbsp;·&nbsp; ⇧+⌘/Ctrl+Z redo &nbsp;·&nbsp; N new game</p>
        </footer>

        <div id="status-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>
        <uttt-toast id="toast"></uttt-toast>
      </div>
    `
  }

  disconnectedCallback(): void {
    this.cleanupBindings?.()
    this.cleanupBindings = null
    if (this.settingsSavedToastTimer !== null) {
      globalThis.clearTimeout(this.settingsSavedToastTimer)
      this.settingsSavedToastTimer = null
    }
    this.removeEventListener('uttt:settings-changed', this.onSettingsChanged as EventListener)
    this.removeEventListener('uttt:settings-reset', this.onSettingsReset as EventListener)
    window.removeEventListener('history:changed', this.boundHistoryChanged)
    window.removeEventListener('uttt:move-rejected', this.boundMoveRejected as EventListener)
    window.removeEventListener('uttt:game-over', this.boundGameOver as EventListener)

    if (!this.shadowRoot) return
    const mountPoints = this.getMountPoints()
    mountPoints.openSettingsBtn?.removeEventListener('click', this.boundOpenSettings)
    mountPoints.openHelpBtn?.removeEventListener('click', this.boundOpenHelp)
  }

  bindController(controller: GameController): void {
    this.controller = controller

    const mountPoints = this.getMountPoints()
    const hud = mountPoints.hud as UTTTHudElement | null
    const controls = mountPoints.controls as UTTTControlsElement | null
    const settingsEl = mountPoints.settings as UTTTSettingsElement | null
    const helpEl = mountPoints.help as UTTTHelpElement | null
    const openSettingsBtn = mountPoints.openSettingsBtn
    const openHelpBtn = mountPoints.openHelpBtn

    if (!hud || !controls || !settingsEl || !helpEl) {
      throw new Error('UTTTAppElement: expected uttt-hud, uttt-controls, uttt-settings, and uttt-help elements.')
    }

    this.cleanupBindings?.()
    this.cleanupBindings = bindControllerToDOM({
      controller,
      hud,
      controls,
      eventTarget: this,
      onToggleAnalysis: (enabled) => {
        this.applySettings({
          ...this.settings,
          analysisModeDefault: enabled,
        })
      },
    })

    controls.setAnalysisAvailable(true)

    settingsEl.setAIAvailable(true)
    settingsEl.setSettings(this.settings)
    helpEl.close()

    openSettingsBtn?.removeEventListener('click', this.boundOpenSettings)
    openHelpBtn?.removeEventListener('click', this.boundOpenHelp)
    openSettingsBtn?.addEventListener('click', this.boundOpenSettings)
    openHelpBtn?.addEventListener('click', this.boundOpenHelp)

    this.addEventListener('uttt:settings-changed', this.onSettingsChanged as EventListener)
    this.addEventListener('uttt:settings-reset', this.onSettingsReset as EventListener)
    window.addEventListener('history:changed', this.boundHistoryChanged)
    window.addEventListener('uttt:move-rejected', this.boundMoveRejected as EventListener)
    window.addEventListener('uttt:game-over', this.boundGameOver as EventListener)

    controller.setOnAIThinking?.((thinking) => {
      const indicator = this.getMountPoints().aiIndicator
      if (!indicator) return
      indicator.textContent = thinking ? '🤖 AI is thinking…' : 'AI: idle'
    })

    this.applySettings(this.settings)
    this.updateLiveStatus()
  }

  private onSettingsChanged = (event: Event): void => {
    const customEvent = event as CustomEvent<UTTTSettings>
    const nextSettings = customEvent.detail
    this.applySettings(nextSettings)
    if (this.settingsSavedToastTimer !== null) {
      globalThis.clearTimeout(this.settingsSavedToastTimer)
    }
    this.settingsSavedToastTimer = globalThis.setTimeout(() => {
      this.notify('Settings saved.', 'success')
      this.settingsSavedToastTimer = null
    }, 220)
  }

  private onSettingsReset = (): void => {
    const defaults = resetSettings()
    this.applySettings(defaults)
  }

  private applySettings(settings: UTTTSettings): void {
    this.settings = { ...settings }
    saveSettings(this.settings)

    const settingsEl = this.getMountPoints().settings as UTTTSettingsElement | null
    const controls = this.getMountPoints().controls as UTTTControlsElement | null
    settingsEl?.setSettings(this.settings)
    controls?.setAnalysisEnabled(this.settings.analysisModeDefault)

    if (!this.controller) return

    try {
      this.controller.setTimerConfig?.({
        enabled: this.settings.timerPerTurnEnabled,
        secondsPerTurn: this.settings.secondsPerTurn,
      })
    } catch {
      this.notify('Timer settings are unavailable in this build.', 'info')
    }

    try {
      this.controller.setAnalysisEnabled?.(this.settings.analysisModeDefault)
    } catch {
      this.notify('Analysis toggle is unavailable in this build.', 'info')
    }

    try {
      this.controller.setAIDifficulty?.(this.settings.aiDifficulty)
    } catch {
      this.notify('AI difficulty is unavailable in this build.', 'info')
    }

    try {
      this.controller.setVisualOptions?.({
        showLastMoveHighlight: this.settings.showLastMove,
        forcedBoardIntensity: this.settings.highlightIntensity,
      })
    } catch {
      this.notify('Visual options are unavailable in this build.', 'info')
    }

    try {
      this.controller.setAIEnabled?.(this.settings.aiEnabled, this.settings.aiPlayer)
    } catch {
      this.notify('AI mode is unavailable in this build.', 'info')
    }
  }

  private notify(message: string, kind: 'info' | 'success' | 'warning' | 'error' = 'info', durationMs?: number): void {
    const toast = this.getMountPoints().toast as UTTTToastElement | null
    toast?.notify(message, kind, durationMs)
  }

  private updateLiveStatus(override?: string): void {
    const announcer = this.getMountPoints().statusAnnouncer
    if (!announcer) return

    const nextText = override ?? this.computeStatusText()
    if (!nextText || nextText === this.lastAnnouncedStatus) return

    this.lastAnnouncedStatus = nextText
    announcer.textContent = nextText
  }

  private computeStatusText(): string {
    if (!this.controller) return 'Game ready.'
    const state = this.controller.getState()

    if (isGameOver(state)) {
      return `Game over. ${state.winner} wins.`
    }

    if (isDraw(state)) {
      return 'Game over. Draw.'
    }

    return `${state.currentPlayer} to play.`
  }

  getMountPoints(): UTTTMountPoints {
    const root = this.shadowRoot
    if (!root) {
      throw new Error('UTTTAppElement: shadow root is not initialized.')
    }

    return {
      canvas: root.getElementById('game-canvas') as HTMLCanvasElement | null,
      hud: root.getElementById('hud'),
      controls: root.getElementById('controls'),
      settings: root.getElementById('settings'),
      help: root.getElementById('help'),
      toast: root.getElementById('toast'),
      openSettingsBtn: root.getElementById('open-settings-btn') as HTMLButtonElement | null,
      openHelpBtn: root.getElementById('open-help-btn') as HTMLButtonElement | null,
      statusAnnouncer: root.getElementById('status-announcer'),
      aiIndicator: root.getElementById('ai-indicator'),
      endgameOverlay: root.getElementById('endgame-overlay') as HTMLElement | null,
      endgameMessage: root.getElementById('endgame-message') as HTMLElement | null,
      playAgainBtn: root.getElementById('play-again-btn') as HTMLButtonElement | null,
    }
  }
}

export function registerUTTTApp(): void {
  if (!customElements.get('uttt-app')) {
    customElements.define('uttt-app', UTTTAppElement)
  }
}
