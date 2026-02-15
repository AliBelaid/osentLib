const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9236;
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
            // Find a page type tab (not extension background)
            const page = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
            if (page && page.webSocketDebuggerUrl) {
              resolve(page.webSocketDebuggerUrl);
            } else if (retries < 20) {
              retries++;
              setTimeout(tryGet, 500);
            } else {
              // Fall back to any tab with ws url
              const any = tabs.find(t => t.webSocketDebuggerUrl);
              if (any) resolve(any.webSocketDebuggerUrl);
              else reject(new Error('No page tabs found. Tabs: ' + JSON.stringify(tabs.map(t => t.type + ':' + t.url))));
            }
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
        this.sock.write(
          `GET ${url.pathname} HTTP/1.1\r\nHost: ${url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
        );
      });

      let handshakeDone = false;
      this.sock.on('data', chunk => {
        if (!handshakeDone) {
          const str = chunk.toString();
          if (str.includes('101')) {
            handshakeDone = true;
            const idx = str.indexOf('\r\n\r\n');
            if (idx !== -1 && idx + 4 < chunk.length) {
              this.buffer = Buffer.concat([this.buffer, chunk.slice(idx + 4)]);
            }
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
      const opcode = this.buffer[0] & 0x0f;
      let payloadLen = this.buffer[1] & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this.buffer.length < 4) return;
        payloadLen = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return;
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        payloadLen = high * 0x100000000 + low;
        offset = 10;
      }

      if (this.buffer.length < offset + payloadLen) return;

      const payload = this.buffer.slice(offset, offset + payloadLen);
      this.buffer = this.buffer.slice(offset + payloadLen);

      if (opcode === 0x01) {
        try {
          const msg = JSON.parse(payload.toString('utf8'));
          if (msg.id && this.pending.has(msg.id)) {
            const cb = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            cb.resolve(msg);
            clearTimeout(cb.timer);
          }
        } catch (e) {}
      }
    }
  }

  _sendFrame(data) {
    const payload = Buffer.from(JSON.stringify(data));
    const mask = crypto.randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.alloc(6); header[0] = 0x81; header[1] = 0x80 | payload.length; mask.copy(header, 2);
    } else if (payload.length < 65536) {
      header = Buffer.alloc(8); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2); mask.copy(header, 4);
    } else {
      header = Buffer.alloc(14); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(payload.length), 2); mask.copy(header, 10);
    }
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([header, masked]));
  }

  send(method, params = {}, timeoutMs = 60000) {
    return new Promise((resolve) => {
      const id = this.msgId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ error: 'timeout', method });
      }, timeoutMs);
      this.pending.set(id, { resolve, timer });
      this._sendFrame({ id, method, params });
    });
  }

  close() { if (this.sock) this.sock.destroy(); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('1. Login...');
  const token = await login();

  console.log('2. Launch Chrome (clean profile)...');
  // Use a clean temporary profile to avoid extensions
  const tmpProfile = 'C:\\temp\\chrome-ss-' + Date.now();
  const child = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1920,1080',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    `--user-data-dir=${tmpProfile}`,
    'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(3000);

  console.log('3. Connect CDP...');
  const wsUrl = await getPageWsUrl();
  console.log('   WS:', wsUrl);
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });

  // Navigate to app and set token
  console.log('4. Set auth token...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200' });
  await sleep(3000);

  let r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('   URL:', r.result?.result?.value);

  await cdp.send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${token}'); localStorage.setItem('ausentinel_user', JSON.stringify({username:'admin',role:'AUAdmin',displayName:'Admin'})); 'done'`
  });

  // Navigate to Maltego
  console.log('5. Navigate /maltego...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/maltego' });
  await sleep(6000);

  r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('   URL:', r.result?.result?.value);

  r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function(){
        var els = {
          inputs: document.querySelectorAll('input').length,
          buttons: document.querySelectorAll('button').length,
          svgs: document.querySelectorAll('svg').length,
          cards: document.querySelectorAll('.mat-mdc-card, mat-card').length,
          matSelects: document.querySelectorAll('mat-select').length,
          divs: document.querySelectorAll('div').length,
          bodyLen: document.body.innerHTML.length
        };
        // Check first 200 chars
        var snippet = document.body.innerHTML.substring(0, 300).replace(/\\n/g, ' ');
        return JSON.stringify(els) + ' | ' + snippet;
      })()
    `
  });
  console.log('   DOM:', r.result?.result?.value?.substring(0, 400));

  // Try to fill in entity value and transform
  console.log('6. Trigger transform...');
  r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function(){
        var inputs = document.querySelectorAll('input');
        var result = 'inputs:' + inputs.length;
        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          result += ' [' + i + ':' + inp.type + '/' + (inp.placeholder||'') + ']';
          if (inp.type === 'text' || inp.type === '' || !inp.type) {
            var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'admin@au.org');
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            inp.dispatchEvent(new Event('change', {bubbles: true}));
            result += ' SET';
          }
        }
        var buttons = document.querySelectorAll('button');
        result += ' btns:' + buttons.length;
        for (var j = 0; j < buttons.length; j++) {
          var txt = (buttons[j].textContent || '').trim();
          result += ' [' + j + ':' + txt.substring(0,30) + ']';
          if (txt.toLowerCase().indexOf('transform') >= 0) {
            buttons[j].click();
            result += ' CLICKED';
          }
        }
        return result;
      })()
    `
  });
  console.log('   Result:', r.result?.result?.value?.substring(0, 400));

  await sleep(6000);

  // Take screenshot
  console.log('7. Screenshot...');
  const ss = await cdp.send('Page.captureScreenshot', { format: 'png' }, 60000);

  if (ss.result && ss.result.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(ss.result.data, 'base64'));
    console.log('   Saved: ' + OUTPUT + ' (' + fs.statSync(OUTPUT).size + ' bytes)');
  } else {
    console.log('   Failed:', JSON.stringify(ss).substring(0, 200));
  }

  cdp.close();
  try { process.kill(child.pid); } catch {}
  // Clean up temp profile
  try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}

  console.log('Done');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
