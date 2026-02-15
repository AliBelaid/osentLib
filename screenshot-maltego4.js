const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9237;
const OUTPUT = 'C:\\osentLib\\screenshot-maltego.png';

function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: 'admin', password: 'Admin123!' });
    const req = http.request({
      hostname: 'localhost', port: 9099, path: '/api/auth/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body).token); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getPageWsUrl() {
  return new Promise((resolve, reject) => {
    let retries = 0;
    function tryGet() {
      const req = http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const tabs = JSON.parse(body);
            const page = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
            if (page && page.webSocketDebuggerUrl) resolve(page.webSocketDebuggerUrl);
            else if (retries < 20) { retries++; setTimeout(tryGet, 500); }
            else reject(new Error('No page tabs'));
          } catch (e) { if (retries < 20) { retries++; setTimeout(tryGet, 500); } else reject(e); }
        });
      });
      req.on('error', () => { if (retries < 20) { retries++; setTimeout(tryGet, 500); } else reject(new Error('Conn failed')); });
    }
    tryGet();
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.msgId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.sock = null;
  }
  connect() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.wsUrl);
      const key = crypto.randomBytes(16).toString('base64');
      this.sock = net.createConnection({ host: url.hostname, port: parseInt(url.port) }, () => {
        this.sock.write(`GET ${url.pathname} HTTP/1.1\r\nHost: ${url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
      });
      let handshakeDone = false;
      this.sock.on('data', chunk => {
        if (!handshakeDone) {
          const str = chunk.toString();
          if (str.includes('101')) {
            handshakeDone = true;
            const idx = str.indexOf('\r\n\r\n');
            if (idx !== -1 && idx + 4 < chunk.length) this.buffer = Buffer.concat([this.buffer, chunk.slice(idx + 4)]);
            this._processFrames();
            resolve();
          }
        } else {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          this._processFrames();
        }
      });
      this.sock.on('error', reject);
    });
  }
  _processFrames() {
    while (true) {
      if (this.buffer.length < 2) return;
      let payloadLen = this.buffer[1] & 0x7f, offset = 2;
      if (payloadLen === 126) { if (this.buffer.length < 4) return; payloadLen = this.buffer.readUInt16BE(2); offset = 4; }
      else if (payloadLen === 127) { if (this.buffer.length < 10) return; payloadLen = this.buffer.readUInt32BE(2) * 0x100000000 + this.buffer.readUInt32BE(6); offset = 10; }
      if (this.buffer.length < offset + payloadLen) return;
      const payload = this.buffer.slice(offset, offset + payloadLen);
      this.buffer = this.buffer.slice(offset + payloadLen);
      const opcode = payload.length > 0 ? undefined : undefined; // just process text
      try {
        const msg = JSON.parse(payload.toString('utf8'));
        if (msg.id && this.pending.has(msg.id)) { const cb = this.pending.get(msg.id); this.pending.delete(msg.id); clearTimeout(cb.timer); cb.resolve(msg); }
      } catch {}
    }
  }
  _sendFrame(data) {
    const payload = Buffer.from(JSON.stringify(data));
    const mask = crypto.randomBytes(4);
    let header;
    if (payload.length < 126) { header = Buffer.alloc(6); header[0] = 0x81; header[1] = 0x80 | payload.length; mask.copy(header, 2); }
    else if (payload.length < 65536) { header = Buffer.alloc(8); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2); mask.copy(header, 4); }
    else { header = Buffer.alloc(14); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(payload.length), 2); mask.copy(header, 10); }
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([header, masked]));
  }
  send(method, params = {}, timeoutMs = 60000) {
    return new Promise((resolve) => {
      const id = this.msgId++;
      const timer = setTimeout(() => { this.pending.delete(id); resolve({ error: 'timeout', method }); }, timeoutMs);
      this.pending.set(id, { resolve, timer });
      this._sendFrame({ id, method, params });
    });
  }
  close() { if (this.sock) this.sock.destroy(); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Wait until splash screen disappears
async function waitForAppReady(cdp, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          var splash = document.getElementById('vex-splash-screen');
          if (splash && splash.style.display !== 'none' && splash.offsetParent !== null) return 'splash';
          var router = document.querySelector('router-outlet');
          if (router) return 'ready';
          return 'loading';
        })()
      `
    });
    const val = r.result?.result?.value;
    if (val === 'ready') return true;
    await sleep(1000);
  }
  return false;
}

async function main() {
  console.log('1. Login...');
  const token = await login();

  console.log('2. Launch Chrome...');
  const tmpProfile = 'C:\\temp\\chrome-maltego-' + Date.now();
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    '--window-size=1920,1080', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    `--user-data-dir=${tmpProfile}`, 'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(3000);

  console.log('3. Connect CDP...');
  const wsUrl = await getPageWsUrl();
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  // Step 1: Navigate to login page and set token BEFORE Angular loads
  console.log('4. Navigate to app...');

  // First, go to a simple page on the same origin to set localStorage
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/assets/i18n/en.json' });
  await sleep(2000);

  // Set localStorage on the same origin
  await cdp.send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${token}'); localStorage.setItem('ausentinel_user', JSON.stringify({username:'admin',role:'AUAdmin',displayName:'Admin',country:'ALL'})); 'ok'`
  });
  console.log('   Token set');

  // Now navigate to maltego - Angular should read token from localStorage
  console.log('5. Navigate to /maltego...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/maltego' });

  // Wait for the splash screen to disappear and app to load
  console.log('   Waiting for app ready...');
  const ready = await waitForAppReady(cdp, 30000);
  console.log('   Ready:', ready);

  // Extra wait for Maltego component to render
  await sleep(3000);

  // Debug current state
  let r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('   URL:', r.result?.result?.value);

  r = await cdp.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('input').length + ' inputs, ' + document.querySelectorAll('button').length + ' buttons, ' + document.querySelectorAll('svg').length + ' svgs'`
  });
  console.log('   Elements:', r.result?.result?.value);

  // Interact: set entity value and trigger transform
  console.log('6. Trigger transform...');
  r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function(){
        // Find input fields
        var inputs = document.querySelectorAll('input');
        var info = '';
        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          if (inp.type === 'text' || !inp.type || inp.type === '') {
            var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'admin@au.org');
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            info += 'set input[' + i + '] ';
          }
        }
        // Find and click transform button
        var btns = document.querySelectorAll('button');
        for (var j = 0; j < btns.length; j++) {
          var t = (btns[j].textContent || '').toLowerCase();
          if (t.indexOf('transform') >= 0 || t.indexOf('run') >= 0 || t.indexOf('expand') >= 0) {
            btns[j].click();
            info += 'clicked btn[' + j + ']:' + t.trim().substring(0,20);
            break;
          }
        }
        return info || 'no interaction possible';
      })()
    `
  });
  console.log('   Interaction:', r.result?.result?.value);

  // Wait for API response and graph animation
  await sleep(6000);

  // Screenshot
  console.log('7. Screenshot...');
  const ss = await cdp.send('Page.captureScreenshot', { format: 'png' }, 60000);
  if (ss.result && ss.result.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(ss.result.data, 'base64'));
    console.log('   OK: ' + fs.statSync(OUTPUT).size + ' bytes');
  } else {
    console.log('   FAIL:', JSON.stringify(ss).substring(0, 300));
  }

  cdp.close();
  try { process.kill(child.pid); } catch {}
  try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}

  console.log('Done');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
