const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9230;
const OUTPUT = 'C:\\osentLib\\screenshot-maltego.png';

// Login to get JWT token
function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: 'admin', password: 'Admin123!' });
    const req = http.request({
      hostname: 'localhost', port: 9099, path: '/api/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body).token); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Get Chrome WebSocket URL
function getWsUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(body);
          resolve(tabs[0].webSocketDebuggerUrl);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

// Raw WebSocket CDP client
function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.createConnection({ host: url.hostname, port: parseInt(url.port) }, () => {
      sock.write(
        `GET ${url.pathname} HTTP/1.1\r\n` +
        `Host: ${url.host}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`
      );
    });

    let handshakeDone = false;
    let buffer = Buffer.alloc(0);
    let msgId = 1;
    const pending = new Map();

    function processFrames() {
      while (buffer.length >= 2) {
        const b1 = buffer[1] & 0x7f;
        let payloadLen, headerLen;
        if (b1 < 126) { payloadLen = b1; headerLen = 2; }
        else if (b1 === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2); headerLen = 4;
        } else {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2)); headerLen = 10;
        }
        if (buffer.length < headerLen + payloadLen) return;
        const payload = buffer.slice(headerLen, headerLen + payloadLen);
        buffer = buffer.slice(headerLen + payloadLen);
        try {
          const msg = JSON.parse(payload.toString());
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
          }
        } catch (e) {}
      }
    }

    function sendWs(data) {
      const payload = Buffer.from(JSON.stringify(data));
      const mask = crypto.randomBytes(4);
      let header;
      if (payload.length < 126) {
        header = Buffer.alloc(6);
        header[0] = 0x81;
        header[1] = 0x80 | payload.length;
        mask.copy(header, 2);
      } else if (payload.length < 65536) {
        header = Buffer.alloc(8);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(payload.length, 2);
        mask.copy(header, 4);
      } else {
        header = Buffer.alloc(14);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(payload.length), 2);
        mask.copy(header, 10);
      }
      const masked = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
      sock.write(Buffer.concat([header, masked]));
    }

    function send(method, params = {}) {
      return new Promise(res => {
        const id = msgId++;
        pending.set(id, res);
        sendWs({ id, method, params });
      });
    }

    sock.on('data', chunk => {
      if (!handshakeDone) {
        const str = chunk.toString();
        if (str.includes('101')) {
          handshakeDone = true;
          const idx = str.indexOf('\r\n\r\n');
          if (idx !== -1 && idx + 4 < chunk.length) {
            buffer = Buffer.concat([buffer, chunk.slice(idx + 4)]);
            processFrames();
          }
          resolve({ send, sock });
        }
      } else {
        buffer = Buffer.concat([buffer, chunk]);
        processFrames();
      }
    });
    sock.on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Logging in...');
  const token = await login();
  console.log('Got token');

  // Kill any existing Chrome on this debug port
  try { execSync(`powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like '*${PORT}*'} | Stop-Process -Force"`, { stdio: 'ignore' }); } catch {}
  await sleep(500);

  // Launch Chrome headless
  console.log('Launching Chrome...');
  const child = require('child_process').spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1920,1080',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(2000);

  console.log('Connecting to CDP...');
  const wsUrl = await getWsUrl();
  const { send } = await connectCDP(wsUrl);

  // Enable required domains
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  // Set viewport
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });

  // Set auth token in localStorage
  await send('Page.navigate', { url: 'http://localhost:4200' });
  await sleep(2000);
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${token}'); localStorage.setItem('ausentinel_user', JSON.stringify({username:'admin',role:'AUAdmin',displayName:'Admin'}));`
  });

  // Navigate to Maltego page
  console.log('Navigating to Maltego Graph...');
  await send('Page.navigate', { url: 'http://localhost:4200/maltego' });
  await sleep(4000);

  // Type an entity value and trigger a transform to populate the graph
  console.log('Triggering Maltego transform...');
  await send('Runtime.evaluate', {
    expression: `
      // Find the entity value input and type selector
      const inputs = document.querySelectorAll('input');
      const selects = document.querySelectorAll('select, mat-select');

      // Try to set the input value and trigger transform via Angular
      const comp = document.querySelector('app-maltego-graph, [class*="maltego"]');
      if (comp) {
        // Try to find Angular component instance
        const ngEl = comp.__ngContext__ || comp;
      }

      // Direct DOM manipulation approach - find input field and set value
      let valueInput = null;
      inputs.forEach(inp => {
        if (inp.placeholder && (inp.placeholder.toLowerCase().includes('value') || inp.placeholder.toLowerCase().includes('entity') || inp.placeholder.toLowerCase().includes('domain') || inp.placeholder.toLowerCase().includes('email'))) {
          valueInput = inp;
        }
      });

      // Also try mat-form-field inputs
      if (!valueInput) {
        const matInputs = document.querySelectorAll('.mat-mdc-input-element, [matInput]');
        if (matInputs.length > 0) valueInput = matInputs[matInputs.length - 1];
      }

      if (!valueInput && inputs.length > 0) {
        // Last input is likely the entity value
        valueInput = inputs[inputs.length - 1];
      }

      if (valueInput) {
        // Set value using Angular's way
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(valueInput, 'admin@au.org');
        valueInput.dispatchEvent(new Event('input', { bubbles: true }));
        valueInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      'input set: ' + (valueInput ? 'yes' : 'no');
    `
  });
  await sleep(1000);

  // Click the Transform button
  await send('Runtime.evaluate', {
    expression: `
      const buttons = document.querySelectorAll('button');
      let transformBtn = null;
      buttons.forEach(b => {
        const text = b.textContent.toLowerCase();
        if (text.includes('transform') || text.includes('run') || text.includes('analyze') || text.includes('expand')) {
          transformBtn = b;
        }
      });
      if (transformBtn) {
        transformBtn.click();
      }
      'transform clicked: ' + (transformBtn ? transformBtn.textContent.trim() : 'not found');
    `
  });

  // Wait for API response and graph to render
  console.log('Waiting for graph to render...');
  await sleep(5000);

  // Take screenshot
  console.log('Capturing screenshot...');
  const result = await send('Page.captureScreenshot', { format: 'png', quality: 100 });
  if (result.result && result.result.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(result.result.data, 'base64'));
    console.log('Screenshot saved to ' + OUTPUT);
  } else {
    console.log('Screenshot failed:', JSON.stringify(result).substring(0, 200));
  }

  // Cleanup
  try { execSync(`taskkill /F /PID ${child.pid}`, { stdio: 'ignore' }); } catch {}
  try { execSync(`powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -eq ''} | Stop-Process -Force"`, { stdio: 'ignore' }); } catch {}

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
