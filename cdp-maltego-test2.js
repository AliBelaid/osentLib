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

  console.log('Available tabs:');
  tabs.forEach(t => console.log('  ', t.type, t.url));

  // Use the dashboard tab (or any localhost:4100 tab)
  const page = tabs.find(t => t.type === 'page' && t.url.includes('localhost:4100'));
  if (!page) { console.log('No localhost:4100 tab found'); return; }
  console.log('Using tab:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => {
        ws.off('message', handler);
        reject(new Error('CDP timeout for ' + method));
      }, 30000);
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
      // Navigate to Maltego first, then login via API
      console.log('Navigating to Maltego...');
      await send('Page.navigate', { url: 'http://localhost:4100/maltego' });
      await new Promise(r => setTimeout(r, 4000));

      // Login via direct API call (not through Angular)
      console.log('Setting auth token...');
      const loginResult = await send('Runtime.evaluate', {
        expression: `
          (async () => {
            try {
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
              });
              const data = await res.json();
              if (data.token) {
                localStorage.setItem('auth_token', data.token);
                return 'Token set: ' + data.token.substring(0, 20) + '...';
              }
              return 'Login failed: ' + JSON.stringify(data).substring(0, 100);
            } catch (e) {
              return 'Error: ' + e.message;
            }
          })()
        `,
        awaitPromise: true,
        timeout: 15000
      });
      console.log(loginResult.result?.value || 'no result');

      // Reload to apply new token
      await send('Page.navigate', { url: 'http://localhost:4100/maltego' });
      await new Promise(r => setTimeout(r, 3000));

      // Set input value
      console.log('Setting entity value...');
      const setResult = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const input = document.querySelector('input[matinput]');
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, 'github.com');
              input.dispatchEvent(new Event('input', { bubbles: true }));
              return 'set value to github.com';
            }
            return 'no input found';
          })()
        `
      });
      console.log(setResult.result?.value);

      await new Promise(r => setTimeout(r, 500));

      // Click Transform button
      const clickResult = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
              if (btn.textContent.includes('Transform')) { btn.click(); return 'clicked Transform'; }
            }
            return 'no Transform btn found, btns: ' + btns.length;
          })()
        `
      });
      console.log(clickResult.result?.value);

      // Wait for transform to complete
      console.log('Waiting for results...');
      await new Promise(r => setTimeout(r, 18000));

      // Screenshot
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-fixed.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved!');

      // Get graph info
      const info = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const nodes = document.querySelectorAll('circle.graph-node');
            const linkLabels = document.querySelectorAll('text.link-label');
            const iconTexts = document.querySelectorAll('text.node-icon-text');
            let icons = new Set();
            iconTexts.forEach(i => icons.add(i.textContent.trim()));
            let labels = [];
            linkLabels.forEach(l => labels.push(l.textContent.trim()));
            return 'Nodes: ' + nodes.length +
              ', Link labels visible: ' + linkLabels.length +
              ', Unique icons: ' + [...icons].join(', ') +
              ', Some link labels: ' + labels.slice(0, 8).join(', ');
          })()
        `
      });
      console.log('Graph:', info.result?.value);

      ws.close();
    } catch (err) {
      console.error('Error:', err.message);
      ws.close();
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
}

run().catch(console.error);
