// Lightweight reusable worker pool for browser Web Workers.
// The pool is a per-worker-script singleton and exposes a `run` method
// which posts a message (auto-assigning an `id`) and resolves when the
// worker posts back a message with the same `id`.

type Pending = { resolve: (v: any) => void; reject: (e: any) => void; signal?: AbortSignal }

const pools = new Map<string, ReturnType<typeof createPool>>()

function defaultPoolSize() {
  try {
    const hc = (typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency) || undefined
    if (typeof hc === 'number' && hc > 1) return Math.max(1, hc - 1)
  } catch (e) {}
  return 2
}

function createPool(workerPath: string, size = defaultPoolSize()) {
  const idleMs = 30_000
  const minWorkers = Math.max(1, Math.min(size, 1))
  const workers: { w: Worker; pending: Map<string, Pending>; busy: number; lastUsed: number }[] = []
  const stats = { tasksRun: 0, tasksFailed: 0, createdAt: Date.now(), lastTaskAt: 0 }

  function makeWorker() {
    const w = new Worker(new URL(workerPath, import.meta.url), { type: 'module' })
    const pending = new Map<string, Pending>()
    w.onmessage = (ev: MessageEvent) => {
      const d = ev.data || {}
      const id = d && d.id
      if (!id) return
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      try { entry.resolve(d) } catch (e) { entry.reject(e) }
    }
    w.onerror = (ev) => {
      for (const [id, p] of pending.entries()) {
        p.reject(new Error(ev.message || 'worker error'))
        pending.delete(id)
      }
      stats.tasksFailed += pending.size
    }
    return { w, pending, busy: 0, lastUsed: Date.now() }
  }

  for (let i = 0; i < size; i++) workers.push(makeWorker())

  function pickWorker() {
    workers.sort((a, b) => a.busy - b.busy)
    return workers[0]
  }

  function pruneIdle() {
    const now = Date.now()
    for (let i = workers.length - 1; i >= 0; i--) {
      const entry = workers[i]
      if (workers.length <= minWorkers) break
      if (now - entry.lastUsed > idleMs) {
        try { entry.w.terminate() } catch (e) {}
        for (const [, p] of entry.pending) p.reject(new Error('terminated-idle'))
        workers.splice(i, 1)
      }
    }
  }

  const pruneInterval = setInterval(pruneIdle, Math.max(5_000, Math.floor(idleMs / 3)))

  function run(message: any, opts?: { signal?: AbortSignal; timeoutMs?: number }) {
    return new Promise<any>((resolve, reject) => {
      if (workers.length === 0) workers.push(makeWorker())
      const workerEntry = pickWorker()
      const id = Math.random().toString(36).slice(2)
      const payload = { id, ...message }
      const pendingItem: Pending = { resolve, reject, signal: opts?.signal }
      workerEntry.pending.set(id, pendingItem)
      workerEntry.busy++
      workerEntry.lastUsed = Date.now()

      let timedOut = false
      let timer: any = null
      if (opts?.timeoutMs) {
        timer = globalThis.setTimeout(() => {
          timedOut = true
          if (workerEntry.pending.has(id)) {
            try { workerEntry.w.postMessage({ id, type: 'cancel' }) } catch (e) {}
            workerEntry.pending.delete(id)
            workerEntry.busy = Math.max(0, workerEntry.busy - 1)
            stats.tasksFailed++
            reject(new Error('timeout'))
          }
        }, opts.timeoutMs)
      }

      const cleanup = () => {
        if (timer) globalThis.clearTimeout(timer)
        workerEntry.busy = Math.max(0, workerEntry.busy - 1)
        stats.lastTaskAt = Date.now()
      }

      if (opts?.signal) {
        if (opts.signal.aborted) {
          try { workerEntry.w.postMessage({ id, type: 'cancel' }) } catch (e) {}
          cleanup()
          stats.tasksFailed++
          return reject(new Error('aborted'))
        }
        const onAbort = () => {
          if (workerEntry.pending.has(id)) {
            try { workerEntry.w.postMessage({ id, type: 'cancel' }) } catch (e) {}
            workerEntry.pending.delete(id)
            cleanup()
            stats.tasksFailed++
            reject(new Error('aborted'))
          }
        }
        opts.signal.addEventListener('abort', onAbort, { once: true })
      }

      try {
        workerEntry.w.postMessage(payload)
      } catch (e) {
        if (workerEntry.pending.has(id)) workerEntry.pending.delete(id)
        cleanup()
        stats.tasksFailed++
        return reject(e)
      }

      const origResolve = resolve
      resolve = (v: any) => {
        if (timedOut) return
        cleanup()
        stats.tasksRun++
        origResolve(v)
      }
    })
  }

  function terminate() {
    clearInterval(pruneInterval)
    for (const entry of workers) {
      try { entry.w.terminate() } catch (e) {}
      for (const [, p] of entry.pending) p.reject(new Error('terminated'))
      entry.pending.clear()
    }
    workers.length = 0
  }

  function getStats() {
    return { workers: workers.length, tasksRun: stats.tasksRun, tasksFailed: stats.tasksFailed, createdAt: stats.createdAt, lastTaskAt: stats.lastTaskAt }
  }

  return { run, terminate, getStats }
}

export function getWorkerPool(workerPath: string, size?: number) {
  // Allow forcing direct (no-worker) mode via env var for deterministic benchmarking
  try {
    if (typeof process !== 'undefined' && process.env && process.env.AI_FORCE_DIRECT === '1') return null
  } catch (e) {}
  if (typeof Worker === 'undefined') return null
  const finalSize = typeof size === 'number' ? size : defaultPoolSize()
  const key = workerPath
  let pool = pools.get(key)
  if (!pool) {
    pool = createPool(workerPath, finalSize)
    pools.set(key, pool)
  }
  return pool
}

export function clearAllPools() {
  for (const p of pools.values()) {
    try { p.terminate() } catch (e) {}
  }
  pools.clear()
}

const overrides = new Map<string, number>()

export function setWorkerPoolSize(workerPath: string, size: number | null) {
  if (size === null) overrides.delete(workerPath)
  else overrides.set(workerPath, Math.max(0, Math.floor(size)))
  // if pool exists, terminate it so next getWorkerPool recreates with new size
  const existing = pools.get(workerPath)
  if (existing) {
    try { existing.terminate() } catch (e) {}
    pools.delete(workerPath)
  }
}

export function getConfiguredPoolSize(workerPath: string) {
  const o = overrides.get(workerPath)
  if (typeof o === 'number') return o
  return defaultPoolSize()
}
