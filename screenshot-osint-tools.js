const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');

const APP_PORT = 4100;
const REMOTE_PORT = 9222;

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'GET',
      headers: { 'Upgrade': 'websocket', 'Connection': 'Upgrade', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' }
    });
    req.on('upgrade', (res, socket) => {
      const ws = {
        socket,
        send(data) {
          const buf = Buffer.from(data);
          const mask = crypto.randomBytes(4);
          let header;
          if (buf.length < 126) { header = Buffer.alloc(6); header[0] = 0x81; header[1] = 0x80 | buf.length; mask.copy(header, 2); }
          else if (buf.length < 65536) { header = Buffer.alloc(8); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(buf.length, 2); mask.copy(header, 4); }
          else { header = Buffer.alloc(14); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(buf.length), 2); mask.copy(header, 10); }
          const masked = Buffer.alloc(buf.length);
          for (let i = 0; i < buf.length; i++) masked[i] = buf[i] ^ mask[i % 4];
          socket.write(Buffer.concat([header, masked]));
        },
        listeners: [], onMessage(fn) { this.listeners.push(fn); }, close() { try { socket.end(); } catch(e){} }
      };
      let buffer = Buffer.alloc(0); let fragments = [];
      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
          const fin = (buffer[0] & 0x80) !== 0; const opcode = buffer[0] & 0x0f;
          const hasMask = (buffer[1] & 0x80) !== 0; let payloadLen = buffer[1] & 0x7f; let offset = 2;
          if (payloadLen === 126) { if (buffer.length < 4) return; payloadLen = buffer.readUInt16BE(2); offset = 4; }
          else if (payloadLen === 127) { if (buffer.length < 10) return; payloadLen = Number(buffer.readBigUInt64BE(2)); offset = 10; }
          if (hasMask) offset += 4; if (buffer.length < offset + payloadLen) return;
          let payload = buffer.slice(offset, offset + payloadLen);
          if (hasMask) { const maskKey = buffer.slice(offset - 4, offset); for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i % 4]; }
          buffer = buffer.slice(offset + payloadLen);
          if (opcode === 0x0) { fragments.push(payload); } else if (opcode === 0x1 || opcode === 0x2) { fragments = [payload]; }
          else if (opcode === 0x8) { socket.end(); return; } else if (opcode === 0x9 || opcode === 0xa) { continue; }
          if (fin && fragments.length > 0) { const full = Buffer.concat(fragments); fragments = []; ws.listeners.forEach(fn => fn(full.toString())); }
        }
      });
      socket.on('error', () => {}); resolve(ws);
    });
    req.on('error', reject); req.end();
  });
}

function cdpSend(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    ws.send(JSON.stringify({ id, method, params }));
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 120000);
    const handler = (data) => { try { const p = JSON.parse(data); if (p.id === id) { clearTimeout(timeout); ws.listeners = ws.listeners.filter(l => l !== handler); resolve(p.result || {}); } } catch(e) {} };
    ws.onMessage(handler);
  });
}

const getJson = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); }).on('error', reject);
});

async function main() {
  try { execSync('taskkill /F /IM chrome.exe 2>nul', { stdio: 'ignore' }); } catch {}
  await new Promise(r => setTimeout(r, 2000));

  // Get token from backend directly
  const loginData = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username: 'admin', password: 'Admin123!' });
    const req = http.request({
      hostname: 'localhost', port: 9099, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject); req.write(postData); req.end();
  });
  console.log('Got token');

  const userDataDir = `${process.env.TEMP}\\chrome-cdp-osint3-${Date.now()}`;
  execSync(`start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${REMOTE_PORT} --user-data-dir="${userDataDir}" --disable-extensions --disable-component-extensions-with-background-pages --no-first-run --window-size=1920,1080 about:blank`, { shell: 'cmd.exe', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 4000));

  const tabs = await getJson(`http://127.0.0.1:${REMOTE_PORT}/json`);
  const page = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
  if (!page) { console.error('No page tab'); process.exit(1); }
  const ws = await connectWs(page.webSocketDebuggerUrl);
  let cmdId = 1;

  // Set auth on app origin
  console.log('1. Setting auth...');
  await cdpSend(ws, cmdId++, 'Page.navigate', { url: `http://localhost:${APP_PORT}` });
  await new Promise(r => setTimeout(r, 3000));
  await cdpSend(ws, cmdId++, 'Runtime.evaluate', {
    expression: `
      localStorage.setItem('ausentinel_token', ${JSON.stringify(loginData.token)});
      localStorage.setItem('ausentinel_user', ${JSON.stringify(JSON.stringify(loginData.user))});
      'done';
    `, returnByValue: true
  });

  // Navigate to OSINT tools
  console.log('2. Navigate to /osint-tools...');
  await cdpSend(ws, cmdId++, 'Page.navigate', { url: `http://localhost:${APP_PORT}/osint-tools` });
  await new Promise(r => setTimeout(r, 7000));

  const urlCheck = await cdpSend(ws, cmdId++, 'Runtime.evaluate', {
    expression: `location.pathname`, returnByValue: true
  });
  console.log('   Page:', urlCheck.result?.value);

  // Type into the email input field using keyboard events
  console.log('3. Typing email and clicking Check Breaches...');
  const typeScript = `
    (async () => {
      const input = document.querySelector('input[matInput]');
      if (!input) return 'no_input';

      // Focus the input
      input.focus();
      input.click();
      await new Promise(r => setTimeout(r, 200));

      // Clear and type using dispatchEvent for each character
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const email = 'test@example.com';
      for (let i = 0; i < email.length; i++) {
        input.value = email.substring(0, i + 1);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise(r => setTimeout(r, 500));

      // Click Check Breaches button
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Check Breaches') || btn.textContent.includes('Check') || btn.textContent.includes('Breach')) {
          btn.click();
          return 'clicked: ' + btn.textContent.trim();
        }
      }
      return 'no_breach_btn. buttons: ' + [...buttons].map(b=>b.textContent.trim()).join('|');
    })()
  `;
  const typeResult = await cdpSend(ws, cmdId++, 'Runtime.evaluate', {
    expression: typeScript, awaitPromise: true, returnByValue: true
  });
  console.log('   Result:', typeResult.result?.value);

  // Wait for API call to complete
  console.log('4. Waiting 8s for results...');
  await new Promise(r => setTimeout(r, 8000));

  // Check what rendered
  const stateCheck = await cdpSend(ws, cmdId++, 'Runtime.evaluate', {
    expression: `JSON.stringify({
      url: location.pathname,
      tables: document.querySelectorAll('table').length,
      tbodyRows: document.querySelectorAll('tbody tr').length,
      matRows: document.querySelectorAll('mat-row, .mat-mdc-row').length,
      allText: document.body.innerText.substring(0, 300)
    })`, returnByValue: true
  });
  console.log('   State:', stateCheck.result?.value);

  // Screenshot
  console.log('5. Screenshot...');
  await cdpSend(ws, cmdId++, 'Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 500));
  const shot = await cdpSend(ws, cmdId++, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\osentLib\\screenshot-osint-tools.png', Buffer.from(shot.data, 'base64'));
  console.log('   Saved!');

  ws.close();
  setTimeout(() => { try { execSync('taskkill /F /IM chrome.exe 2>nul', { stdio: 'ignore' }); } catch {} process.exit(0); }, 1000);
}

main().catch(e => { console.error(e); process.exit(1); });
