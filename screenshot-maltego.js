const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9233;
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
            else if (retries < 10) { retries++; setTimeout(tryGet, 500); }
            else reject(new Error('No tabs'));
          } catch (e) { if (retries < 10) { retries++; setTimeout(tryGet, 500); } else reject(e); }
        });
      });
      req.on('error', () => { if (retries < 10) { retries++; setTimeout(tryGet, 500); } else reject(new Error('Connection failed')); });
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
              this._processFrames();
            }
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
    while (this.buffer.length >= 2) {
      const b1 = this.buffer[1] & 0x7f;
      let payloadLen, headerLen;
      if (b1 < 126) { payloadLen = b1; headerLen = 2; }
      else if (b1 === 126) {
        if (this.buffer.length < 4) return;
        payloadLen = this.buffer.readUInt16BE(2); headerLen = 4;
      } else {
        if (this.buffer.length < 10) return;
        payloadLen = Number(this.buffer.readBigUInt64BE(2)); headerLen = 10;
      }
      if (this.buffer.length < headerLen + payloadLen) return;
      const payload = this.buffer.slice(headerLen, headerLen + payloadLen);
      this.buffer = this.buffer.slice(headerLen + payloadLen);
      try {
        const msg = JSON.parse(payload.toString());
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id)(msg);
          this.pending.delete(msg.id);
        }
      } catch (e) {}
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

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = this.msgId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ error: 'timeout' });
      }, 15000);
      this.pending.set(id, (msg) => {
        clearTimeout(timeout);
        resolve(msg);
      });
      this._sendWs({ id, method, params });
    });
  }

  close() {
    if (this.sock) this.sock.destroy();
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('1. Logging in...');
  const token = await login();
  console.log('   Token obtained');

  // Launch Chrome
  console.log('2. Launching Chrome headless...');
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    '--window-size=1920,1080', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', 'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(3000);

  console.log('3. Connecting CDP...');
  const wsUrl = await getWsUrl();
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  console.log('   Connected');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });

  // Navigate to app and set token
  console.log('4. Setting auth token...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/login' });
  await sleep(2000);

  await cdp.send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${token}'); localStorage.setItem('ausentinel_user', JSON.stringify({username:'admin',role:'AUAdmin',displayName:'Admin'})); 'ok'`
  });
  await sleep(500);

  // Navigate to Maltego
  console.log('5. Navigating to /maltego...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/maltego' });
  await sleep(5000);

  // Set entity input and trigger transform
  console.log('6. Triggering transform...');
  const inputResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        // Find all inputs on the page
        var allInputs = document.querySelectorAll('input[type="text"], input:not([type]), input[matinput], .mat-mdc-input-element');
        var info = 'Found ' + allInputs.length + ' inputs. ';

        // Try to set value on the last text input (entity value field)
        for (var i = allInputs.length - 1; i >= 0; i--) {
          var inp = allInputs[i];
          if (inp.type === 'text' || !inp.type) {
            var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'admin@au.org');
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            inp.dispatchEvent(new Event('change', {bubbles: true}));
            info += 'Set value on input[' + i + ']. ';
            break;
          }
        }

        // Click transform/run button
        var buttons = document.querySelectorAll('button');
        info += buttons.length + ' buttons. ';
        for (var j = 0; j < buttons.length; j++) {
          var txt = buttons[j].textContent.toLowerCase();
          if (txt.indexOf('transform') >= 0 || txt.indexOf('run') >= 0) {
            buttons[j].click();
            info += 'Clicked: ' + buttons[j].textContent.trim();
            break;
          }
        }
        return info;
      })()
    `
  });
  console.log('   Result:', JSON.stringify(inputResult.result?.result?.value || inputResult.result?.value || 'N/A'));

  // Wait for graph to render
  console.log('7. Waiting for graph render...');
  await sleep(6000);

  // Capture
  console.log('8. Capturing screenshot...');
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });

  if (screenshot.result && screenshot.result.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(screenshot.result.data, 'base64'));
    console.log('   Saved: ' + OUTPUT);
  } else if (screenshot.error) {
    console.log('   Error: ' + JSON.stringify(screenshot.error));
  } else {
    console.log('   Unexpected response: ' + JSON.stringify(screenshot).substring(0, 300));
  }

  // Cleanup
  cdp.close();
  try { process.kill(child.pid); } catch {}

  console.log('Done!');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
