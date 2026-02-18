// Screenshot key pages in both dark and light modes to verify theme switching
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJhZG1pbiIsImNvdW50cnkiOiJFVCIsImVtYWlsIjoiYWRtaW5AYXVzZW50aW5lbC5vcmciLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBVUFkbWluIiwiZXhwIjoxNzcxMjk4NDE2LCJpc3MiOiJBVVNlbnRpbmVsIiwiYXVkIjoiQVVTZW50aW5lbCJ9.r7qJhtfGIkloUz8dffjDIXW8E9u6HIRpGKq-4tCb9_A';

const PAGES = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'news', path: '/news' },
  { name: 'bulletins', path: '/bulletins' },
  { name: 'alerts', path: '/alerts' },
  { name: 'alert-rules', path: '/alert-rules' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'submit-report', path: '/submit-report' },
  { name: 'admin-sources', path: '/admin/sources' },
];

const OUT_DIR = 'C:/osentLib/screen/theme-verify';

async function main() {
  // Get CDP target
  const resp = await fetch('http://localhost:9222/json');
  const targets = await resp.json();
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target found'); process.exit(1); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;
  const pending = new Map();
  const eventWaiters = [];

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method) {
      for (let i = eventWaiters.length - 1; i >= 0; i--) {
        if (eventWaiters[i].method === msg.method) {
          eventWaiters[i].resolve(msg);
          eventWaiters.splice(i, 1);
        }
      }
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function waitForEvent(method, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${method}`)), timeout);
      eventWaiters.push({
        method,
        resolve: (msg) => { clearTimeout(timer); resolve(msg); }
      });
    });
  }

  async function navigate(url) {
    const loadPromise = waitForEvent('Page.loadEventFired', 15000);
    await send('Page.navigate', { url });
    await loadPromise;
    await new Promise(r => setTimeout(r, 2000)); // wait for Angular rendering
  }

  async function screenshot(filename) {
    const result = await send('Page.captureScreenshot', { format: 'png', quality: 90 });
    const buffer = Buffer.from(result.result.data, 'base64');
    fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
    console.log(`  Saved: ${filename} (${Math.round(buffer.length/1024)}KB)`);
  }

  async function setTheme(theme) {
    await send('Runtime.evaluate', {
      expression: `document.documentElement.setAttribute('data-theme', '${theme}'); localStorage.setItem('ausentinel_theme', '${theme}');`
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // Enable CDP domains
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });

  // Set auth token and navigate to app
  console.log('Setting auth token...');
  await navigate('http://localhost:4100/dashboard');
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('ausentinel_token', '${TOKEN}'); localStorage.setItem('ausentinel_theme', 'dark');`
  });
  await navigate('http://localhost:4100/dashboard');
  console.log('Logged in.');

  // Screenshot each page in both themes
  for (const page of PAGES) {
    console.log(`\nPage: ${page.name}`);

    await navigate(`http://localhost:4100${page.path}`);

    // Dark mode
    await setTheme('dark');
    await new Promise(r => setTimeout(r, 500));
    await screenshot(`${page.name}-dark.png`);

    // Light mode
    await setTheme('light');
    await new Promise(r => setTimeout(r, 500));
    await screenshot(`${page.name}-light.png`);
  }

  console.log('\nAll screenshots complete!');
  ws.close();
}

main().catch(e => { console.error(e); process.exit(1); });
