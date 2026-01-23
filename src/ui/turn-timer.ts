// Lightweight TurnTimer extracted for reuse and testing
export type TimerSnapshot = { remainingMs: number | null; running: boolean }

export class TurnTimer {
  private timeoutMs: number
  private expireHandle: ReturnType<typeof setTimeout> | null = null
  private startTs: number | null = null
  private endTs: number | null = null
  private running = false
  private epoch = 0
  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs
  }
  setTimeoutMs(ms: number) {
    this.timeoutMs = ms
  }
  startForPlayer(playerId: string, onExpire: (epoch: number, expectedPlayer: string) => void) {
    this.stop()
    this.epoch += 1
    const myEpoch = this.epoch
    this.startTs = Date.now()
    this.endTs = this.startTs + this.timeoutMs
    this.running = true
    this.expireHandle = setTimeout(() => {
      onExpire(myEpoch, playerId)
    }, this.timeoutMs)
  }
  stop() {
    if (this.expireHandle) clearTimeout(this.expireHandle as any)
    this.expireHandle = null
    this.startTs = null
    this.endTs = null
    this.running = false
  }
  pause() {
    if (!this.running || this.startTs === null || this.endTs === null) return
    const remaining = Math.max(0, this.endTs - Date.now())
    this.stop()
    this.endTs = Date.now() + remaining
    this.startTs = Date.now()
    this.running = false
  }
  resumeForEpoch(epoch: number, onExpire: (epoch: number, expectedPlayer: string) => void, expectedPlayer: string) {
    if (this.running) return
    const now = Date.now()
    const remaining = this.endTs ? Math.max(0, this.endTs - now) : this.timeoutMs
    this.epoch = epoch
    this.startTs = now
    this.endTs = now + remaining
    this.running = true
    this.expireHandle = setTimeout(() => onExpire(this.epoch, expectedPlayer), remaining)
  }
  getRemainingMs() {
    if (!this.running || this.endTs === null) return null
    return Math.max(0, this.endTs - Date.now())
  }
  isRunning() { return this.running }
  currentEpoch() { return this.epoch }

  restoreSnapshot(snapshot: TimerSnapshot | undefined, expectedPlayer: string, onExpire: (epoch: number, expectedPlayer: string) => void) {
    this.stop()
    if (!snapshot) return
    const rem = snapshot.remainingMs !== null && snapshot.remainingMs !== undefined ? snapshot.remainingMs : this.timeoutMs
    this.epoch += 1
    this.startTs = Date.now()
    this.endTs = this.startTs + rem
    this.running = !!snapshot.running
    if (this.running) {
      const myEpoch = this.epoch
      this.expireHandle = setTimeout(() => onExpire(myEpoch, expectedPlayer), rem)
    }
  }
}
