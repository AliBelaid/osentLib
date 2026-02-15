const http = require('http');
const WebSocket = require('ws');

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
      const timeout = setTimeout(() => reject(new Error('CDP timeout for msg ' + id)), 180000);
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
      timeout: 120000
    });
    return result.result?.value;
  }

  ws.on('open', async () => {
    try {
      // Login first
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
            return 'OK: ' + data.token.substring(0, 20) + '...';
          }
          return 'FAIL: ' + JSON.stringify(data);
        })()
      `);
      console.log('Login:', loginMsg);

      // Helper function injected into page
      await evalAsync(`
        (async () => {
          window.__testApi = async function(method, url, body) {
            const token = localStorage.getItem('auth_token') || '';
            const opts = {
              method,
              headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(15000)
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
                else info = Object.keys(j).slice(0, 5).join(', ');
              } catch(e) { info = text.substring(0, 60); }
              return { status: res.status, info, bytes: text.length };
            } catch(e) {
              return { status: 'TIMEOUT', info: e.message, bytes: 0 };
            }
          };
          return 'helper injected';
        })()
      `);

      const allResults = [];

      async function runTest(name, method, url, body) {
        const expr = body
          ? `(async () => JSON.stringify(await window.__testApi('${method}', '${url}', ${JSON.stringify(body)})))()`
          : `(async () => JSON.stringify(await window.__testApi('${method}', '${url}')))()`;
        try {
          const raw = await evalAsync(expr);
          const r = JSON.parse(raw);
          r.name = name;
          allResults.push(r);
          const s = r.status;
          const icon = (s >= 200 && s < 300) ? '✅' : (s >= 400 && s < 500) ? '⚠️' : '❌';
          console.log(`${icon} [${s}] ${name.padEnd(52)} ${r.info} (${r.bytes}b)`);
        } catch(e) {
          allResults.push({ name, status: 'ERR', info: e.message, bytes: 0 });
          console.log(`❌ [ERR] ${name.padEnd(52)} ${e.message}`);
        }
      }

      console.log('\n' + '='.repeat(90));
      console.log('PART 1: INTERNAL API ENDPOINTS');
      console.log('='.repeat(90));

      // Auth
      await runTest('GET  /api/auth/me', 'GET', '/api/auth/me');

      // News
      await runTest('GET  /api/news', 'GET', '/api/news?page=1&pageSize=5');
      await runTest('GET  /api/news/trends', 'GET', '/api/news/trends');

      // Stats
      await runTest('GET  /api/stats/summary', 'GET', '/api/stats/summary');
      await runTest('GET  /api/stats/countries', 'GET', '/api/stats/countries');
      await runTest('GET  /api/stats/threats', 'GET', '/api/stats/threats');
      await runTest('GET  /api/stats/timeline', 'GET', '/api/stats/timeline');

      // Alerts
      await runTest('GET  /api/alert', 'GET', '/api/alert');
      await runTest('GET  /api/alert/rules', 'GET', '/api/alert/rules');

      // Bulletins
      await runTest('GET  /api/bulletin', 'GET', '/api/bulletin');

      // Bookmarks
      await runTest('GET  /api/bookmark', 'GET', '/api/bookmark');
      await runTest('GET  /api/bookmark/collections', 'GET', '/api/bookmark/collections');

      // Users
      await runTest('GET  /api/user', 'GET', '/api/user');
      await runTest('GET  /api/user/countries', 'GET', '/api/user/countries');

      // Sources
      await runTest('GET  /api/source', 'GET', '/api/source');

      // Search
      await runTest('GET  /api/search/saved', 'GET', '/api/search/saved');
      await runTest('GET  /api/search/keywords', 'GET', '/api/search/keywords');

      // DNS
      await runTest('GET  /api/dns/history', 'GET', '/api/dns/history');
      await runTest('GET  /api/dns/watchlist', 'GET', '/api/dns/watchlist');
      await runTest('POST /api/dns/lookup', 'POST', '/api/dns/lookup', { domain: 'github.com', recordType: 'A' });
      await runTest('POST /api/dns/extract-domains', 'POST', '/api/dns/extract-domains', { text: 'Check github.com and google.com' });

      // External Search
      await runTest('GET  /api/external-search/providers', 'GET', '/api/external-search/providers');
      await runTest('GET  /api/external-search/history', 'GET', '/api/external-search/history');

      // Experience
      await runTest('GET  /api/experience/me', 'GET', '/api/experience/me');
      await runTest('GET  /api/experience/leaderboard', 'GET', '/api/experience/leaderboard');
      await runTest('GET  /api/experience/badges/me', 'GET', '/api/experience/badges/me');
      await runTest('GET  /api/experience/badges/all', 'GET', '/api/experience/badges/all');
      await runTest('GET  /api/experience/activity/me', 'GET', '/api/experience/activity/me');

      // Import
      await runTest('GET  /api/import/jobs', 'GET', '/api/import/jobs');

      console.log('\n' + '='.repeat(90));
      console.log('PART 2: EXTERNAL API ENDPOINTS (real OSINT APIs - may be slower)');
      console.log('='.repeat(90));

      // External Search Providers (hit real external APIs)
      await runTest('POST /api/external-search [GitHub]', 'POST', '/api/external-search/search', { provider: 'GitHub', query: 'osint', filters: {} });
      await runTest('POST /api/external-search [Reddit]', 'POST', '/api/external-search/search', { provider: 'Reddit', query: 'osint', filters: {} });
      await runTest('POST /api/external-search [HackerNews]', 'POST', '/api/external-search/search', { provider: 'HackerNews', query: 'osint', filters: {} });
      await runTest('POST /api/external-search [ThreatIntel]', 'POST', '/api/external-search/search', { provider: 'ThreatIntel', query: 'github.com', filters: {} });

      // OSINT Tools (hit real external APIs)
      await runTest('POST /api/osint/domain-intel', 'POST', '/api/osint/domain-intel', { target: 'github.com' });
      await runTest('POST /api/osint/google-dorks', 'POST', '/api/osint/google-dorks', { target: 'github.com' });
      await runTest('POST /api/osint/wayback', 'POST', '/api/osint/wayback', { target: 'github.com' });
      await runTest('POST /api/osint/email-breach', 'POST', '/api/osint/email-breach', { email: 'test@example.com' });
      await runTest('POST /api/osint/spiderfoot', 'POST', '/api/osint/spiderfoot', { target: 'github.com' });
      await runTest('POST /api/osint/maltego/transform', 'POST', '/api/osint/maltego/transform', { entityType: 'domain', entityValue: 'github.com' });

      // Summary
      const pass = allResults.filter(r => r.status >= 200 && r.status < 300).length;
      const warn = allResults.filter(r => r.status >= 400 && r.status < 500).length;
      const fail = allResults.filter(r => r.status >= 500 || r.status === 'ERR' || r.status === 'TIMEOUT').length;

      console.log('\n' + '='.repeat(90));
      console.log(`FINAL SUMMARY: ✅ ${pass} PASS | ⚠️  ${warn} CLIENT ERR | ❌ ${fail} SERVER ERR | Total: ${allResults.length}`);
      console.log('='.repeat(90));

      if (fail > 0) {
        console.log('\nFailed/Error endpoints:');
        allResults.filter(r => r.status >= 500 || r.status === 'ERR' || r.status === 'TIMEOUT')
          .forEach(r => console.log(`  ❌ [${r.status}] ${r.name}: ${r.info}`));
      }

      ws.close();
    } catch (err) {
      console.error('Fatal:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
