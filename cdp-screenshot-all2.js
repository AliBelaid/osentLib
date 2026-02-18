const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const SCREEN_DIR = 'C:\\osentLib\\screen';

const PAGES = [
  { name: 'dashboard', path: '/dashboard', wait: 3000 },
  { name: 'news', path: '/news', wait: 3000 },
  { name: 'bulletins', path: '/bulletins', wait: 3000 },
  { name: 'alerts', path: '/alerts', wait: 3000 },
  { name: 'alerts-rules', path: '/alerts/rules', wait: 3000 },
  { name: 'maps-threats', path: '/maps/threats', wait: 5000 },
  { name: 'maps-alerts', path: '/maps/alerts', wait: 4000 },
  { name: 'maps-timeline', path: '/maps/timeline', wait: 4000 },
  { name: 'cyber-threats', path: '/cyber/threats', wait: 3000 },
  { name: 'cyber-attack-map', path: '/cyber/attack-map', wait: 5000 },
  { name: 'cyber-countries', path: '/cyber/countries', wait: 3000 },
  { name: 'cyber-incidents', path: '/cyber/incidents', wait: 3000 },
  { name: 'social-search', path: '/social-search', wait: 3000 },
  { name: 'advanced-search', path: '/search/advanced', wait: 3000 },
  { name: 'keyword-manager', path: '/search/keywords', wait: 3000 },
  { name: 'dns-lookup', path: '/dns/lookup', wait: 3000 },
  { name: 'domain-watchlist', path: '/dns/watchlist', wait: 3000 },
  { name: 'osint-tools', path: '/osint-tools', wait: 3000 },
  { name: 'bookmarks', path: '/bookmarks', wait: 3000 },
  { name: 'leaderboard', path: '/leaderboard', wait: 3000 },
  { name: 'profile', path: '/profile', wait: 3000 },
  { name: 'admin-users', path: '/admin/users', wait: 3000 },
  { name: 'admin-sources', path: '/admin/sources', wait: 3000 },
  { name: 'admin-import', path: '/admin/import', wait: 3000 },
];

(async () => {
  if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const page = tabs.find(t => t.type === 'page' && t.url.includes('localhost:4100'));
  if (!page) { console.log('No localhost:4100 tab'); return; }
  console.log('Tab:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout ' + m)); }, 60000);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  ws.on('open', async () => {
    try {
      // First navigate away from maltego (which may be frozen) using Page.navigate
      console.log('Escaping current page...');
      await send('Page.navigate', { url: 'http://localhost:4100/login' });
      await new Promise(r => setTimeout(r, 4000));

      // Login
      console.log('Logging in...');
      const lr = await send('Runtime.evaluate', {
        expression: `(async()=>{
          const res = await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"Admin123!"})});
          const data = await res.json();
          if(data.token){localStorage.setItem("ausentinel_token",data.token);localStorage.setItem("ausentinel_user",JSON.stringify(data.user));return "ok";}
          return "fail";
        })()`,
        awaitPromise: true,
        timeout: 10000
      });
      console.log('Login:', lr.result?.value);

      // Navigate to dashboard to establish auth session
      await send('Page.navigate', { url: 'http://localhost:4100/dashboard' });
      await new Promise(r => setTimeout(r, 4000));

      const urlCheck = await send('Runtime.evaluate', { expression: 'location.href' });
      console.log('Auth check:', urlCheck.result?.value);

      console.log(`\nCapturing ${PAGES.length} pages...\n`);
      let success = 0;

      for (const pg of PAGES) {
        try {
          // Navigate using Angular router
          await send('Runtime.evaluate', {
            expression: `(() => {
              const links = document.querySelectorAll('a[routerlink], a[href]');
              for (const link of links) {
                const href = link.getAttribute('routerlink') || link.getAttribute('href') || '';
                if (href === '${pg.path}') { link.click(); return 'clicked'; }
              }
              history.pushState({}, '', '${pg.path}');
              window.dispatchEvent(new PopStateEvent('popstate'));
              return 'popstate';
            })()`
          });
          await new Promise(r => setTimeout(r, pg.wait));

          const url = await send('Runtime.evaluate', { expression: 'location.pathname' });

          const ss = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(SCREEN_DIR, `${pg.name}.png`), Buffer.from(ss.data, 'base64'));
          console.log(`  OK  ${pg.name.padEnd(20)} (${url.result?.value})`);
          success++;
        } catch (e) {
          console.log(`  FAIL ${pg.name.padEnd(20)} - ${e.message}`);
        }
      }

      // Maltego empty state
      console.log('\nMaltego (empty state)...');
      try {
        await send('Runtime.evaluate', {
          expression: `(() => { history.pushState({}, '', '/maltego'); window.dispatchEvent(new PopStateEvent('popstate')); return 'ok'; })()`
        });
        await new Promise(r => setTimeout(r, 3000));
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREEN_DIR, 'maltego.png'), Buffer.from(ss.data, 'base64'));
        console.log('  OK  maltego');
        success++;
      } catch (e) {
        console.log('  FAIL maltego -', e.message);
      }

      // Maltego with transform
      console.log('\nMaltego (with transform)...');
      try {
        await send('Runtime.evaluate', {
          expression: `(() => {
            const input = document.querySelector('input[matinput], input[type="text"]');
            if (!input) return 'no input';
            const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            s.call(input, 'github.com');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return 'set';
          })()`
        });
        await new Promise(r => setTimeout(r, 500));

        await send('Runtime.evaluate', {
          expression: `(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Transform'));
            if (btn) { btn.click(); return 'clicked'; }
            return 'no btn';
          })()`
        });

        console.log('  Waiting 18s for transform...');
        await new Promise(r => setTimeout(r, 18000));

        const nodeCount = await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('circle.graph-node').length`
        });
        console.log('  Nodes:', nodeCount.result?.value);

        const ss = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREEN_DIR, 'maltego-transform.png'), Buffer.from(ss.data, 'base64'));
        console.log('  OK  maltego-transform');
        success++;
      } catch (e) {
        console.log('  FAIL maltego-transform -', e.message);
      }

      // Landing/welcome page (no auth needed)
      console.log('\nLanding page...');
      try {
        await send('Page.navigate', { url: 'http://localhost:4100/welcome' });
        await new Promise(r => setTimeout(r, 3000));
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREEN_DIR, 'welcome.png'), Buffer.from(ss.data, 'base64'));
        console.log('  OK  welcome');
        success++;
      } catch (e) {
        console.log('  FAIL welcome -', e.message);
      }

      // Login page
      console.log('Login page...');
      try {
        await send('Page.navigate', { url: 'http://localhost:4100/login' });
        await new Promise(r => setTimeout(r, 3000));
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SCREEN_DIR, 'login.png'), Buffer.from(ss.data, 'base64'));
        console.log('  OK  login');
        success++;
      } catch (e) {
        console.log('  FAIL login -', e.message);
      }

      console.log(`\nDone! ${success} screenshots saved to screen/`);
      ws.close();
    } catch (e) {
      console.error('Error:', e.message);
      ws.close();
    }
  });

  ws.on('error', e => console.error('WS error:', e.message));
})();
