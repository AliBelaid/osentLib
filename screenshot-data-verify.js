// Screenshot all key pages to verify data is displayed
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/osentLib/screen/data-verify';

async function main() {
  // Get fresh token
  const loginResp = await fetch('http://localhost:9099/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
  });
  const { token } = await loginResp.json();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const resp = await fetch('http://localhost:9222/json');
  const targets = await resp.json();
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;
  const pending = new Map();
  const eventWaiters = [];

  ws.on('message', data => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method) {
      for (let i = eventWaiters.length - 1; i >= 0; i--) {
        if (eventWaiters[i].method === msg.method) { eventWaiters[i].resolve(msg); eventWaiters.splice(i, 1); }
      }
    }
  });

  const send = (method, params = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const waitForEvent = (method, timeout = 15000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), timeout);
    eventWaiters.push({ method, resolve: msg => { clearTimeout(timer); resolve(msg); } });
  });

  const navigate = async (url) => {
    const p = waitForEvent('Page.loadEventFired', 15000);
    await send('Page.navigate', { url });
    await p;
    await new Promise(r => setTimeout(r, 2500));
  };

  const screenshot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png', quality: 90 });
    const buf = Buffer.from(r.result.data, 'base64');
    fs.writeFileSync(path.join(OUT_DIR, name), buf);
    console.log(`  ${name} (${Math.round(buf.length/1024)}KB)`);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // Login
  await navigate('http://localhost:4100/dashboard');
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${token}'); localStorage.setItem('ausentinel_theme', 'dark'); localStorage.setItem('ausentinel_lang', 'en');`
  });
  await navigate('http://localhost:4100/dashboard');

  // Switch to English
  await send('Runtime.evaluate', { expression: `localStorage.setItem('ausentinel_lang', 'en');` });

  const pages = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'news', path: '/news' },
    { name: 'bulletins', path: '/bulletins' },
    { name: 'alerts', path: '/alerts' },
    { name: 'alert-rules', path: '/alert-rules' },
    { name: 'leaderboard', path: '/leaderboard' },
    { name: 'submit-report', path: '/submit-report' },
    { name: 'admin-sources', path: '/admin/sources' },
    { name: 'bookmarks', path: '/bookmarks' },
    { name: 'profile', path: '/profile' },
  ];

  for (const pg of pages) {
    await navigate(`http://localhost:4100${pg.path}`);
    await screenshot(`${pg.name}.png`);
  }

  console.log('\nDone!');
  ws.close();
}

main().catch(e => { console.error(e); process.exit(1); });
