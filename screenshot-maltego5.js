const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9238;
const OUTPUT = 'C:\\osentLib\\screenshot-maltego.png';

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
    this.wsUrl = wsUrl; this.msgId = 1; this.pending = new Map(); this.buffer = Buffer.alloc(0); this.sock = null;
  }
  connect() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.wsUrl);
      const key = crypto.randomBytes(16).toString('base64');
      this.sock = net.createConnection({ host: url.hostname, port: parseInt(url.port) }, () => {
        this.sock.write(`GET ${url.pathname} HTTP/1.1\r\nHost: ${url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
      });
      let done = false;
      this.sock.on('data', chunk => {
        if (!done) {
          const s = chunk.toString();
          if (s.includes('101')) { done = true; const i = s.indexOf('\r\n\r\n'); if (i !== -1 && i + 4 < chunk.length) this.buffer = Buffer.concat([this.buffer, chunk.slice(i + 4)]); this._proc(); resolve(); }
        } else { this.buffer = Buffer.concat([this.buffer, chunk]); this._proc(); }
      });
      this.sock.on('error', reject);
    });
  }
  _proc() {
    while (true) {
      if (this.buffer.length < 2) return;
      let pl = this.buffer[1] & 0x7f, off = 2;
      if (pl === 126) { if (this.buffer.length < 4) return; pl = this.buffer.readUInt16BE(2); off = 4; }
      else if (pl === 127) { if (this.buffer.length < 10) return; pl = this.buffer.readUInt32BE(2) * 4294967296 + this.buffer.readUInt32BE(6); off = 10; }
      if (this.buffer.length < off + pl) return;
      const p = this.buffer.slice(off, off + pl); this.buffer = this.buffer.slice(off + pl);
      try { const m = JSON.parse(p.toString('utf8')); if (m.id && this.pending.has(m.id)) { const c = this.pending.get(m.id); this.pending.delete(m.id); clearTimeout(c.t); c.r(m); } } catch {}
    }
  }
  _sf(d) {
    const p = Buffer.from(JSON.stringify(d)), mk = crypto.randomBytes(4); let h;
    if (p.length < 126) { h = Buffer.alloc(6); h[0] = 0x81; h[1] = 0x80 | p.length; mk.copy(h, 2); }
    else if (p.length < 65536) { h = Buffer.alloc(8); h[0] = 0x81; h[1] = 0x80 | 126; h.writeUInt16BE(p.length, 2); mk.copy(h, 4); }
    else { h = Buffer.alloc(14); h[0] = 0x81; h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(p.length), 2); mk.copy(h, 10); }
    const m = Buffer.alloc(p.length); for (let i = 0; i < p.length; i++) m[i] = p[i] ^ mk[i % 4];
    this.sock.write(Buffer.concat([h, m]));
  }
  send(method, params = {}, tms = 60000) {
    return new Promise(r => { const id = this.msgId++; const t = setTimeout(() => { this.pending.delete(id); r({ error: 'timeout', method }); }, tms); this.pending.set(id, { r, t }); this._sf({ id, method, params }); });
  }
  close() { if (this.sock) this.sock.destroy(); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(cdp, expr, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const r = await cdp.send('Runtime.evaluate', { expression: expr });
    if (r.result?.result?.value === true) return true;
    await sleep(1000);
  }
  return false;
}

async function main() {
  console.log('1. Launch Chrome...');
  const tmpDir = 'C:\\temp\\chrome-m-' + Date.now();
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1920,1080',
    '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-component-extensions-with-background-pages',
    `--user-data-dir=${tmpDir}`, 'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(3000);

  console.log('2. Connect CDP...');
  const wsUrl = await getPageWsUrl();
  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  // Go to the login page
  console.log('3. Navigate to login...');
  await cdp.send('Page.navigate', { url: 'http://localhost:4200/login' });

  // Wait for login form to appear
  console.log('   Waiting for login form...');
  const loginReady = await waitFor(cdp, `document.querySelectorAll('input').length >= 2`, 20000);
  console.log('   Login form ready:', loginReady);

  if (!loginReady) {
    // Maybe redirected to /welcome - check
    let r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('   URL:', r.result?.result?.value);
    // Try navigating to /login directly
    await cdp.send('Page.navigate', { url: 'http://localhost:4200/login' });
    await sleep(8000);
  }

  // Fill in credentials via DOM
  console.log('4. Login...');
  let r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        var inputs = document.querySelectorAll('input');
        var info = inputs.length + ' inputs found. ';
        var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

        // Find username and password inputs
        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          var type = inp.type || 'text';
          var ph = inp.placeholder || '';
          info += '[' + i + ':' + type + '/' + ph + '] ';

          if (type === 'text' || type === 'email' || (type === '' && !ph.toLowerCase().includes('pass'))) {
            setter.call(inp, 'admin');
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            info += 'user=admin ';
          } else if (type === 'password' || ph.toLowerCase().includes('pass')) {
            setter.call(inp, 'Admin123!');
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            info += 'pass=set ';
          }
        }
        return info;
      })()
    `
  });
  console.log('   Fields:', r.result?.result?.value);

  await sleep(500);

  // Click login button
  r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          var t = (btns[i].textContent || '').toLowerCase();
          if (t.indexOf('login') >= 0 || t.indexOf('sign in') >= 0 || t.indexOf('enter') >= 0 || t.indexOf('submit') >= 0 || t.indexOf('دخول') >= 0) {
            btns[i].click();
            return 'clicked: ' + t.trim();
          }
        }
        // If no login button, try submit type
        var submits = document.querySelectorAll('[type="submit"]');
        if (submits.length > 0) { submits[0].click(); return 'clicked submit'; }
        // Last resort - click any button
        if (btns.length > 0) { btns[0].click(); return 'clicked first button: ' + (btns[0].textContent||'').trim(); }
        return 'no button found';
      })()
    `
  });
  console.log('   Login click:', r.result?.result?.value);

  // Wait for navigation after login (should go to /dashboard)
  console.log('5. Waiting for dashboard...');
  await sleep(5000);

  r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('   URL:', r.result?.result?.value);

  // Check if we have mat-sidenav (app loaded)
  const appReady = await waitFor(cdp, `!!document.querySelector('mat-sidenav') || !!document.querySelector('.mat-drawer')`, 15000);
  console.log('   App loaded:', appReady);

  // Now navigate to /maltego using Angular router
  console.log('6. Navigate to /maltego...');
  await cdp.send('Runtime.evaluate', {
    expression: `window.location.href = '/maltego';`
  });
  await sleep(8000);

  r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('   URL:', r.result?.result?.value);

  r = await cdp.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('input').length + ' inputs, ' + document.querySelectorAll('button').length + ' buttons, ' + document.querySelectorAll('svg').length + ' svgs, bodyLen:' + document.body.innerHTML.length`
  });
  console.log('   DOM:', r.result?.result?.value);

  // Try to interact with Maltego controls
  console.log('7. Trigger transform...');
  r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function(){
        var inputs = document.querySelectorAll('input');
        var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        var info = inputs.length + ' inputs. ';

        // Set the last text input to the entity value
        for (var i = inputs.length - 1; i >= 0; i--) {
          if (inputs[i].type === 'text' || !inputs[i].type) {
            setter.call(inputs[i], 'admin@au.org');
            inputs[i].dispatchEvent(new Event('input', {bubbles: true}));
            info += 'set[' + i + '] ';
            break;
          }
        }

        var btns = document.querySelectorAll('button');
        info += btns.length + ' btns. ';
        for (var j = 0; j < btns.length; j++) {
          var t = (btns[j].textContent || '').toLowerCase().trim();
          if (t.indexOf('transform') >= 0 || t.indexOf('run') >= 0 || t.indexOf('expand') >= 0) {
            btns[j].click();
            info += 'clicked[' + j + ']:' + t.substring(0,20);
            break;
          }
        }
        return info;
      })()
    `
  });
  console.log('   Result:', r.result?.result?.value);

  // Wait for graph to render
  await sleep(6000);

  // Take screenshot
  console.log('8. Screenshot...');
  const ss = await cdp.send('Page.captureScreenshot', { format: 'png' }, 60000);
  if (ss.result && ss.result.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(ss.result.data, 'base64'));
    console.log('   Saved: ' + fs.statSync(OUTPUT).size + ' bytes');
  } else {
    console.log('   FAIL:', JSON.stringify(ss).substring(0, 300));
  }

  cdp.close();
  try { process.kill(child.pid); } catch {}
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  console.log('Done');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
