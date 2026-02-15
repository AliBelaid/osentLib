const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9235;
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

function getWsUrl() {
  return new Promise((resolve, reject) => {
    let retries = 0;
    function tryGet() {
      const req = http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const tabs = JSON.parse(body);
            if (tabs.length > 0 && tabs[0].webSocketDebuggerUrl) resolve(tabs[0].webSocketDebuggerUrl);
            else if (retries < 15) { retries++; setTimeout(tryGet, 500); }
            else reject(new Error('No tabs'));
          } catch (e) { if (retries < 15) { retries++; setTimeout(tryGet, 500); } else reject(e); }
        });
      });
      req.on('error', () => { if (retries < 15) { retries++; setTimeout(tryGet, 500); } else reject(new Error('Conn failed')); });
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

      const fin = (this.buffer[0] & 0x80) !== 0;
      const opcode = this.buffer[0] & 0x0f;
      const masked = (this.buffer[1] & 0x80) !== 0;
      let payloadLen = this.buffer[1] & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this.buffer.length < 4) return;
        payloadLen = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return;
        // Read as two 32-bit values to avoid BigInt issues
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        payloadLen = high * 0x100000000 + low;
        offset = 10;
      }

      if (masked) offset += 4; // skip mask key (server shouldn't mask)

      const totalLen = offset + payloadLen;
      if (this.buffer.length < totalLen) return; // need more data

      const payload = this.buffer.slice(offset, totalLen);
      this.buffer = this.buffer.slice(totalLen);

      if (opcode === 0x01) { // text frame
        try {
          const msg = JSON.parse(payload.toString('utf8'));
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve: res } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            res(msg);
          }
        } catch (e) {}
      }
      // ignore ping/pong/close for simplicity
    }
  }

  _sendWs(data) {
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

  send(method, params = {}, timeoutMs = 30000) {
    return new Promise((resolve) => {
      const id = this.msgId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ error: 'timeout', method });
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (msg) => { clearTimeout(timeout); resolve(msg); }
      });
      this._sendWs({ id, method, params });
    });
  }

  close() { if (this.sock) this.sock.destroy(); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('1. Login...');
  const token = await login();

  console.log('2. Launch Chrome...');
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    '--window-size=1920,1080', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    '--user-data-dir=C:\\temp\\chrome-maltego-profile',
    'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(3000);

  console.log('3. Connect CDP...');
  const wsUrl = await getWsUrl();
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });

  // First load the app root to set localStorage
  console.log('4. Set auth...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200' });
  await sleep(3000);

  // Check what page we're on
  let evalResult = await cdp.send('Runtime.evaluate', { expression: 'document.title + " | " + window.location.href' });
  console.log('   Page:', evalResult.result?.result?.value);

  await cdp.send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${token}'); localStorage.setItem('ausentinel_user', JSON.stringify({username:'admin',role:'AUAdmin',displayName:'Admin'})); 'ok'`
  });

  // Navigate to maltego via Angular router
  console.log('5. Navigate to /maltego...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/maltego' });
  await sleep(5000);

  // Debug: check what's on page
  evalResult = await cdp.send('Runtime.evaluate', {
    expression: `document.title + ' | ' + window.location.href + ' | body classes: ' + document.body.className + ' | innerHTML length: ' + document.body.innerHTML.length`
  });
  console.log('   Page info:', evalResult.result?.result?.value);

  // Check for any error on the page
  evalResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        var html = document.body.innerHTML;
        if (html.indexOf('Cannot GET') >= 0) return 'ERROR: Cannot GET';
        if (html.indexOf('error') >= 0 || html.indexOf('Error') >= 0) return 'Has error text';
        var inputs = document.querySelectorAll('input');
        var buttons = document.querySelectorAll('button');
        var svgs = document.querySelectorAll('svg');
        var matCards = document.querySelectorAll('mat-card, .mat-mdc-card');
        return 'inputs:' + inputs.length + ' buttons:' + buttons.length + ' svgs:' + svgs.length + ' cards:' + matCards.length + ' bodyLen:' + html.length;
      })()
    `
  });
  console.log('   DOM:', evalResult.result?.result?.value);

  // Try to interact with any inputs
  evalResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        var allInputs = document.querySelectorAll('input');
        var info = [];
        allInputs.forEach(function(inp, i) {
          info.push(i + ':type=' + inp.type + ',placeholder=' + (inp.placeholder||'none') + ',name=' + (inp.name||'none'));
        });
        return info.join(' | ');
      })()
    `
  });
  console.log('   Inputs:', evalResult.result?.result?.value);

  // Trigger transform if inputs exist
  await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        var inputs = document.querySelectorAll('input');
        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          if (inp.type === 'text' || !inp.type || inp.type === '') {
            var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'admin@au.org');
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            break;
          }
        }
        // Click buttons that look like transform/run
        var buttons = document.querySelectorAll('button');
        for (var j = 0; j < buttons.length; j++) {
          var txt = (buttons[j].textContent || '').toLowerCase().trim();
          if (txt.indexOf('transform') >= 0 || txt.indexOf('run') >= 0 || txt.indexOf('search') >= 0) {
            buttons[j].click();
            return 'clicked: ' + txt;
          }
        }
        return 'no transform button found';
      })()
    `
  });
  await sleep(5000);

  // Take screenshot with longer timeout for large image
  console.log('6. Screenshot...');
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' }, 60000);

  if (screenshot.result && screenshot.result.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(screenshot.result.data, 'base64'));
    console.log('   Saved: ' + OUTPUT + ' (' + fs.statSync(OUTPUT).size + ' bytes)');
  } else if (screenshot.error) {
    console.log('   Error:', screenshot.error, screenshot.method || '');
  } else {
    console.log('   Response keys:', Object.keys(screenshot));
  }

  cdp.close();
  try { process.kill(child.pid); } catch {}
  console.log('Done');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
