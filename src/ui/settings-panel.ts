import { saveUISettings, UISettings } from './ui-settings'

export function initSettingsPanel(
  settingsBtn: HTMLButtonElement,
  panel: HTMLElement,
  settings: UISettings,
  onChange: (settings: UISettings) => void,
): void {
  const legalMovesToggle = panel.querySelector('#toggle-legal-moves') as HTMLInputElement | null
  const forcedBoardToggle = panel.querySelector('#toggle-forced-board') as HTMLInputElement | null
  const gameModeSelect = panel.querySelector('#game-mode-select') as HTMLSelectElement | null
  const closeSettingsBtn = panel.querySelector('#close-settings-btn') as HTMLButtonElement | null

  if (legalMovesToggle) legalMovesToggle.checked = settings.showLegalMoves
  if (forcedBoardToggle) forcedBoardToggle.checked = settings.showForcedBoard
  if (gameModeSelect) gameModeSelect.value = settings.gameMode

  settingsBtn.addEventListener('click', () => {
    panel.hidden = !panel.hidden
  })

  legalMovesToggle?.addEventListener('change', () => {
    settings.showLegalMoves = legalMovesToggle.checked
    saveUISettings(settings)
    onChange(settings)
  })

  forcedBoardToggle?.addEventListener('change', () => {
    settings.showForcedBoard = forcedBoardToggle.checked
    saveUISettings(settings)
    onChange(settings)
  })

  gameModeSelect?.addEventListener('change', () => {
    settings.gameMode = gameModeSelect.value === 'hva' ? 'hva' : 'hvh'
    saveUISettings(settings)
    onChange(settings)
  })

  closeSettingsBtn?.addEventListener('click', () => {
    panel.hidden = true
  })
}
