const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const net = require('net');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT = 'C:\\osentLib\\screen\\incidents-page.png';
const TEMP_DIR = process.env.TEMP + '\\cdp-incidents-' + Date.now();
const PORT = 9231;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function httpPost(host, port, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: host, port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const parsed = new (require('url').URL)(url);
    const key = Buffer.from(Array(16).fill(0).map(() => Math.floor(Math.random() * 256))).toString('base64');
    const socket = net.createConnection({ host: parsed.hostname, port: parseInt(parsed.port) }, () => {
      socket.write(
        `GET ${parsed.pathname} HTTP/1.1\r\nHost: ${parsed.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let upgraded = false, buffer = Buffer.alloc(0), callbacks = {}, idC = 0;
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const idx = buffer.indexOf('\r\n\r\n');
        if (idx !== -1) {
          upgraded = true; buffer = buffer.slice(idx + 4);
          resolve({
            call: (method, params = {}) => {
              const id = ++idC;
              return new Promise(res => {
                callbacks[id] = res;
                const p = Buffer.from(JSON.stringify({ id, method, params }));
                const m = Buffer.from([0x12, 0x34, 0x56, 0x78]);
                const masked = Buffer.alloc(p.length);
                for (let i = 0; i < p.length; i++) masked[i] = p[i] ^ m[i % 4];
                let h;
                if (p.length < 126) h = Buffer.from([0x81, 0x80 | p.length, ...m]);
                else if (p.length < 65536) h = Buffer.from([0x81, 0x80 | 126, (p.length >> 8) & 0xff, p.length & 0xff, ...m]);
                else { const b = Buffer.alloc(14); b[0] = 0x81; b[1] = 0x80 | 127; b.writeBigUInt64BE(BigInt(p.length), 2); m.copy(b, 10); h = b; }
                socket.write(Buffer.concat([h, masked]));
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
        if (l0 < 126) { pl = l0; hl = 2; }
        else if (l0 === 126) { if (buffer.length < 4) return; pl = buffer.readUInt16BE(2); hl = 4; }
        else { if (buffer.length < 10) return; pl = Number(buffer.readBigUInt64BE(2)); hl = 10; }
        if (buffer.length < hl + pl) return;
        const payload = buffer.slice(hl, hl + pl); buffer = buffer.slice(hl + pl);
        try {
          const msg = JSON.parse(payload.toString());
          if (msg.id && callbacks[msg.id]) { callbacks[msg.id](msg.result || msg); delete callbacks[msg.id]; }
        } catch (e) {}
      }
    });
    socket.on('error', reject);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Logging in...');
  const login = await httpPost('localhost', 8088, '/api/auth/login', { username: 'admin', password: 'Admin123!' });
  if (!login.token) { console.error('Login failed:', JSON.stringify(login)); process.exit(1); }
  console.log('Token OK');

  // Create a couple of sample incidents via API so the page has data
  const authHeader = { Authorization: `Bearer ${login.token}` };

  async function apiPost(path, body) {
    const data = JSON.stringify(body);
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost', port: 8088, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...authHeader }
      }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
      });
      req.on('error', () => resolve({}));
      req.write(data); req.end();
    });
  }

  // Check if incidents already exist
  const existing = await new Promise(resolve => {
    http.get({ hostname: 'localhost', port: 8088, path: '/api/incident?pageSize=1', headers: authHeader }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ total: 0 }); } });
    }).on('error', () => resolve({ total: 0 }));
  });

  if (!existing.total || existing.total === 0) {
    console.log('Creating sample incidents...');
    // Note: incident endpoint uses multipart/form-data - use form encoded approach
    async function postFormIncident(fields) {
      const boundary = '----FormBoundary' + Date.now();
      let body = '';
      for (const [k, v] of Object.entries(fields)) {
        if (Array.isArray(v)) {
          for (const item of v) body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${item}\r\n`;
        } else {
          body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        }
      }
      body += `--${boundary}--\r\n`;
      const buf = Buffer.from(body);
      return new Promise(resolve => {
        const req = http.request({
          hostname: 'localhost', port: 8088, path: '/api/incident', method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': buf.length, ...authHeader }
        }, res => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
        });
        req.on('error', () => resolve({}));
        req.write(buf); req.end();
      });
    }

    await postFormIncident({
      title: 'Ransomware Attack on Nigerian Federal Ministry Servers',
      description: 'A sophisticated ransomware variant encrypted critical servers at the Federal Ministry of Communications. Attack vector was a spearphishing email targeting senior officials.',
      severity: 'critical', sector: 'government', incidentType: 'ransomware',
      countryCode: 'NG', source: 'CERT-NG',
      affectedSystems: ['Mail Server (Exchange)', 'File Server (NAS)', 'Active Directory'],
      iocs: ['185.220.101.34', 'au-commission-portal.click']
    });

    await postFormIncident({
      title: 'DDoS Attack Against Kenyan Banking Infrastructure',
      description: 'Volumetric DDoS attack targeting multiple Kenyan banking portals, peaking at 800Gbps.',
      severity: 'high', sector: 'banking', incidentType: 'ddos',
      countryCode: 'KE', source: 'KE-CIRT',
      affectedSystems: ['Online Banking Portal', 'Mobile Banking API', 'ATM Gateway'],
      iocs: ['91.234.56.78', '203.0.113.42']
    });

    await postFormIncident({
      title: 'Phishing Campaign Targeting Egyptian Government Officials',
      description: 'Widespread phishing campaign using fake AU Commission emails to harvest credentials.',
      severity: 'high', sector: 'government', incidentType: 'phishing',
      countryCode: 'EG', source: 'EG-CERT',
      affectedSystems: ['Email Gateway', 'Web Proxy'],
      iocs: ['au-commission-portal.click', 'login-au.org']
    });

    await postFormIncident({
      title: 'Malware Infection in Ethiopian Telecom Network',
      description: 'Backdoor malware discovered on core routing infrastructure of major Ethiopian telecom provider.',
      severity: 'critical', sector: 'telecom', incidentType: 'malware',
      countryCode: 'ET', source: 'EthioTelecom Security',
      affectedSystems: ['Core Router Cluster', 'DNS Infrastructure'],
      iocs: ['c4d5e6f7a8b9c0d1', '45.33.32.156']
    });

    await postFormIncident({
      title: 'Data Exfiltration at South African Energy Company',
      description: 'Anomalous data transfers detected from internal databases. Approx 2.3TB transferred over 72 hours.',
      severity: 'critical', sector: 'energy', incidentType: 'data_breach',
      countryCode: 'ZA', source: 'Internal SOC',
      affectedSystems: ['Customer Database', 'SCADA Control System'],
      iocs: ['swift-africa.net', 'e7d8f9a0b1c2d3e4']
    });

    console.log('Sample incidents created.');
  } else {
    console.log(`Found ${existing.total} existing incidents, skipping creation.`);
  }

  console.log('Launching Chrome...');
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${TEMP_DIR}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--window-size=1920,1080',
  ], { stdio: 'ignore' });

  let tabs;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try { tabs = JSON.parse(await httpGet(`http://127.0.0.1:${PORT}/json`)); if (tabs.length > 0) break; } catch (e) {}
  }

  const tab = tabs.find(t => t.type === 'page') || tabs[0];
  const ws = await connectWS(tab.webSocketDebuggerUrl);

  // Navigate to app first to set localStorage
  await ws.call('Page.navigate', { url: 'http://localhost:8088' });
  await sleep(2000);

  // Set auth tokens
  const userJson = JSON.stringify(login.user || {}).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  await ws.call('Runtime.evaluate', { expression: `
    localStorage.setItem('ausentinel_token', '${login.token}');
    localStorage.setItem('ausentinel_user', '${userJson}');
    localStorage.setItem('preferredLanguage', 'en');
    'done';
  ` });

  // Navigate to incidents page
  console.log('Navigating to /cyber/incidents...');
  await ws.call('Page.navigate', { url: 'http://localhost:8088/cyber/incidents' });
  console.log('Waiting for page to load...');
  await sleep(5000);

  await ws.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await sleep(1000);

  console.log('Taking screenshot...');
  const result = await ws.call('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync('C:\\osentLib\\screen', { recursive: true });
  fs.writeFileSync(OUTPUT, Buffer.from(result.data, 'base64'));
  console.log('Saved:', OUTPUT, fs.statSync(OUTPUT).size, 'bytes');

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
