const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const net = require('net');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_TO_CAPTURE = 'http://localhost:4100/social-search';
const OUTPUT = 'C:\\osentLib\\screen\\social_search.png';
const TEMP_DIR = process.env.TEMP + '\\cdp-screenshot-' + Date.now();
const PORT = 9223;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Minimal WebSocket client (no ws module needed)
function connectWS(url) {
  return new Promise((resolve, reject) => {
    const parsed = new (require('url').URL)(url);
    const key = Buffer.from(Array(16).fill(0).map(() => Math.floor(Math.random()*256))).toString('base64');

    const socket = net.createConnection({ host: parsed.hostname, port: parsed.port }, () => {
      socket.write(
        `GET ${parsed.pathname} HTTP/1.1\r\n` +
        `Host: ${parsed.host}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`
      );
    });

    let upgraded = false;
    let buffer = Buffer.alloc(0);
    let msgCallback = null;

    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);

      if (!upgraded) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          upgraded = true;
          buffer = buffer.slice(headerEnd + 4);
          resolve({
            send: (data) => {
              const payload = Buffer.from(JSON.stringify(data));
              const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
              const masked = Buffer.alloc(payload.length);
              for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];

              let header;
              if (payload.length < 126) {
                header = Buffer.from([0x81, 0x80 | payload.length, ...mask]);
              } else {
                header = Buffer.from([0x81, 0x80 | 126, (payload.length >> 8) & 0xff, payload.length & 0xff, ...mask]);
              }
              socket.write(Buffer.concat([header, masked]));
            },
            onMessage: (cb) => { msgCallback = cb; },
            close: () => socket.destroy()
          });
        }
        return;
      }

      // Parse WebSocket frames
      while (buffer.length >= 2) {
        const len0 = buffer[1] & 0x7f;
        let payloadLen, headerLen;
        if (len0 < 126) { payloadLen = len0; headerLen = 2; }
        else if (len0 === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2); headerLen = 4;
        } else {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2)); headerLen = 10;
        }

        if (buffer.length < headerLen + payloadLen) return;

        const payload = buffer.slice(headerLen, headerLen + payloadLen);
        buffer = buffer.slice(headerLen + payloadLen);

        if (msgCallback) {
          try { msgCallback(JSON.parse(payload.toString())); } catch(e) {}
        }
      }
    });

    socket.on('error', reject);
  });
}

async function main() {
  console.log('Launching Chrome headless...');
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    URL_TO_CAPTURE
  ], { stdio: 'ignore' });

  // Wait for Chrome to start
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const json = await httpGet(`http://127.0.0.1:${PORT}/json`);
      const tabs = JSON.parse(json);
      if (tabs.length > 0) {
        console.log('Chrome ready, tab:', tabs[0].url);
        break;
      }
    } catch(e) {
      if (i === 19) { console.error('Chrome failed to start'); chrome.kill(); process.exit(1); }
    }
  }

  // Wait extra for Angular to render
  console.log('Waiting for Angular to render...');
  await new Promise(r => setTimeout(r, 6000));

  // Get WebSocket URL
  const json = await httpGet(`http://127.0.0.1:${PORT}/json`);
  const tabs = JSON.parse(json);
  const wsUrl = tabs[0].webSocketDebuggerUrl;
  console.log('Connecting to:', wsUrl);

  const ws = await connectWS(wsUrl);

  // Take screenshot via CDP
  let screenshotResolve;
  const screenshotPromise = new Promise(r => screenshotResolve = r);

  ws.onMessage(msg => {
    if (msg.id === 1 && msg.result) {
      screenshotResolve(msg.result);
    }
  });

  ws.send({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png', captureBeyondViewport: false } });

  const result = await screenshotPromise;

  fs.mkdirSync('C:\\osentLib\\screen', { recursive: true });
  fs.writeFileSync(OUTPUT, Buffer.from(result.data, 'base64'));
  console.log('Screenshot saved:', OUTPUT, '(' + fs.statSync(OUTPUT).size + ' bytes)');

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
