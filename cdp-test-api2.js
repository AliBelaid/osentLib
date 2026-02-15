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
      const timeout = setTimeout(() => reject(new Error('timeout')), 60000);
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

  ws.on('open', async () => {
    try {
      // Step 1: Login to get a fresh token via the API
      console.log('Logging in to get fresh token...');
      const loginResult = await send('Runtime.evaluate', {
        expression: `
          (async () => {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
            });
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('auth_token', data.token);
              return 'Token obtained: ' + data.token.substring(0, 20) + '...';
            }
            return 'Login failed: ' + JSON.stringify(data);
          })()
        `,
        awaitPromise: true
      });
      console.log(loginResult.result.value);

      // Step 2: Run all API tests with the fresh token
      const result = await send('Runtime.evaluate', {
        expression: `
          (async () => {
            const token = localStorage.getItem('auth_token') || '';
            const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
            const results = [];

            async function testGet(name, url) {
              try {
                const res = await fetch(url, { headers });
                const text = await res.text();
                let info = '';
                try {
                  const j = JSON.parse(text);
                  if (Array.isArray(j)) info = j.length + ' items';
                  else if (j.items) info = j.items.length + ' items in .items';
                  else if (j.data && Array.isArray(j.data)) info = j.data.length + ' items in .data';
                  else info = Object.keys(j).slice(0, 5).join(', ');
                } catch(e) { info = text.substring(0, 80); }
                results.push({ name, status: res.status, info, bytes: text.length });
              } catch(e) {
                results.push({ name, status: 'ERR', info: e.message, bytes: 0 });
              }
            }

            async function testPost(name, url, body) {
              try {
                const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
                const text = await res.text();
                let info = '';
                try {
                  const j = JSON.parse(text);
                  if (Array.isArray(j)) info = j.length + ' items';
                  else if (j.items && Array.isArray(j.items)) info = j.items.length + ' items in .items';
                  else info = Object.keys(j).slice(0, 5).join(', ');
                } catch(e) { info = text.substring(0, 80); }
                results.push({ name, status: res.status, info, bytes: text.length });
              } catch(e) {
                results.push({ name, status: 'ERR', info: e.message, bytes: 0 });
              }
            }

            // === AUTH ===
            await testGet('GET  /api/auth/me', '/api/auth/me');

            // === NEWS ===
            await testGet('GET  /api/news', '/api/news?page=1&pageSize=5');
            await testGet('GET  /api/news/trends', '/api/news/trends');

            // === STATS ===
            await testGet('GET  /api/stats/summary', '/api/stats/summary');
            await testGet('GET  /api/stats/countries', '/api/stats/countries');
            await testGet('GET  /api/stats/threats', '/api/stats/threats');
            await testGet('GET  /api/stats/timeline', '/api/stats/timeline');

            // === ALERTS ===
            await testGet('GET  /api/alert', '/api/alert');
            await testGet('GET  /api/alert/rules', '/api/alert/rules');

            // === BULLETINS ===
            await testGet('GET  /api/bulletin', '/api/bulletin');

            // === BOOKMARKS ===
            await testGet('GET  /api/bookmark', '/api/bookmark');
            await testGet('GET  /api/bookmark/collections', '/api/bookmark/collections');

            // === USERS ===
            await testGet('GET  /api/user', '/api/user');
            await testGet('GET  /api/user/countries', '/api/user/countries');

            // === SOURCES ===
            await testGet('GET  /api/source', '/api/source');

            // === SEARCH ===
            await testGet('GET  /api/search/saved', '/api/search/saved');
            await testGet('GET  /api/search/keywords', '/api/search/keywords');

            // === DNS ===
            await testGet('GET  /api/dns/history', '/api/dns/history');
            await testGet('GET  /api/dns/watchlist', '/api/dns/watchlist');
            await testPost('POST /api/dns/lookup', '/api/dns/lookup', { domain: 'github.com', recordType: 'A' });
            await testPost('POST /api/dns/extract-domains', '/api/dns/extract-domains', { text: 'Check github.com and google.com for info' });

            // === EXTERNAL SEARCH PROVIDERS ===
            await testGet('GET  /api/external-search/providers', '/api/external-search/providers');
            await testGet('GET  /api/external-search/history', '/api/external-search/history');

            // Individual provider searches
            await testPost('POST /api/external-search/search [GitHub]', '/api/external-search/search', { provider: 'GitHub', query: 'osint africa', filters: {} });
            await testPost('POST /api/external-search/search [Reddit]', '/api/external-search/search', { provider: 'Reddit', query: 'osint africa', filters: {} });
            await testPost('POST /api/external-search/search [HackerNews]', '/api/external-search/search', { provider: 'HackerNews', query: 'osint africa', filters: {} });
            await testPost('POST /api/external-search/search [ThreatIntel]', '/api/external-search/search', { provider: 'ThreatIntel', query: 'github.com', filters: {} });

            // === EXPERIENCE / LEADERBOARD ===
            await testGet('GET  /api/experience/me', '/api/experience/me');
            await testGet('GET  /api/experience/leaderboard', '/api/experience/leaderboard');
            await testGet('GET  /api/experience/badges/me', '/api/experience/badges/me');
            await testGet('GET  /api/experience/badges/all', '/api/experience/badges/all');
            await testGet('GET  /api/experience/activity/me', '/api/experience/activity/me');

            // === OSINT TOOLS ===
            await testPost('POST /api/osint/domain-intel', '/api/osint/domain-intel', { target: 'github.com' });
            await testPost('POST /api/osint/google-dorks', '/api/osint/google-dorks', { target: 'github.com' });
            await testPost('POST /api/osint/wayback', '/api/osint/wayback', { target: 'github.com' });
            await testPost('POST /api/osint/email-breach', '/api/osint/email-breach', { email: 'test@example.com' });
            await testPost('POST /api/osint/spiderfoot', '/api/osint/spiderfoot', { target: 'github.com' });
            await testPost('POST /api/osint/maltego/transform', '/api/osint/maltego/transform', { entityType: 'domain', entityValue: 'github.com' });

            // === IMPORT ===
            await testGet('GET  /api/import/jobs', '/api/import/jobs');

            return JSON.stringify(results);
          })()
        `,
        awaitPromise: true,
        timeout: 120000
      });

      const tests = JSON.parse(result.result.value);
      let pass = 0, fail = 0, warn = 0;

      console.log('');
      console.log('='.repeat(90));
      console.log('API ENDPOINT TEST RESULTS (from browser via Angular proxy)');
      console.log('='.repeat(90));

      tests.forEach(t => {
        const s = t.status;
        let icon;
        if (s >= 200 && s < 300) { icon = '\x1b[32m✅\x1b[0m'; pass++; }
        else if (s >= 400 && s < 500) { icon = '\x1b[33m⚠️\x1b[0m'; warn++; }
        else { icon = '\x1b[31m❌\x1b[0m'; fail++; }
        const pad = t.name.padEnd(50);
        console.log(`${icon} [${s}] ${pad} ${t.info} (${t.bytes}b)`);
      });

      console.log('\n' + '='.repeat(90));
      console.log(`SUMMARY: ✅ ${pass} PASS | ⚠️  ${warn} WARN | ❌ ${fail} FAIL | Total: ${tests.length}`);
      console.log('='.repeat(90));

      if (fail > 0) {
        console.log('\nFailed:');
        tests.filter(t => t.status >= 500 || t.status === 'ERR').forEach(t => console.log(`  ❌ ${t.name}: [${t.status}] ${t.info}`));
      }

      ws.close();
    } catch (err) {
      console.error('Error:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
