const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const SCREENSHOTS_DIR = 'C:\\osentLib\\screen';

async function run() {
  // Get Chrome tabs
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = tabs.find(t => t.type === 'page' && t.url.includes('localhost:4100'));
  if (!page) { console.log('No localhost:4100 tab found'); return; }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => reject(new Error('CDP timeout')), 30000);
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

  async function navigate(url, waitMs = 3000) {
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
  }

  async function screenshot(name) {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const path = `${SCREENSHOTS_DIR}\\test-${name}.png`;
    fs.writeFileSync(path, Buffer.from(result.data, 'base64'));
    return path;
  }

  async function getPageInfo() {
    const result = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const errors = document.querySelectorAll('.error, .mat-error, .alert-danger, [class*="error"]');
          const cards = document.querySelectorAll('mat-card, .card');
          const tables = document.querySelectorAll('table, mat-table');
          const charts = document.querySelectorAll('canvas, svg.chart, .chart-container');
          const spinners = document.querySelectorAll('mat-spinner, mat-progress-spinner, .loading');
          const title = document.querySelector('h1, h2, .page-title, .mat-card-title');
          return JSON.stringify({
            title: title ? title.textContent.trim().substring(0, 80) : 'none',
            errors: errors.length,
            cards: cards.length,
            tables: tables.length,
            charts: charts.length,
            loading: spinners.length,
            bodyText: document.body.innerText.substring(0, 200)
          });
        })()
      `
    });
    try {
      return JSON.parse(result.result.value);
    } catch (e) {
      return { error: 'Could not parse page info' };
    }
  }

  async function evalExpr(expr) {
    const result = await send('Runtime.evaluate', { expression: expr });
    return result.result?.value;
  }

  ws.on('open', async () => {
    const results = [];

    function log(page, status, details) {
      const entry = { page, status, details };
      results.push(entry);
      const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
      console.log(`${icon} ${page}: ${details}`);
    }

    try {
      // ==========================================
      // 1. LOGIN PAGE
      // ==========================================
      console.log('\n=== 1. LOGIN PAGE ===');
      await navigate('http://localhost:4100/login', 2000);
      await screenshot('01-login');
      const loginInfo = await getPageInfo();
      log('Login Page', loginInfo.errors > 0 ? 'FAIL' : 'PASS',
        `Cards: ${loginInfo.cards}, Title: ${loginInfo.title}`);

      // Perform login
      await evalExpr(`
        const inputs = document.querySelectorAll('input');
        if (inputs.length >= 2) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inputs[0], 'admin');
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(inputs[1], 'Admin123!');
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          'filled';
        } else { 'no inputs found: ' + inputs.length; }
      `);
      await new Promise(r => setTimeout(r, 500));
      await evalExpr(`
        const btn = document.querySelector('button[type="submit"], button.login-btn');
        if (btn) { btn.click(); 'clicked'; } else {
          const btns = document.querySelectorAll('button');
          if (btns.length > 0) { btns[btns.length-1].click(); 'clicked last btn'; }
          else { 'no btn'; }
        }
      `);
      await new Promise(r => setTimeout(r, 3000));
      const afterLogin = await getPageInfo();
      log('Login Submit', afterLogin.title !== 'none' ? 'PASS' : 'WARN',
        `After login title: ${afterLogin.title}`);

      // ==========================================
      // 2. DASHBOARD
      // ==========================================
      console.log('\n=== 2. DASHBOARD ===');
      await navigate('http://localhost:4100/dashboard', 4000);
      await screenshot('02-dashboard');
      const dashInfo = await getPageInfo();
      log('Dashboard', dashInfo.cards > 0 ? 'PASS' : 'WARN',
        `Cards: ${dashInfo.cards}, Charts: ${dashInfo.charts}, Tables: ${dashInfo.tables}`);

      // ==========================================
      // 3. NEWS LIST
      // ==========================================
      console.log('\n=== 3. NEWS ===');
      await navigate('http://localhost:4100/news', 4000);
      await screenshot('03-news');
      const newsInfo = await getPageInfo();
      log('News List', 'PASS', `Cards: ${newsInfo.cards}, Tables: ${newsInfo.tables}, Title: ${newsInfo.title}`);

      // ==========================================
      // 4. BULLETINS
      // ==========================================
      console.log('\n=== 4. BULLETINS ===');
      await navigate('http://localhost:4100/bulletins', 3000);
      await screenshot('04-bulletins');
      const bulInfo = await getPageInfo();
      log('Bulletins', 'PASS', `Cards: ${bulInfo.cards}, Title: ${bulInfo.title}`);

      // ==========================================
      // 5. ALERTS
      // ==========================================
      console.log('\n=== 5. ALERTS ===');
      await navigate('http://localhost:4100/alerts', 3000);
      await screenshot('05-alerts');
      const alertInfo = await getPageInfo();
      log('Alerts', 'PASS', `Cards: ${alertInfo.cards}, Title: ${alertInfo.title}`);

      // ==========================================
      // 6. ALERT RULES
      // ==========================================
      console.log('\n=== 6. ALERT RULES ===');
      await navigate('http://localhost:4100/alert-rules', 3000);
      await screenshot('06-alert-rules');
      const arInfo = await getPageInfo();
      log('Alert Rules', 'PASS', `Cards: ${arInfo.cards}, Title: ${arInfo.title}`);

      // ==========================================
      // 7. SOCIAL SEARCH
      // ==========================================
      console.log('\n=== 7. SOCIAL SEARCH ===');
      await navigate('http://localhost:4100/social-search', 3000);
      await screenshot('07-social-search');
      const ssInfo = await getPageInfo();
      log('Social Search', ssInfo.cards > 0 ? 'PASS' : 'WARN',
        `Cards: ${ssInfo.cards}, Title: ${ssInfo.title}`);

      // Perform a search
      await evalExpr(`
        const input = document.querySelector('input[matinput]');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'africa security');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          'set';
        } else { 'no input'; }
      `);
      await new Promise(r => setTimeout(r, 500));
      await evalExpr(`
        const btn = document.querySelector('button.search-btn');
        if (btn) { btn.click(); 'clicked'; } else { 'no search btn'; }
      `);
      console.log('   Waiting for social search results...');
      await new Promise(r => setTimeout(r, 20000));
      await screenshot('07-social-search-results');
      const ssResults = await evalExpr(`
        const provHeaders = document.querySelectorAll('.provider-header');
        const resultCards = document.querySelectorAll('.result-card');
        let info = '';
        provHeaders.forEach(h => {
          info += h.textContent.trim().replace(/\\s+/g, ' ') + ' | ';
        });
        'Results: ' + resultCards.length + ', Providers: ' + provHeaders.length + ' [' + info + ']';
      `);
      log('Social Search Results', ssResults.includes('Results: 0') ? 'WARN' : 'PASS', ssResults);

      // ==========================================
      // 8. ADVANCED SEARCH
      // ==========================================
      console.log('\n=== 8. ADVANCED SEARCH ===');
      await navigate('http://localhost:4100/search', 3000);
      await screenshot('08-advanced-search');
      const searchInfo = await getPageInfo();
      log('Advanced Search', 'PASS', `Cards: ${searchInfo.cards}, Title: ${searchInfo.title}`);

      // ==========================================
      // 9. KEYWORD MANAGER
      // ==========================================
      console.log('\n=== 9. KEYWORD MANAGER ===');
      await navigate('http://localhost:4100/keywords', 3000);
      await screenshot('09-keywords');
      const kwInfo = await getPageInfo();
      log('Keyword Manager', 'PASS', `Cards: ${kwInfo.cards}, Title: ${kwInfo.title}`);

      // ==========================================
      // 10. DNS LOOKUP
      // ==========================================
      console.log('\n=== 10. DNS LOOKUP ===');
      await navigate('http://localhost:4100/dns', 3000);
      await screenshot('10-dns-lookup');
      const dnsInfo = await getPageInfo();
      log('DNS Lookup Page', 'PASS', `Cards: ${dnsInfo.cards}, Title: ${dnsInfo.title}`);

      // Test DNS lookup
      await evalExpr(`
        const input = document.querySelector('input[matinput]');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'github.com');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          'set';
        } else { 'no input'; }
      `);
      await new Promise(r => setTimeout(r, 500));
      await evalExpr(`
        const btn = document.querySelector('button[color="primary"]');
        if (btn) { btn.click(); 'clicked'; } else { 'no btn'; }
      `);
      await new Promise(r => setTimeout(r, 5000));
      await screenshot('10-dns-results');
      const dnsResults = await getPageInfo();
      log('DNS Lookup Results', dnsResults.cards > 1 ? 'PASS' : 'WARN',
        `Cards: ${dnsResults.cards}, Title: ${dnsResults.title}`);

      // ==========================================
      // 11. DOMAIN WATCHLIST
      // ==========================================
      console.log('\n=== 11. DOMAIN WATCHLIST ===');
      await navigate('http://localhost:4100/domain-watchlist', 3000);
      await screenshot('11-domain-watchlist');
      const dwInfo = await getPageInfo();
      log('Domain Watchlist', 'PASS', `Cards: ${dwInfo.cards}, Title: ${dwInfo.title}`);

      // ==========================================
      // 12. GIS MAPS - THREATS
      // ==========================================
      console.log('\n=== 12. GIS MAPS ===');
      await navigate('http://localhost:4100/maps/threats', 4000);
      await screenshot('12-map-threats');
      const mapInfo = await getPageInfo();
      log('Threat Map', 'PASS', `Cards: ${mapInfo.cards}, Title: ${mapInfo.title}`);

      // Alert Map
      await navigate('http://localhost:4100/maps/alerts', 4000);
      await screenshot('12-map-alerts');
      const alertMapInfo = await getPageInfo();
      log('Alert Map', 'PASS', `Cards: ${alertMapInfo.cards}, Title: ${alertMapInfo.title}`);

      // Timeline Map
      await navigate('http://localhost:4100/maps/timeline', 4000);
      await screenshot('12-map-timeline');
      const tlMapInfo = await getPageInfo();
      log('Timeline Map', 'PASS', `Cards: ${tlMapInfo.cards}, Title: ${tlMapInfo.title}`);

      // ==========================================
      // 13. CYBER OPS - THREAT INTEL
      // ==========================================
      console.log('\n=== 13. CYBER OPS ===');
      await navigate('http://localhost:4100/cyber/threat-intel', 4000);
      await screenshot('13-threat-intel');
      const tiInfo = await getPageInfo();
      log('Threat Intel', 'PASS', `Cards: ${tiInfo.cards}, Charts: ${tiInfo.charts}, Title: ${tiInfo.title}`);

      // Attack Map
      await navigate('http://localhost:4100/cyber/attack-map', 4000);
      await screenshot('13-attack-map');
      const amInfo = await getPageInfo();
      log('Attack Map', 'PASS', `Cards: ${amInfo.cards}, Title: ${amInfo.title}`);

      // Country Intel
      await navigate('http://localhost:4100/cyber/country-intel', 4000);
      await screenshot('13-country-intel');
      const ciInfo = await getPageInfo();
      log('Country Intel', 'PASS', `Cards: ${ciInfo.cards}, Title: ${ciInfo.title}`);

      // Incidents
      await navigate('http://localhost:4100/cyber/incidents', 4000);
      await screenshot('13-incidents');
      const incInfo = await getPageInfo();
      log('Incidents', 'PASS', `Cards: ${incInfo.cards}, Title: ${incInfo.title}`);

      // ==========================================
      // 14. OSINT TOOLS
      // ==========================================
      console.log('\n=== 14. OSINT TOOLS ===');
      await navigate('http://localhost:4100/osint-tools', 3000);
      await screenshot('14-osint-tools');
      const osintInfo = await getPageInfo();
      log('OSINT Tools Page', 'PASS', `Cards: ${osintInfo.cards}, Title: ${osintInfo.title}`);

      // Test Domain Intel
      await evalExpr(`
        const tabs = document.querySelectorAll('.mat-mdc-tab, [role="tab"]');
        let domainTab = null;
        tabs.forEach(t => { if (t.textContent.includes('Domain')) domainTab = t; });
        if (domainTab) { domainTab.click(); 'clicked domain tab'; } else { 'no domain tab found, tabs: ' + tabs.length; }
      `);
      await new Promise(r => setTimeout(r, 1000));
      await evalExpr(`
        const inputs = document.querySelectorAll('input[matinput]');
        const input = inputs[inputs.length - 1] || inputs[0];
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'github.com');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          'set';
        } else { 'no input'; }
      `);
      await new Promise(r => setTimeout(r, 500));
      await evalExpr(`
        const btns = document.querySelectorAll('button[color="primary"]');
        const btn = btns[btns.length - 1] || btns[0];
        if (btn) { btn.click(); 'clicked'; } else { 'no btn'; }
      `);
      console.log('   Waiting for OSINT domain intel results...');
      await new Promise(r => setTimeout(r, 10000));
      await screenshot('14-osint-domain-results');
      const osintResults = await getPageInfo();
      log('OSINT Domain Intel', osintResults.cards > 2 ? 'PASS' : 'WARN',
        `Cards: ${osintResults.cards}, Title: ${osintResults.title}`);

      // ==========================================
      // 15. MALTEGO GRAPH
      // ==========================================
      console.log('\n=== 15. MALTEGO ===');
      await navigate('http://localhost:4100/maltego', 3000);
      await screenshot('15-maltego');
      const malInfo = await getPageInfo();
      log('Maltego Graph', 'PASS', `Cards: ${malInfo.cards}, Title: ${malInfo.title}`);

      // Test Maltego with a domain
      await evalExpr(`
        const selects = document.querySelectorAll('mat-select');
        const inputs = document.querySelectorAll('input[matinput]');
        if (inputs.length > 0) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inputs[0], 'github.com');
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          'set domain value';
        } else { 'no input'; }
      `);
      await new Promise(r => setTimeout(r, 500));
      await evalExpr(`
        const btns = document.querySelectorAll('button[color="primary"]');
        if (btns.length > 0) { btns[0].click(); 'clicked'; } else { 'no btn'; }
      `);
      console.log('   Waiting for Maltego transform...');
      await new Promise(r => setTimeout(r, 10000));
      await screenshot('15-maltego-results');
      const malResults = await getPageInfo();
      log('Maltego Transform', 'PASS', `Cards: ${malResults.cards}, Title: ${malResults.title}`);

      // ==========================================
      // 16. LEADERBOARD
      // ==========================================
      console.log('\n=== 16. LEADERBOARD ===');
      await navigate('http://localhost:4100/leaderboard', 3000);
      await screenshot('16-leaderboard');
      const lbInfo = await getPageInfo();
      log('Leaderboard', 'PASS', `Cards: ${lbInfo.cards}, Title: ${lbInfo.title}`);

      // ==========================================
      // 17. BOOKMARKS
      // ==========================================
      console.log('\n=== 17. BOOKMARKS ===');
      await navigate('http://localhost:4100/bookmarks', 3000);
      await screenshot('17-bookmarks');
      const bmInfo = await getPageInfo();
      log('Bookmarks', 'PASS', `Cards: ${bmInfo.cards}, Title: ${bmInfo.title}`);

      // ==========================================
      // 18. PROFILE
      // ==========================================
      console.log('\n=== 18. PROFILE ===');
      await navigate('http://localhost:4100/profile', 3000);
      await screenshot('18-profile');
      const profInfo = await getPageInfo();
      log('Profile', 'PASS', `Cards: ${profInfo.cards}, Title: ${profInfo.title}`);

      // ==========================================
      // 19. ADMIN - USERS
      // ==========================================
      console.log('\n=== 19. ADMIN ===');
      await navigate('http://localhost:4100/admin/users', 3000);
      await screenshot('19-admin-users');
      const usersInfo = await getPageInfo();
      log('Admin Users', 'PASS', `Cards: ${usersInfo.cards}, Tables: ${usersInfo.tables}, Title: ${usersInfo.title}`);

      // Admin Sources
      await navigate('http://localhost:4100/admin/sources', 3000);
      await screenshot('19-admin-sources');
      const srcInfo = await getPageInfo();
      log('Admin Sources', 'PASS', `Cards: ${srcInfo.cards}, Title: ${srcInfo.title}`);

      // Admin Import
      await navigate('http://localhost:4100/admin/import', 3000);
      await screenshot('19-admin-import');
      const impInfo = await getPageInfo();
      log('Admin Import', 'PASS', `Cards: ${impInfo.cards}, Title: ${impInfo.title}`);

      // ==========================================
      // 20. API ENDPOINTS (direct fetch from browser)
      // ==========================================
      console.log('\n=== 20. API ENDPOINT TESTS ===');

      const apiTests = await evalExpr(`
        (async () => {
          const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
          const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
          const results = [];

          async function testGet(name, url) {
            try {
              const res = await fetch(url, { headers });
              const text = await res.text();
              let count = 0;
              try { const j = JSON.parse(text); count = Array.isArray(j) ? j.length : (j.items ? j.items.length : 1); } catch(e) {}
              results.push(name + ': ' + res.status + ' (' + count + ' items, ' + text.length + ' bytes)');
            } catch(e) {
              results.push(name + ': ERROR ' + e.message);
            }
          }

          async function testPost(name, url, body) {
            try {
              const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
              const text = await res.text();
              results.push(name + ': ' + res.status + ' (' + text.length + ' bytes)');
            } catch(e) {
              results.push(name + ': ERROR ' + e.message);
            }
          }

          // Auth
          await testGet('GET /api/auth/me', '/api/auth/me');

          // News
          await testGet('GET /api/news', '/api/news?page=1&pageSize=5');
          await testGet('GET /api/news/trends', '/api/news/trends');

          // Stats
          await testGet('GET /api/stats/summary', '/api/stats/summary');
          await testGet('GET /api/stats/countries', '/api/stats/countries');
          await testGet('GET /api/stats/threats', '/api/stats/threats');
          await testGet('GET /api/stats/timeline', '/api/stats/timeline');

          // Alerts
          await testGet('GET /api/alert', '/api/alert');
          await testGet('GET /api/alert/rules', '/api/alert/rules');

          // Bulletins
          await testGet('GET /api/bulletin', '/api/bulletin');

          // Bookmarks
          await testGet('GET /api/bookmark', '/api/bookmark');
          await testGet('GET /api/bookmark/collections', '/api/bookmark/collections');

          // Users
          await testGet('GET /api/user', '/api/user');
          await testGet('GET /api/user/countries', '/api/user/countries');

          // Sources
          await testGet('GET /api/source', '/api/source');

          // Search
          await testGet('GET /api/search/saved', '/api/search/saved');
          await testGet('GET /api/search/keywords', '/api/search/keywords');

          // DNS
          await testGet('GET /api/dns/history', '/api/dns/history');
          await testGet('GET /api/dns/watchlist', '/api/dns/watchlist');
          await testPost('POST /api/dns/lookup', '/api/dns/lookup', { domain: 'github.com', recordType: 'A' });

          // External Search Providers
          await testGet('GET /api/external-search/providers', '/api/external-search/providers');
          await testGet('GET /api/external-search/history', '/api/external-search/history');

          // Experience / Leaderboard
          await testGet('GET /api/experience/me', '/api/experience/me');
          await testGet('GET /api/experience/leaderboard', '/api/experience/leaderboard');
          await testGet('GET /api/experience/badges/me', '/api/experience/badges/me');
          await testGet('GET /api/experience/badges/all', '/api/experience/badges/all');

          // OSINT Tools
          await testPost('POST /api/osint/domain-intel', '/api/osint/domain-intel', { target: 'github.com' });
          await testPost('POST /api/osint/google-dorks', '/api/osint/google-dorks', { target: 'github.com' });
          await testPost('POST /api/osint/maltego/transform', '/api/osint/maltego/transform', { entityType: 'domain', entityValue: 'github.com' });

          // Import jobs
          await testGet('GET /api/import/jobs', '/api/import/jobs');

          return results.join('\\n');
        })()
      `);

      if (apiTests) {
        const lines = apiTests.split('\n');
        lines.forEach(line => {
          const is2xx = line.includes(': 200') || line.includes(': 201');
          const isError = line.includes('ERROR') || line.includes(': 500') || line.includes(': 404');
          if (isError) {
            log('API', 'FAIL', line);
          } else if (is2xx) {
            log('API', 'PASS', line);
          } else {
            log('API', 'WARN', line);
          }
        });
      }

      // ==========================================
      // SUMMARY
      // ==========================================
      console.log('\n========================================');
      console.log('TEST SUMMARY');
      console.log('========================================');
      const pass = results.filter(r => r.status === 'PASS').length;
      const warn = results.filter(r => r.status === 'WARN').length;
      const fail = results.filter(r => r.status === 'FAIL').length;
      console.log(`✅ PASS: ${pass}`);
      console.log(`⚠️  WARN: ${warn}`);
      console.log(`❌ FAIL: ${fail}`);
      console.log(`Total: ${results.length} tests`);
      console.log('========================================');

      if (fail > 0) {
        console.log('\nFailed tests:');
        results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.page}: ${r.details}`));
      }
      if (warn > 0) {
        console.log('\nWarnings:');
        results.filter(r => r.status === 'WARN').forEach(r => console.log(`  ⚠️ ${r.page}: ${r.details}`));
      }

      ws.close();
    } catch (err) {
      console.error('Fatal error:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
