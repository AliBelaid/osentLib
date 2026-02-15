const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const net = require('net');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT = 'C:\\osentLib\\screen\\social_search.png';
const TEMP_DIR = process.env.TEMP + '\\cdp-ss-' + Date.now();
const PORT = 9224;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new (require('url').URL)(url);
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: parsed.hostname, port: parsed.port,
      path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const parsed = new (require('url').URL)(url);
    const key = Buffer.from(Array(16).fill(0).map(() => Math.floor(Math.random()*256))).toString('base64');
    const socket = net.createConnection({ host: parsed.hostname, port: parseInt(parsed.port) }, () => {
      socket.write(
        `GET ${parsed.pathname} HTTP/1.1\r\nHost: ${parsed.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let upgraded = false;
    let buffer = Buffer.alloc(0);
    let callbacks = {};
    let idC = 0;
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const idx = buffer.indexOf('\r\n\r\n');
        if (idx !== -1) {
          upgraded = true;
          buffer = buffer.slice(idx + 4);
          resolve({
            call: (method, params = {}) => {
              const id = ++idC;
              return new Promise(res => {
                callbacks[id] = res;
                const p = Buffer.from(JSON.stringify({ id, method, params }));
                const m = Buffer.from([0x12,0x34,0x56,0x78]);
                const masked = Buffer.alloc(p.length);
                for(let i=0;i<p.length;i++) masked[i]=p[i]^m[i%4];
                let h;
                if(p.length<126) h=Buffer.from([0x81,0x80|p.length,...m]);
                else if(p.length<65536) h=Buffer.from([0x81,0x80|126,(p.length>>8)&0xff,p.length&0xff,...m]);
                else { const b=Buffer.alloc(14); b[0]=0x81; b[1]=0x80|127; b.writeBigUInt64BE(BigInt(p.length),2); m.copy(b,10); h=b; }
                socket.write(Buffer.concat([h,masked]));
              });
            },
            close: () => socket.destroy()
          });
        }
        return;
      }
      while (buffer.length >= 2) {
        const l0 = buffer[1] & 0x7f;
        let pl, hl;
        if(l0<126){pl=l0;hl=2;}
        else if(l0===126){if(buffer.length<4)return;pl=buffer.readUInt16BE(2);hl=4;}
        else{if(buffer.length<10)return;pl=Number(buffer.readBigUInt64BE(2));hl=10;}
        if(buffer.length<hl+pl) return;
        const payload = buffer.slice(hl, hl+pl);
        buffer = buffer.slice(hl+pl);
        try {
          const msg = JSON.parse(payload.toString());
          if (msg.id && callbacks[msg.id]) {
            callbacks[msg.id](msg.result || msg);
            delete callbacks[msg.id];
          }
        } catch(e) {}
      }
    });
    socket.on('error', reject);
  });
}

async function main() {
  // First, login to get token
  console.log('Logging in...');
  let loginResult;
  try {
    loginResult = await httpPost('http://localhost:9099/api/auth/login', {
      username: 'admin',
      password: 'Admin123!'
    });
    console.log('Login result:', loginResult.token ? 'Got token' : 'No token', JSON.stringify(loginResult).substring(0, 200));
  } catch(e) {
    console.error('Login failed:', e.message);
    process.exit(1);
  }

  console.log('Launching Chrome...');
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_DIR}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--window-size=1920,1080',
  ], { stdio: 'ignore' });

  // Wait for Chrome
  let tabs;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      tabs = JSON.parse(await httpGet(`http://127.0.0.1:${PORT}/json`));
      if (tabs.length > 0) break;
    } catch(e) {}
  }

  const targetTab = tabs.find(t => t.type === 'page') || tabs[0];
  console.log('Connecting to tab:', targetTab.url);
  const ws = await connectWS(targetTab.webSocketDebuggerUrl);

  // Navigate to app root first
  console.log('Navigating to app...');
  await ws.call('Page.navigate', { url: 'http://localhost:4100' });
  await new Promise(r => setTimeout(r, 3000));

  // Set localStorage with auth token
  console.log('Setting auth token in localStorage...');
  const tokenJs = `
    localStorage.setItem('ausentinel_token', '${loginResult.token || ''}');
    localStorage.setItem('ausentinel_user', '${JSON.stringify(loginResult.user || {}).replace(/'/g, "\\'")}');
    'done';
  `;
  const evalResult = await ws.call('Runtime.evaluate', { expression: tokenJs });
  console.log('Token set:', evalResult);

  // Now navigate to social search
  console.log('Navigating to social search...');
  await ws.call('Page.navigate', { url: 'http://localhost:4100/social-search' });

  // Wait for Angular to render
  console.log('Waiting 8s for render...');
  await new Promise(r => setTimeout(r, 8000));

  // Set viewport
  await ws.call('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot
  console.log('Taking screenshot...');
  const result = await ws.call('Page.captureScreenshot', { format: 'png' });

  fs.mkdirSync('C:\\osentLib\\screen', { recursive: true });
  fs.writeFileSync(OUTPUT, Buffer.from(result.data, 'base64'));
  console.log('Saved:', OUTPUT, fs.statSync(OUTPUT).size, 'bytes');

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
