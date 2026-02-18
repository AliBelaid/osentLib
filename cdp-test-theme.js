const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

(async () => {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const page = tabs.find(t => t.type === 'page' && t.url.includes('localhost:4100'));
  if (!page) { console.log('No page tab at localhost:4100'); return; }
  console.log('Tab:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;

  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error(`timeout: ${m}`)); }, 30000);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  const waitForEvent = (eventName, timeoutMs = 15000) => new Promise((res, rej) => {
    const to = setTimeout(() => { ws.off('message', h); rej(new Error(`event timeout: ${eventName}`)); }, timeoutMs);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.method === eventName) { clearTimeout(to); ws.off('message', h); res(msg.params); }
    };
    ws.on('message', h);
  });

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const screenshot = async (name) => {
    await sleep(2000);
    const result = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`C:\\osentLib\\screen\\${name}.png`, Buffer.from(result.data, 'base64'));
    console.log(`  -> ${name}.png`);
  };

  const nav = async (url) => {
    const loadPromise = waitForEvent('Page.loadEventFired', 20000);
    await send('Page.navigate', { url });
    await loadPromise;
    await sleep(2000); // extra wait for Angular to bootstrap
  };

  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result?.value;
  };

  const setTheme = async (theme) => {
    await evalJS(`document.documentElement.setAttribute('data-theme', '${theme}'); localStorage.setItem('theme', '${theme}'); '${theme}'`);
    await sleep(800);
  };

  ws.on('open', async () => {
    try {
      await send('Page.enable');
      await send('Runtime.enable');

      // Get login token via HTTP
      const loginResp = await new Promise((res, rej) => {
        const postData = JSON.stringify({ username: 'admin', password: 'Admin123!' });
        const req = http.request({
          hostname: 'localhost', port: 9099, path: '/api/auth/login',
          method: 'POST', headers: { 'Content-Type': 'application/json' }
        }, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
        });
        req.on('error', rej);
        req.write(postData);
        req.end();
      });
      console.log('Login token OK');

      // Navigate to login page
      await nav('http://localhost:4100/login');

      // Set auth in localStorage
      const userStr = JSON.stringify(loginResp.user).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      await evalJS(`localStorage.setItem('ausentinel_token', '${loginResp.token}'); localStorage.setItem('ausentinel_user', '${userStr}'); 'auth set'`);
      console.log('Auth set');

      const pages = [
        ['dashboard', '01-dashboard'],
        ['submit-report', '02-submit-report'],
        ['news', '03-news'],
        ['alerts', '04-alerts'],
        ['bookmarks', '05-bookmarks'],
        ['bulletins', '06-bulletins'],
        ['cyber/threats', '07-threat-intel'],
        ['leaderboard', '08-leaderboard'],
      ];

      for (const [path, name] of pages) {
        console.log(`Page: /${path}`);
        await nav(`http://localhost:4100/${path}`);

        await setTheme('dark');
        await screenshot(`${name}-dark`);

        await setTheme('light');
        await screenshot(`${name}-light`);
      }

      console.log('\nDone! All screenshots saved to screen/');
      ws.close();
    } catch (e) {
      console.error('Error:', e.message);
      ws.close();
    }
  });
})();
