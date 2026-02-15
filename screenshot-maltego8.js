const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9241;
const APP_PORT = 4100;
const OUTPUT = 'C:\\osentLib\\screenshot-maltego.png';

function getPageWsUrl() {
  return new Promise((resolve, reject) => {
    let retries = 0;
    function tryGet() {
      const req = http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const tabs = JSON.parse(body);
            const page = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
            if (page?.webSocketDebuggerUrl) resolve(page.webSocketDebuggerUrl);
            else if (retries < 20) { retries++; setTimeout(tryGet, 500); }
            else reject(new Error('No page'));
          } catch (e) { if (retries < 20) { retries++; setTimeout(tryGet, 500); } else reject(e); }
        });
      });
      req.on('error', () => { if (retries < 20) { retries++; setTimeout(tryGet, 500); } else reject(new Error('fail')); });
    }
    tryGet();
  });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 1; this.p = new Map(); this.buf = Buffer.alloc(0); this.s = null; }
  connect() {
    return new Promise((res, rej) => {
      const u = new URL(this.ws), k = crypto.randomBytes(16).toString('base64');
      this.s = net.createConnection({ host: u.hostname, port: parseInt(u.port) }, () => {
        this.s.write(`GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${k}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
      });
      let d = false;
      this.s.on('data', c => {
        if (!d) { const s = c.toString(); if (s.includes('101')) { d = true; const i = s.indexOf('\r\n\r\n'); if (i !== -1 && i + 4 < c.length) this.buf = Buffer.concat([this.buf, c.slice(i + 4)]); this._pf(); res(); } }
        else { this.buf = Buffer.concat([this.buf, c]); this._pf(); }
      });
      this.s.on('error', rej);
    });
  }
  _pf() {
    while (true) {
      if (this.buf.length < 2) return;
      let pl = this.buf[1] & 0x7f, o = 2;
      if (pl === 126) { if (this.buf.length < 4) return; pl = this.buf.readUInt16BE(2); o = 4; }
      else if (pl === 127) { if (this.buf.length < 10) return; pl = this.buf.readUInt32BE(2) * 4294967296 + this.buf.readUInt32BE(6); o = 10; }
      if (this.buf.length < o + pl) return;
      const p = this.buf.slice(o, o + pl); this.buf = this.buf.slice(o + pl);
      try { const m = JSON.parse(p.toString()); if (m.id && this.p.has(m.id)) { const c = this.p.get(m.id); this.p.delete(m.id); clearTimeout(c.t); c.r(m); } } catch {}
    }
  }
  _sf(d) {
    const p = Buffer.from(JSON.stringify(d)), mk = crypto.randomBytes(4); let h;
    if (p.length < 126) { h = Buffer.alloc(6); h[0]=0x81; h[1]=0x80|p.length; mk.copy(h,2); }
    else if (p.length < 65536) { h = Buffer.alloc(8); h[0]=0x81; h[1]=0x80|126; h.writeUInt16BE(p.length,2); mk.copy(h,4); }
    else { h = Buffer.alloc(14); h[0]=0x81; h[1]=0x80|127; h.writeBigUInt64BE(BigInt(p.length),2); mk.copy(h,10); }
    const m = Buffer.alloc(p.length); for (let i=0;i<p.length;i++) m[i]=p[i]^mk[i%4];
    this.s.write(Buffer.concat([h,m]));
  }
  send(method, params={}, tms=60000) {
    return new Promise(r => { const id=this.id++; const t=setTimeout(()=>{this.p.delete(id);r({error:'timeout',method});},tms); this.p.set(id,{r,t}); this._sf({id,method,params}); });
  }
  close() { if (this.s) this.s.destroy(); }
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
  console.log('1. Chrome...');
  const tmpDir = 'C:\\temp\\chrome-m8-' + Date.now();
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--window-size=1920,1080',
    '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-component-extensions-with-background-pages',
    `--user-data-dir=${tmpDir}`, 'about:blank'
  ], { stdio: 'ignore', detached: true });
  child.unref();
  await sleep(3000);

  console.log('2. CDP...');
  const wsUrl = await getPageWsUrl();
  const cdp = new CDP(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  // Load app
  console.log('3. Load app...');
  await cdp.send('Page.navigate', { url: `http://localhost:${APP_PORT}` });
  await sleep(5000);

  // Login using same-origin proxy (/api -> localhost:9099)
  console.log('4. Login via proxy...');
  let r = await cdp.send('Runtime.evaluate', {
    expression: `
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
      })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem('ausentinel_token', data.token);
        localStorage.setItem('ausentinel_user', JSON.stringify(data.user));
        return 'OK: ' + data.user?.username + ' roles:' + JSON.stringify(data.user?.roles);
      })
      .catch(e => 'FAIL: ' + e.message)
    `,
    awaitPromise: true
  });
  console.log('   ', r.result?.result?.value);

  // Navigate to /maltego
  console.log('5. /maltego...');
  await cdp.send('Page.navigate', { url: `http://localhost:${APP_PORT}/maltego` });
  console.log('   Waiting...');
  await waitFor(cdp, `!!document.querySelector('router-outlet')`, 20000);
  await sleep(5000);

  r = await cdp.send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('   URL:', r.result?.result?.value);

  r = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify({i:document.querySelectorAll('input').length, b:document.querySelectorAll('button').length, s:document.querySelectorAll('svg').length, nav:!!document.querySelector('mat-sidenav')})`
  });
  console.log('   DOM:', r.result?.result?.value);

  // Interact
  console.log('6. Transform...');
  r = await cdp.send('Runtime.evaluate', {
    expression: `
      (function(){
        var info = '';
        var inputs = document.querySelectorAll('input');
        var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        info += inputs.length + 'in ';
        for (var i=0; i<inputs.length; i++) {
          if (inputs[i].type==='text'||!inputs[i].type) {
            setter.call(inputs[i], 'admin@au.org');
            inputs[i].dispatchEvent(new Event('input',{bubbles:true}));
            info+='SET '; break;
          }
        }
        var btns = document.querySelectorAll('button');
        info += btns.length + 'bt ';
        for (var j=0;j<btns.length;j++) {
          var t=(btns[j].textContent||'').toLowerCase().trim();
          if (t.indexOf('transform')>=0) { btns[j].click(); info+='CLICK:'+t.substring(0,15); break; }
        }
        return info;
      })()
    `
  });
  console.log('   ', r.result?.result?.value);
  await sleep(6000);

  // Screenshot
  console.log('7. Screenshot...');
  const ss = await cdp.send('Page.captureScreenshot', { format: 'png' }, 60000);
  if (ss.result?.data) {
    fs.writeFileSync(OUTPUT, Buffer.from(ss.result.data, 'base64'));
    console.log('   OK: ' + fs.statSync(OUTPUT).size + ' bytes');
  } else {
    console.log('   FAIL');
  }

  cdp.close();
  try { process.kill(child.pid); } catch {}
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  console.log('Done');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
