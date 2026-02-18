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
      // Step 1: Go to login page first
      console.log('1. Navigating to login...');
      await send('Page.navigate', { url: 'http://localhost:4100/login' });
      await new Promise(r => setTimeout(r, 3000));

      // Step 2: Login via API and set Angular auth state properly
      console.log('2. Logging in...');
      const lr = await send('Runtime.evaluate', {
        expression: `(async()=>{
          try {
            const res = await fetch("/api/auth/login",{
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body: JSON.stringify({username:"admin",password:"Admin123!"})
            });
            const data = await res.json();
            if(data.token){
              localStorage.setItem("ausentinel_token", data.token);
              localStorage.setItem("ausentinel_user", JSON.stringify(data.user));
              return "ok";
            }
            return "fail: " + JSON.stringify(data).substring(0,100);
          } catch(e) { return "error: " + e.message; }
        })()`,
        awaitPromise: true,
        timeout: 10000
      });
      console.log('   Login:', lr.result?.value);

      // Step 3: Full page reload to pick up stored auth
      console.log('3. Reloading to pick up auth...');
      await send('Page.navigate', { url: 'http://localhost:4100/dashboard' });
      await new Promise(r => setTimeout(r, 4000));

      let url = await send('Runtime.evaluate', { expression: 'location.href' });
      console.log('   URL after reload:', url.result?.value);

      // Step 4: Use Angular router to navigate to maltego
      console.log('4. Navigating to maltego via Angular Router...');
      const nav = await send('Runtime.evaluate', {
        expression: `(async () => {
          const ng = window.ng;
          // Try to get router from any component's injector
          const appRef = ng?.getComponent(document.querySelector('app-root'));
          if (!appRef) {
            // Fallback: just change location
            window.location.href = '/maltego';
            return 'fallback: location.href';
          }
          return 'found appRef';
        })()`,
        awaitPromise: true,
        timeout: 5000
      });
      console.log('   Nav:', nav.result?.value);

      // Actually use a simpler approach - just navigate via location
      console.log('4b. Using history.pushState + popstate...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          // Use Angular's built-in navigation by finding router link
          const links = document.querySelectorAll('a[routerlink], a[href]');
          for (const link of links) {
            const href = link.getAttribute('routerlink') || link.getAttribute('href') || '';
            if (href.includes('maltego')) { link.click(); return 'clicked maltego link: ' + href; }
          }
          // Fallback - navigate directly
          history.pushState({}, '', '/maltego');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return 'dispatched popstate to /maltego';
        })()`
      });
      await new Promise(r => setTimeout(r, 4000));

      url = await send('Runtime.evaluate', { expression: 'location.href' });
      console.log('   URL:', url.result?.value);

      // If still not on maltego, try a full page load
      if (!url.result?.value?.includes('maltego')) {
        console.log('   Trying full page navigate to /maltego...');
        await send('Page.navigate', { url: 'http://localhost:4100/maltego' });
        await new Promise(r => setTimeout(r, 5000));
        url = await send('Runtime.evaluate', { expression: 'location.href' });
        console.log('   URL now:', url.result?.value);
      }

      // Check what's on the page
      console.log('5. Checking page...');
      const pageInfo = await send('Runtime.evaluate', {
        expression: `(() => {
          const url = location.href;
          const h = document.querySelector('h1,h2,h3,mat-toolbar')?.textContent?.trim() || 'no heading';
          const inputs = document.querySelectorAll('input').length;
          const btns = [...document.querySelectorAll('button')].map(b=>b.textContent.trim().substring(0,20));
          const errors = document.querySelectorAll('.error, .mat-error, [role="alert"]').length;
          const selects = document.querySelectorAll('mat-select').length;
          return JSON.stringify({ url, heading: h, inputs, selects, buttons: btns, errors });
        })()`
      });
      console.log('   Page:', pageInfo.result?.value);

      const parsed = JSON.parse(pageInfo.result?.value || '{}');

      if (!parsed.url?.includes('maltego')) {
        console.log('   Could not reach maltego page. Taking screenshot of current state.');
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\osentLib\\screen\\maltego-verify.png', Buffer.from(ss.data, 'base64'));
        console.log('   Saved screenshot.');
        ws.close();
        return;
      }

      // Step 6: Set entity value
      console.log('6. Setting entity value to github.com...');
      const setVal = await send('Runtime.evaluate', {
        expression: `(() => {
          const input = document.querySelector('input[matinput], input[type="text"]');
          if (!input) return 'no input found';
          const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          s.call(input, 'github.com');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return 'set: ' + input.value;
        })()`
      });
      console.log('   ', setVal.result?.value);
      await new Promise(r => setTimeout(r, 500));

      // Step 7: Click Transform button
      console.log('7. Clicking Transform...');
      const click = await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = [...document.querySelectorAll('button')];
          const btn = btns.find(b => b.textContent.includes('Transform'));
          if (btn) { btn.click(); return 'clicked'; }
          return 'not found: ' + btns.map(b=>b.textContent.trim()).join(' | ');
        })()`
      });
      console.log('   ', click.result?.value);

      // Step 8: Wait and monitor
      console.log('8. Waiting for transform...');
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const check = await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('circle.graph-node').length + ' nodes'`
        });
        console.log('   ' + (i+1)*3 + 's:', check.result?.value);
        if (parseInt(check.result?.value) > 5 && i >= 3) break;
      }

      // Step 9: Graph details
      console.log('9. Graph details...');
      const graphInfo = await send('Runtime.evaluate', {
        expression: `(() => {
          const nodes = document.querySelectorAll('circle.graph-node');
          const labels = document.querySelectorAll('text.node-label');
          const icons = document.querySelectorAll('text.node-icon-text');
          const linkLabels = document.querySelectorAll('text.link-label');
          let nodeData = []; labels.forEach(l => nodeData.push(l.textContent.trim()));
          let iconData = new Set(); icons.forEach(i => iconData.add(i.textContent.trim()));
          let linkData = new Set(); linkLabels.forEach(l => linkData.add(l.textContent.trim()));
          return JSON.stringify({
            nodes: nodes.length,
            nodeLabels: nodeData.slice(0, 20),
            icons: [...iconData],
            linkLabels: [...linkData].slice(0, 20)
          }, null, 2);
        })()`
      });
      console.log('   ', graphInfo.result?.value);

      // Step 10: Screenshot
      console.log('10. Screenshot...');
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-verify.png', Buffer.from(ss.data, 'base64'));
      console.log('   Saved: screen/maltego-verify.png');

      ws.close();
    } catch (e) {
      console.error('Error:', e.message);
      ws.close();
    }
  });

  ws.on('error', e => console.error('WS error:', e.message));
})();
