import { applyMove, evaluateSmall } from '../game/engine'
import { findTwoInRow } from '../game/win-detection'

onmessage = (ev: MessageEvent) => {
  const { id, state, moves } = ev.data || {}
  const results: any[] = []
  try {
    for (const mv of moves || []) {
      try {
        const res = applyMove(state, mv)
        const ns = res.nextState
        const reasons: string[] = []
        let score = 0
        if (ns.winner === state.currentPlayer) {
          score += 10000
          reasons.push('Wins the game')
        }
        const smallEval = evaluateSmall(ns.bigBoard[mv.board])
        if (smallEval.status === 'Won' && smallEval.winner === state.currentPlayer) {
          score += 500
          reasons.push('Takes local small board')
        }
        try {
          const threats = findTwoInRow(ns.bigBoard[mv.board], state.currentPlayer)
          if (threats && threats.length > 0) reasons.push(`Creates ${threats.length} local threat(s)`)
        } catch (e) {}
        results.push({ board: mv.board, cell: mv.cell, explanation: { score, reasons, simulatedState: ns } })
      } catch (e) {
        results.push({ board: mv.board, cell: mv.cell, explanation: null })
      }
    }
    postMessage({ id, results })
  } catch (err: any) {
    postMessage({ id, error: String(err) })
  }
}
