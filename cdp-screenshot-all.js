const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const DIR = 'C:\\osentLib\\screen';

async function run() {
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
      const timeout = setTimeout(() => reject(new Error('CDP timeout')), 60000);
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

  async function nav(url, wait = 3000) {
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, wait));
  }

  async function shot(name) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${DIR}\\${name}.png`, Buffer.from(r.data, 'base64'));
    console.log(`  📸 ${name}.png`);
  }

  async function evalExpr(expr) {
    const r = await send('Runtime.evaluate', { expression: expr });
    return r.result?.value;
  }

  async function evalAsync(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, timeout: 30000 });
    return r.result?.value;
  }

  async function setInput(selector, value) {
    await evalExpr(`
      (() => {
        const input = document.querySelector('${selector}');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, '${value}');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return 'set';
        }
        return 'not found';
      })()
    `);
  }

  async function clickBtn(selector) {
    return await evalExpr(`
      (() => {
        const btn = document.querySelector('${selector}');
        if (btn) { btn.click(); return 'clicked'; }
        return 'not found';
      })()
    `);
  }

  ws.on('open', async () => {
    try {
      // ============================================
      // LOGIN
      // ============================================
      console.log('\n1. Login Page');
      await nav('http://localhost:4100/login', 2000);
      await shot('01-login');

      // Perform login
      await evalAsync(`
        (async () => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
          });
          const data = await res.json();
          if (data.token) localStorage.setItem('auth_token', data.token);
          return data.token ? 'logged in' : 'fail';
        })()
      `);

      // Fill form and click for visual
      await evalExpr(`
        (() => {
          const inputs = document.querySelectorAll('input');
          if (inputs.length >= 2) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inputs[0], 'admin');
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            setter.call(inputs[1], 'Admin123!');
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          }
          return 'filled';
        })()
      `);
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[type="submit"], button.login-btn, button[color="primary"]');
      await new Promise(r => setTimeout(r, 3000));
      await shot('02-login-success');

      // ============================================
      // DASHBOARD
      // ============================================
      console.log('2. Dashboard');
      await nav('http://localhost:4100/dashboard', 5000);
      await shot('03-dashboard');

      // ============================================
      // NEWS
      // ============================================
      console.log('3. News List');
      await nav('http://localhost:4100/news', 4000);
      await shot('04-news-list');

      // Click first article if available
      await evalExpr(`
        (() => {
          const card = document.querySelector('mat-card.article-card, .article-card, .news-card');
          if (card) { card.click(); return 'clicked article'; }
          const rows = document.querySelectorAll('tr.mat-mdc-row, mat-row');
          if (rows.length > 0) { rows[0].click(); return 'clicked row'; }
          return 'no article found';
        })()
      `);
      await new Promise(r => setTimeout(r, 2000));
      await shot('05-news-detail');

      // ============================================
      // BULLETINS
      // ============================================
      console.log('4. Bulletins');
      await nav('http://localhost:4100/bulletins', 3000);
      await shot('06-bulletins');

      // ============================================
      // ALERTS
      // ============================================
      console.log('5. Alerts');
      await nav('http://localhost:4100/alerts', 3000);
      await shot('07-alerts');

      // ============================================
      // ALERT RULES
      // ============================================
      console.log('6. Alert Rules');
      await nav('http://localhost:4100/alert-rules', 3000);
      await shot('08-alert-rules');

      // ============================================
      // SOCIAL SEARCH (empty)
      // ============================================
      console.log('7. Social Search');
      await nav('http://localhost:4100/social-search', 3000);
      await shot('09-social-search-welcome');

      // Search for something
      await setInput('input[matinput]', 'cybersecurity africa');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button.search-btn');
      console.log('   Waiting for social search results...');
      await new Promise(r => setTimeout(r, 25000));
      await shot('10-social-search-results');

      // Scroll down to see more results
      await evalExpr(`window.scrollTo(0, 600); 'scrolled'`);
      await new Promise(r => setTimeout(r, 500));
      await shot('11-social-search-scrolled');

      // ============================================
      // ADVANCED SEARCH
      // ============================================
      console.log('8. Advanced Search');
      await nav('http://localhost:4100/search', 3000);
      await shot('12-advanced-search');

      // ============================================
      // KEYWORD MANAGER
      // ============================================
      console.log('9. Keyword Manager');
      await nav('http://localhost:4100/keywords', 3000);
      await shot('13-keyword-manager');

      // ============================================
      // DNS LOOKUP
      // ============================================
      console.log('10. DNS Lookup');
      await nav('http://localhost:4100/dns', 3000);
      await shot('14-dns-lookup');

      // Perform a lookup
      await setInput('input[matinput]', 'github.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      await new Promise(r => setTimeout(r, 5000));
      await shot('15-dns-results');

      // Scroll to see more DNS info
      await evalExpr(`window.scrollTo(0, 400); 'scrolled'`);
      await new Promise(r => setTimeout(r, 500));
      await shot('16-dns-results-scrolled');

      // ============================================
      // DOMAIN WATCHLIST
      // ============================================
      console.log('11. Domain Watchlist');
      await nav('http://localhost:4100/domain-watchlist', 3000);
      await shot('17-domain-watchlist');

      // ============================================
      // GIS MAPS
      // ============================================
      console.log('12. GIS Maps - Threats');
      await nav('http://localhost:4100/maps/threats', 5000);
      await shot('18-map-threats');

      console.log('13. GIS Maps - Alerts');
      await nav('http://localhost:4100/maps/alerts', 5000);
      await shot('19-map-alerts');

      console.log('14. GIS Maps - Timeline');
      await nav('http://localhost:4100/maps/timeline', 5000);
      await shot('20-map-timeline');

      // ============================================
      // CYBER OPS
      // ============================================
      console.log('15. Cyber - Threat Intel');
      await nav('http://localhost:4100/cyber/threat-intel', 4000);
      await shot('21-cyber-threat-intel');

      console.log('16. Cyber - Attack Map');
      await nav('http://localhost:4100/cyber/attack-map', 5000);
      await shot('22-cyber-attack-map');

      console.log('17. Cyber - Country Intel');
      await nav('http://localhost:4100/cyber/country-intel', 4000);
      await shot('23-cyber-country-intel');

      // Select a country if possible
      await evalExpr(`
        (() => {
          const select = document.querySelector('mat-select');
          if (select) { select.click(); return 'opened select'; }
          return 'no select';
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      await evalExpr(`
        (() => {
          const opts = document.querySelectorAll('mat-option');
          if (opts.length > 1) { opts[1].click(); return 'selected ' + opts[1].textContent.trim(); }
          return 'no options';
        })()
      `);
      await new Promise(r => setTimeout(r, 2000));
      await shot('24-cyber-country-detail');

      console.log('18. Cyber - Incidents');
      await nav('http://localhost:4100/cyber/incidents', 4000);
      await shot('25-cyber-incidents');

      // ============================================
      // OSINT TOOLS
      // ============================================
      console.log('19. OSINT Tools');
      await nav('http://localhost:4100/osint-tools', 3000);
      await shot('26-osint-tools');

      // Test Email Breach
      await evalExpr(`
        (() => {
          const tabs = document.querySelectorAll('[role="tab"]');
          for (const t of tabs) {
            if (t.textContent.includes('Email') || t.textContent.includes('Breach')) { t.click(); return 'clicked email tab'; }
          }
          return 'no email tab, tabs: ' + tabs.length;
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      const inputs1 = await evalExpr(`document.querySelectorAll('input[matinput]').length`);
      await setInput('input[matinput]', 'test@example.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      await new Promise(r => setTimeout(r, 3000));
      await shot('27-osint-email-breach');

      // Test Google Dorks
      await evalExpr(`
        (() => {
          const tabs = document.querySelectorAll('[role="tab"]');
          for (const t of tabs) {
            if (t.textContent.includes('Google') || t.textContent.includes('Dork')) { t.click(); return 'clicked dork tab'; }
          }
          return 'no dork tab';
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      await setInput('input[matinput]', 'github.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      await new Promise(r => setTimeout(r, 3000));
      await shot('28-osint-google-dorks');

      // Test Domain Intel
      await evalExpr(`
        (() => {
          const tabs = document.querySelectorAll('[role="tab"]');
          for (const t of tabs) {
            if (t.textContent.includes('Domain') || t.textContent.includes('Intel')) { t.click(); return 'clicked domain tab'; }
          }
          return 'no domain tab';
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      await setInput('input[matinput]', 'github.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      console.log('   Waiting for domain intel...');
      await new Promise(r => setTimeout(r, 12000));
      await shot('29-osint-domain-intel');

      // Scroll to see full results
      await evalExpr(`window.scrollTo(0, 500); 'scrolled'`);
      await new Promise(r => setTimeout(r, 500));
      await shot('30-osint-domain-intel-scrolled');

      // Test SpiderFoot
      await evalExpr(`
        (() => {
          const tabs = document.querySelectorAll('[role="tab"]');
          for (const t of tabs) {
            if (t.textContent.includes('Spider') || t.textContent.includes('Foot')) { t.click(); return 'clicked spiderfoot tab'; }
          }
          return 'no spiderfoot tab';
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      await setInput('input[matinput]', 'github.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      console.log('   Waiting for SpiderFoot scan...');
      await new Promise(r => setTimeout(r, 12000));
      await shot('31-osint-spiderfoot');

      // Test Wayback
      await evalExpr(`
        (() => {
          const tabs = document.querySelectorAll('[role="tab"]');
          for (const t of tabs) {
            if (t.textContent.includes('Wayback')) { t.click(); return 'clicked wayback tab'; }
          }
          return 'no wayback tab';
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      await setInput('input[matinput]', 'github.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      await new Promise(r => setTimeout(r, 5000));
      await shot('32-osint-wayback');

      // ============================================
      // MALTEGO
      // ============================================
      console.log('20. Maltego Graph');
      await nav('http://localhost:4100/maltego', 3000);
      await shot('33-maltego');

      // Run a transform
      await setInput('input[matinput]', 'github.com');
      await new Promise(r => setTimeout(r, 500));
      await clickBtn('button[color="primary"]');
      console.log('   Waiting for Maltego transform...');
      await new Promise(r => setTimeout(r, 12000));
      await shot('34-maltego-results');

      // ============================================
      // LEADERBOARD
      // ============================================
      console.log('21. Leaderboard');
      await nav('http://localhost:4100/leaderboard', 3000);
      await shot('35-leaderboard');

      // ============================================
      // BOOKMARKS
      // ============================================
      console.log('22. Bookmarks');
      await nav('http://localhost:4100/bookmarks', 3000);
      await shot('36-bookmarks');

      // ============================================
      // PROFILE
      // ============================================
      console.log('23. Profile');
      await nav('http://localhost:4100/profile', 3000);
      await shot('37-profile');

      // ============================================
      // ADMIN - USERS
      // ============================================
      console.log('24. Admin - Users');
      await nav('http://localhost:4100/admin/users', 3000);
      await shot('38-admin-users');

      // ============================================
      // ADMIN - SOURCES
      // ============================================
      console.log('25. Admin - Sources');
      await nav('http://localhost:4100/admin/sources', 3000);
      await shot('39-admin-sources');

      // ============================================
      // ADMIN - IMPORT
      // ============================================
      console.log('26. Admin - Import');
      await nav('http://localhost:4100/admin/import', 3000);
      await shot('40-admin-import');

      // ============================================
      // LANDING PAGE (public)
      // ============================================
      console.log('27. Landing Page');
      await nav('http://localhost:4100/', 3000);
      await shot('41-landing');

      console.log('\n' + '='.repeat(60));
      console.log('DONE! All screenshots saved to screen/ directory');
      const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort();
      console.log(`Total screenshots: ${files.length}`);
      console.log('='.repeat(60));

      ws.close();
    } catch (err) {
      console.error('Error:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
