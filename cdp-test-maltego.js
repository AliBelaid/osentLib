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

  async function evalAsync(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, timeout: 30000 });
    return r.result?.value;
  }

  async function evalExpr(expr) {
    const r = await send('Runtime.evaluate', { expression: expr });
    return r.result?.value;
  }

  ws.on('open', async () => {
    try {
      // Make sure we have a valid token
      console.log('Logging in...');
      await evalAsync(`
        (async () => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
          });
          const data = await res.json();
          if (data.token) localStorage.setItem('auth_token', data.token);
          return data.token ? 'ok' : 'fail';
        })()
      `);

      // Navigate to Maltego
      console.log('Navigating to Maltego...');
      await send('Page.navigate', { url: 'http://localhost:4100/maltego' });
      await new Promise(r => setTimeout(r, 3000));

      // Set entity type to Domain and value to github.com
      await evalExpr(`
        (() => {
          const input = document.querySelector('input[matinput]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'github.com');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return 'set';
          }
          return 'no input';
        })()
      `);
      await new Promise(r => setTimeout(r, 500));

      // Click Transform
      await evalExpr(`
        (() => {
          const btn = document.querySelector('button[color="primary"]');
          if (btn) { btn.click(); return 'clicked'; }
          return 'no btn';
        })()
      `);

      console.log('Waiting for Maltego transform...');
      await new Promise(r => setTimeout(r, 15000));

      // Take screenshot
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-fixed.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved: screen/maltego-fixed.png');

      // Check graph state
      const info = await evalExpr(`
        (() => {
          const nodes = document.querySelectorAll('.graph-node');
          const labels = document.querySelectorAll('.node-label');
          const linkLabels = document.querySelectorAll('.link-label');
          const icons = document.querySelectorAll('.node-icon-text');
          let iconTexts = [];
          icons.forEach(i => iconTexts.push(i.textContent.trim()));
          return 'Nodes: ' + nodes.length + ', Labels: ' + labels.length +
            ', Link labels: ' + linkLabels.length +
            ', Icons: ' + [...new Set(iconTexts)].join(', ');
        })()
      `);
      console.log('Graph info:', info);

      ws.close();
    } catch (err) {
      console.error('Error:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
