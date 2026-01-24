import { mctsCoreChooseMove } from './mcts.core'
import { createSeededRng } from './rng'
import { deserializeState, serializeState, SerializedState } from './serialize'

type RunMessage = { id: string; type: 'run'; state: SerializedState; options?: any; seed?: string | number }
type CancelMessage = { id: string; type: 'cancel' }

const controllers = new Map<string, AbortController>()

self.onmessage = async (ev: MessageEvent) => {
  const data = ev.data || {}
  const id = data && data.id
  if (!id) return
  try {
    if (data.type === 'run') {
      const msg = data as RunMessage
      const ctrl = new AbortController()
      controllers.set(id, ctrl)
      let state
      try { state = deserializeState(msg.state) } catch (e) { state = msg.state }
      const rng = msg.seed != null ? createSeededRng(msg.seed) : Math.random
      try {
        const res = await mctsCoreChooseMove(state, msg.options, rng as any, ctrl.signal)
        // normalize move result
        const move = (res && typeof res === 'object' && 'move' in res) ? res.move : res
        const stats = res && res.stats ? res.stats : undefined
        postMessage({ id, type: 'result', move, stats })
      } catch (e: any) {
        if (e && (e.name === 'AbortError' || ctrl.signal.aborted)) {
          postMessage({ id, type: 'aborted' })
        } else {
          postMessage({ id, type: 'error', error: String(e && e.message ? e.message : e) })
        }
      } finally {
        controllers.delete(id)
      }
    } else if (data.type === 'cancel') {
      const msg = data as CancelMessage
      const c = controllers.get(msg.id)
      if (c) {
        c.abort()
        controllers.delete(msg.id)
        postMessage({ id: msg.id, type: 'aborted' })
      }
    }
  } catch (err: any) {
    postMessage({ id, type: 'error', error: String(err && err.message ? err.message : err) })
  }
}
import { mctsCoreChooseMove } from './mcts.core'
import { createSeededRng } from './rng'

onmessage = async (ev: MessageEvent) => {
  const { id, state, options, seed } = ev.data || {}
  const controller = new AbortController()
  try {
    if (options && options.timeBudgetMs && options.timeBudgetMs > 0) {
      setTimeout(() => controller.abort(), options.timeBudgetMs)
    }
    const rng = seed != null ? createSeededRng(seed) : Math.random
    const res = await mctsCoreChooseMove(state, options, rng as any, controller.signal)
    if (res && typeof res === 'object' && 'move' in res) {
      postMessage({ id, move: res.move, stats: res.stats })
    } else {
      postMessage({ id, move: res as any })
    }
  } catch (err: any) {
    postMessage({ id, error: err?.message ?? String(err) })
  }
}
