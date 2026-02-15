const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function run() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = tabs.find(t => t.type === 'page' && t.url.includes('localhost:4100'));
  if (!page) { console.log('No page found'); return; }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => reject(new Error('CDP timeout')), 300000);
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.off('message', handler);
          resolve(msg.result || msg);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalAsync(expr) {
    const result = await send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      timeout: 240000
    });
    return result.result?.value;
  }

  ws.on('open', async () => {
    try {
      // Login
      console.log('Logging in...');
      const loginMsg = await evalAsync(`
        (async () => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
          });
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
            return 'OK';
          }
          return 'FAIL: ' + JSON.stringify(data);
        })()
      `);
      console.log('Login:', loginMsg);

      // Inject test helper with 30s per-request timeout
      await evalAsync(`
        (async () => {
          window.__test = async function(method, url, body) {
            const token = localStorage.getItem('auth_token') || '';
            const opts = {
              method,
              headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(30000)
            };
            if (body) opts.body = JSON.stringify(body);
            try {
              const res = await fetch(url, opts);
              const text = await res.text();
              let info = '';
              try {
                const j = JSON.parse(text);
                if (Array.isArray(j)) info = j.length + ' items';
                else if (j.items && Array.isArray(j.items)) info = j.items.length + ' result items';
                else if (j.data && Array.isArray(j.data)) info = j.data.length + ' data items';
                else info = Object.keys(j).slice(0, 6).join(', ');
              } catch(e) { info = text.substring(0, 80); }
              return JSON.stringify({ s: res.status, i: info, b: text.length });
            } catch(e) {
              return JSON.stringify({ s: 'TIMEOUT', i: e.message.substring(0, 50), b: 0 });
            }
          };
          return 'ok';
        })()
      `);

      // Define all tests
      const tests = [
        // PART 1: Internal endpoints
        ['GET  /api/auth/me', 'GET', '/api/auth/me'],
        ['GET  /api/news?page=1&pageSize=5', 'GET', '/api/news?page=1&pageSize=5'],
        ['GET  /api/news/trends', 'GET', '/api/news/trends'],
        ['GET  /api/stats/summary', 'GET', '/api/stats/summary'],
        ['GET  /api/stats/countries', 'GET', '/api/stats/countries'],
        ['GET  /api/stats/threats', 'GET', '/api/stats/threats'],
        ['GET  /api/stats/timeline', 'GET', '/api/stats/timeline'],
        ['GET  /api/alert', 'GET', '/api/alert'],
        ['GET  /api/alert/rules', 'GET', '/api/alert/rules'],
        ['GET  /api/bulletin', 'GET', '/api/bulletin'],
        ['GET  /api/bookmark', 'GET', '/api/bookmark'],
        ['GET  /api/bookmark/collections', 'GET', '/api/bookmark/collections'],
        ['GET  /api/user', 'GET', '/api/user'],
        ['GET  /api/user/countries', 'GET', '/api/user/countries'],
        ['GET  /api/source', 'GET', '/api/source'],
        ['GET  /api/search/saved', 'GET', '/api/search/saved'],
        ['GET  /api/search/keywords', 'GET', '/api/search/keywords'],
        ['GET  /api/dns/history', 'GET', '/api/dns/history'],
        ['GET  /api/dns/watchlist', 'GET', '/api/dns/watchlist'],
        ['POST /api/dns/lookup', 'POST', '/api/dns/lookup', { domain: 'github.com', recordType: 'A' }],
        ['POST /api/dns/extract-domains', 'POST', '/api/dns/extract-domains', { text: 'Check github.com and google.com' }],
        ['GET  /api/external-search/providers', 'GET', '/api/external-search/providers'],
        ['GET  /api/external-search/history', 'GET', '/api/external-search/history'],
        ['GET  /api/experience/me', 'GET', '/api/experience/me'],
        ['GET  /api/experience/leaderboard', 'GET', '/api/experience/leaderboard'],
        ['GET  /api/experience/badges/me', 'GET', '/api/experience/badges/me'],
        ['GET  /api/experience/badges/all', 'GET', '/api/experience/badges/all'],
        ['GET  /api/experience/activity/me', 'GET', '/api/experience/activity/me'],
        ['GET  /api/import/jobs', 'GET', '/api/import/jobs'],

        // PART 2: External API endpoints (real OSINT)
        ['POST /api/external-search [GitHub]', 'POST', '/api/external-search/search', { provider: 'GitHub', query: 'osint', filters: {} }],
        ['POST /api/external-search [Reddit]', 'POST', '/api/external-search/search', { provider: 'Reddit', query: 'osint', filters: {} }],
        ['POST /api/external-search [HackerNews]', 'POST', '/api/external-search/search', { provider: 'HackerNews', query: 'osint', filters: {} }],
        ['POST /api/external-search [ThreatIntel]', 'POST', '/api/external-search/search', { provider: 'ThreatIntel', query: 'github.com', filters: {} }],
        ['POST /api/osint/domain-intel', 'POST', '/api/osint/domain-intel', { target: 'github.com' }],
        ['POST /api/osint/google-dorks', 'POST', '/api/osint/google-dorks', { target: 'github.com', category: 'all' }],
        ['POST /api/osint/wayback', 'POST', '/api/osint/wayback', { url: 'github.com' }],
        ['POST /api/osint/email-breach', 'POST', '/api/osint/email-breach', { email: 'test@example.com' }],
        ['POST /api/osint/spiderfoot', 'POST', '/api/osint/spiderfoot', { target: 'github.com', scanType: 'quick' }],
        ['POST /api/osint/maltego/transform', 'POST', '/api/osint/maltego/transform', { entityType: 'domain', entityValue: 'github.com' }],
      ];

      console.log('\n' + '='.repeat(90));
      console.log('API ENDPOINT TEST RESULTS (via browser -> Angular proxy -> backend)');
      console.log('='.repeat(90));

      let pass = 0, warn = 0, fail = 0;
      let currentPart = 1;

      for (let i = 0; i < tests.length; i++) {
        if (i === 29 && currentPart === 1) {
          console.log('\n--- EXTERNAL OSINT APIs (real data, may be slower) ---');
          currentPart = 2;
        }

        const [name, method, url, body] = tests[i];
        const bodyStr = body ? JSON.stringify(body) : 'null';
        const expr = `(async () => await window.__test('${method}', '${url}', ${bodyStr}))()`;

        try {
          const raw = await evalAsync(expr);
          const r = JSON.parse(raw);
          const s = r.s;
          let icon;
          if (typeof s === 'number' && s >= 200 && s < 300) { icon = '✅'; pass++; }
          else if (typeof s === 'number' && s >= 400 && s < 500) { icon = '⚠️'; warn++; }
          else { icon = '❌'; fail++; }
          console.log(`${icon} [${String(s).padEnd(3)}] ${name.padEnd(50)} ${r.i} (${r.b}b)`);
        } catch (e) {
          fail++;
          console.log(`❌ [ERR] ${name.padEnd(50)} ${e.message}`);
        }
      }

      console.log('\n' + '='.repeat(90));
      console.log(`FINAL: ✅ ${pass} PASS | ⚠️  ${warn} CLIENT ERR | ❌ ${fail} FAIL/TIMEOUT | Total: ${tests.length}`);
      console.log('='.repeat(90));

      // Take a final screenshot
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\test-final.png', Buffer.from(ss.data, 'base64'));

      ws.close();
    } catch (err) {
      console.error('Fatal:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
