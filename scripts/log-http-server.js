const http = require('http');
const port = process.env.LOG_HTTP_PORT || 5175;

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, 'remote.log');

function appendLogLine(line) {
  fs.appendFileSync(LOG_FILE, line + '\n')
  console.log(line)
}

const server = http.createServer((req, res) => {
  // Allow CORS so browser on different port can POST logs
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        const level = msg.level || 'log';
        const ts = msg.ts ? new Date(msg.ts).toISOString() : new Date().toISOString();
        const payload = typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload);
        appendLogLine(`[remote ${level}] ${ts} ${payload}`);
      } catch (e) {
        appendLogLine('[remote] raw ' + body);
      }
      res.writeHead(204);
      res.end();
    });
    return
  }

  if (req.method === 'POST' && req.url === '/screenshot') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        // expect { filename, data: base64 }
        const fname = msg.filename || `screenshot-${Date.now()}.png`;
        const data = msg.data.replace(/^data:image\/[a-z]+;base64,/, '');
        const outPath = path.join(LOG_DIR, fname);
        fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
        appendLogLine(`[screenshot] saved ${outPath}`);
      } catch (e) {
        appendLogLine('[screenshot] failed ' + e.message);
      }
      res.writeHead(204);
      res.end();
    });
    return
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, () => console.log(`HTTP log server listening on http://localhost:${port}/log`));
