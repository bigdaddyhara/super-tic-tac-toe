export function initRemoteLogging() {
  let ws: WebSocket | null = null
  let reconnectTimer: number | null = null

  const connect = () => {
    try {
      ws = new WebSocket('ws://localhost:5174/')
    } catch (e) {
      console.warn('[remote-log] connect failed', String(e))
      scheduleReconnect()
      return
    }

    ws.addEventListener('open', () => {
      console.log('[remote-log] connected')
      try {
        ws && ws.send(JSON.stringify({ level: 'meta', ts: Date.now(), payload: 'client-connected' }))
      } catch {}
    })

    ws.addEventListener('close', () => {
      console.warn('[remote-log] disconnected')
      scheduleReconnect()
    })

    ws.addEventListener('error', (ev) => {
      console.warn('[remote-log] error', ev)
      // allow close handler to schedule reconnect
    })
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 2000)
  }

  const send = (level: string, args: any[]) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    try {
      const payload = args
        .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a) } catch { return String(a) } })()))
        .join(' ')
      ws.send(JSON.stringify({ level, ts: Date.now(), payload }))
    } catch (e) {
      // ignore
    }
  }

  // fallback: also POST logs to an HTTP endpoint (more likely to succeed in limited browsers)
  const postLog = async (level: string, args: any[]) => {
    try {
      const payload = args
        .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a) } catch { return String(a) } })()))
        .join(' ')
      await fetch('http://localhost:5175/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ level, ts: Date.now(), payload }),
      })
    } catch (e) {
      // ignore network errors
    }
  }

  const origLog = console.log.bind(console)
  const origWarn = console.warn.bind(console)
  const origError = console.error.bind(console)

  console.log = (...args: any[]) => {
    send('log', args)
    postLog('log', args)
    // maintain recent messages in-page for debug overlay
    try {
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      const arr = (window as any).__recentConsole = (window as any).__recentConsole || []
      arr.push({ level: 'log', ts: Date.now(), msg })
      if (arr.length > 20) arr.shift()
    } catch {}
    origLog(...args)
  }
  console.warn = (...args: any[]) => {
    send('warn', args)
    postLog('warn', args)
    try {
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      const arr = (window as any).__recentConsole = (window as any).__recentConsole || []
      arr.push({ level: 'warn', ts: Date.now(), msg })
      if (arr.length > 20) arr.shift()
    } catch {}
    origWarn(...args)
  }
  console.error = (...args: any[]) => {
    send('error', args)
    postLog('error', args)
    try {
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      const arr = (window as any).__recentConsole = (window as any).__recentConsole || []
      arr.push({ level: 'error', ts: Date.now(), msg })
      if (arr.length > 20) arr.shift()
    } catch {}
    origError(...args)
  }

  window.addEventListener('error', (ev: ErrorEvent) => {
    try {
      const payload = `${ev.message} ${ev.filename}:${ev.lineno}:${ev.colno}`
      ws && ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ level: 'error', ts: Date.now(), payload }))
      postLog('error', [payload])
    } catch (e) {}
  })
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    try {
      const payload = String(ev.reason)
      ws && ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ level: 'error', ts: Date.now(), payload }))
      postLog('error', [payload])
    } catch (e) {}
  })

  connect()
  return {
    close: () => {
      if (ws) ws.close()
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    },
  }
}
