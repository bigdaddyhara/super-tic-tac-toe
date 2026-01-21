const WebSocket = require('ws');
const port = process.env.LOG_SERVER_PORT || 5174;

const wss = new WebSocket.Server({ port: Number(port) });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[log-server] client connected: ${ip}`);
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const level = msg.level || 'log';
      const ts = msg.ts ? new Date(msg.ts).toISOString() : new Date().toISOString();
      const payload = typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload);
      console.log(`[remote ${level}] ${ts} ${payload}`);
    } catch (e) {
      console.log('[remote] raw:', data.toString());
    }
  });
  ws.on('close', () => console.log('[log-server] client disconnected'));
});

console.log(`Log server listening on ws://localhost:${port}`);
