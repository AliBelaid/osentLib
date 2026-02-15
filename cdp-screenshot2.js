const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const net = require('net');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_TO_CAPTURE = 'http://localhost:4100/social-search';
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
    let msgCallback = null;
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const idx = buffer.indexOf('\r\n\r\n');
        if (idx !== -1) { upgraded = true; buffer = buffer.slice(idx + 4); resolve({ send: d => {
          const p = Buffer.from(JSON.stringify(d));
          const m = Buffer.from([0x12,0x34,0x56,0x78]);
          const masked = Buffer.alloc(p.length);
          for(let i=0;i<p.length;i++) masked[i]=p[i]^m[i%4];
          let h;
          if(p.length<126) h=Buffer.from([0x81,0x80|p.length,...m]);
          else if(p.length<65536) h=Buffer.from([0x81,0x80|126,(p.length>>8)&0xff,p.length&0xff,...m]);
          else { const b=Buffer.alloc(14); b[0]=0x81; b[1]=0x80|127; b.writeBigUInt64BE(BigInt(p.length),2); m.copy(b,10); h=b; }
          socket.write(Buffer.concat([h,masked]));
        }, onMessage: cb => { msgCallback = cb; }, close: () => socket.destroy() }); }
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
        if(msgCallback) try{msgCallback(JSON.parse(payload.toString()));}catch(e){}
      }
    });
    socket.on('error', reject);
  });
}

async function main() {
  console.log('Launching Chrome...');
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_DIR}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions',
    '--window-size=1920,1080',
  ], { stdio: 'ignore' });

  // Wait for Chrome to be ready
  let tabs;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      tabs = JSON.parse(await httpGet(`http://127.0.0.1:${PORT}/json`));
      if (tabs.length > 0) break;
    } catch(e) {}
  }

  if (!tabs || tabs.length === 0) {
    console.error('Chrome did not start'); chrome.kill(); process.exit(1);
  }

  // Find or navigate to our URL
  let targetTab = tabs.find(t => t.url.includes('localhost:4100'));
  if (!targetTab) {
    // Navigate the first tab
    targetTab = tabs.find(t => t.type === 'page') || tabs[0];
  }

  console.log('Target tab:', targetTab.url, targetTab.id);
  const ws = await connectWS(targetTab.webSocketDebuggerUrl);

  let idCounter = 1;
  function cdpCall(method, params = {}) {
    return new Promise(resolve => {
      const id = idCounter++;
      ws.onMessage(msg => { if (msg.id === id) resolve(msg.result); });
      ws.send({ id, method, params });
    });
  }

  // Navigate to our URL
  console.log('Navigating to', URL_TO_CAPTURE);
  await cdpCall('Page.navigate', { url: URL_TO_CAPTURE });

  // Wait for Angular to render
  console.log('Waiting 8s for Angular...');
  await new Promise(r => setTimeout(r, 8000));

  // Set viewport
  await cdpCall('Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });

  await new Promise(r => setTimeout(r, 1000));

  // Screenshot
  console.log('Taking screenshot...');
  const result = await cdpCall('Page.captureScreenshot', { format: 'png' });

  fs.mkdirSync('C:\\osentLib\\screen', { recursive: true });
  fs.writeFileSync(OUTPUT, Buffer.from(result.data, 'base64'));
  console.log('Saved:', OUTPUT, fs.statSync(OUTPUT).size, 'bytes');

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
