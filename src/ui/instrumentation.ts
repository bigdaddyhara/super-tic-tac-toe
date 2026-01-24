// Lightweight instrumentation wrapper for bug-bash telemetry.
// Non-blocking, best-effort: emits structured console messages which are
// picked up by the existing remote logging plumbing in `src/ui/logging.ts`.

const disabled = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof (window as any) !== 'undefined' && (window as any).__DISABLE_INSTRUMENTATION)

export function sessionStart(sessionId?: string) {
  if (disabled) return
  try { console.log('[instr] session.start', { sessionId: sessionId ?? null, ts: Date.now() }) } catch {}
}

export function sessionEnd(sessionId?: string) {
  if (disabled) return
  try { console.log('[instr] session.end', { sessionId: sessionId ?? null, ts: Date.now() }) } catch {}
}

export function logEvent(name: string, payload?: any) {
  if (disabled) return
  try { console.log('[instr] event', name, payload ?? null, { ts: Date.now() }) } catch {}
}

export function logError(err: any, context?: any) {
  if (disabled) return
  try { console.error('[instr] error', String(err && (err.message || err)), context ?? null, { ts: Date.now() }) } catch {}
}

export default { sessionStart, sessionEnd, logEvent, logError }
