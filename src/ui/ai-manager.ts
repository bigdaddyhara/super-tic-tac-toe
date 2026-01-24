import { GameState } from '../types/game-types'
import { TurnTimer } from './turn-timer'
import { chooseMove } from '../ai'
import { ChooseOptions } from '../ai/types'

export type ThinkingCallback = (thinking: boolean) => void

let currentController: AbortController | null = null

export function cancelAIMove() {
  if (currentController) {
    try { currentController.abort() } catch (e) {}
    currentController = null
  }
}

// Start an AI move: starts the provided TurnTimer for the given player, sets a
// thinking indicator via `onThinking`, and requests a move from the AI using
// `chooseMove`. The returned promise resolves to the chosen Move or rejects if
// aborted.
export function startAIMove(
  state: GameState,
  player: 'X' | 'O',
  turnTimer: TurnTimer,
  options: ChooseOptions | undefined,
  onThinking?: ThinkingCallback
): Promise<any> {
  // track current controller so external callers (undo/reset) can cancel
  currentController?.abort()
  const controller = new AbortController()
  currentController = controller
  const signal = controller.signal

  // Start the UI timer for this player and arrange for it to abort the AI when expired.
  turnTimer.startForPlayer(player, (epoch: number, expectedPlayer: string) => {
    // Only abort if the timer epoch matches the current epoch we started with
    // (TurnTimer increments epoch on start). This prevents races with subsequent turns.
    if (epoch === turnTimer.currentEpoch()) {
      controller.abort()
    }
  })

  if (onThinking) onThinking(true)

  const opts = { ...(options || {}), abortSignal: signal }

  // Clamp AI time budget to remaining turn timer so AI does not overrun the
  // player's visible turn countdown. If the remaining time is very small and
  // the preset requested a heavy MCTS run, downgrade to a lighter preset.
  try {
    const remaining = turnTimer.getRemainingMs()
    if (remaining !== null && typeof remaining === 'number') {
      const presetBudget = typeof opts.timeBudgetMs === 'number' ? opts.timeBudgetMs : Infinity
      const effective = Math.max(0, Math.min(presetBudget, remaining))
      // If remaining budget is tiny, prefer a lighter algorithm to avoid
      // worker roundtrip and serialization overhead.
      if (effective < 150 && (opts.difficulty === 'hard' || opts.difficulty === 'insane')) {
        opts.difficulty = 'medium'
      }
      // notify consumer/UI that we clamped the AI budget (best-effort)
      try {
        if (typeof document !== 'undefined' && effective < presetBudget) {
          const ev = new CustomEvent('ai:budget-clamped', { detail: { effectiveMs: effective, requestedMs: presetBudget } })
          document.dispatchEvent(ev)
        }
      } catch (e) {}
      opts.timeBudgetMs = effective
    }
  } catch (e) {
    // ignore and proceed with provided options
  }

  const p = chooseMove(state, opts)
    .finally(() => {
      try {
        turnTimer.stop()
      } catch (e) {}
      if (onThinking) onThinking(false)
      // clear global controller if it's still ours
      if (currentController === controller) currentController = null
    })

  return p
}
