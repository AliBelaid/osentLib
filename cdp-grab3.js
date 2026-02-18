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
  console.log('Using:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout ' + m)); }, 30000);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  ws.on('open', async () => {
    try {
      // Login
      console.log('Logging in...');
      const lr = await send('Runtime.evaluate', {
        expression: `(async()=>{const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"Admin123!"})});const d=await r.json();if(d.token)localStorage.setItem("auth_token",d.token);return d.token?"ok":"fail";})()`,
        awaitPromise: true,
        timeout: 10000
      });
      console.log('Login:', lr.result?.value);

      // Navigate to Maltego
      console.log('Navigating to Maltego...');
      await send('Page.navigate', { url: 'http://localhost:4100/maltego' });
      await new Promise(r => setTimeout(r, 4000));

      // Set domain value
      console.log('Setting entity value...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const input = document.querySelector('input[matinput]');
          if (input) {
            const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            s.call(input, 'github.com');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return 'set';
          }
          return 'no input';
        })()`
      });
      await new Promise(r => setTimeout(r, 500));

      // Click Transform
      console.log('Clicking Transform...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = [...document.querySelectorAll('button')];
          const btn = btns.find(b => b.textContent.includes('Transform'));
          if (btn) { btn.click(); return 'clicked'; }
          return 'not found';
        })()`
      });

      // Wait for results
      console.log('Waiting 18s for transform...');
      await new Promise(r => setTimeout(r, 18000));

      // Pause the simulation before screenshot
      console.log('Pausing simulation...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          // Find the pause button
          const btns = [...document.querySelectorAll('button')];
          const pauseBtn = btns.find(b => {
            const tt = b.getAttribute('ng-reflect-message') || b.getAttribute('mattooltip') || '';
            return tt.includes('Pause');
          });
          if (pauseBtn) { pauseBtn.click(); return 'paused'; }
          // Fallback: stop all animation frames
          window.__origRaf = window.requestAnimationFrame;
          window.requestAnimationFrame = function() { return 0; };
          return 'disabled rAF';
        })()`
      });
      await new Promise(r => setTimeout(r, 1000));

      // Take screenshot
      console.log('Taking screenshot...');
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-fixed.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved: screen/maltego-fixed.png');

      // Get graph details
      const detail = await send('Runtime.evaluate', {
        expression: `(() => {
          const nodes = document.querySelectorAll('circle.graph-node');
          const linkLabels = document.querySelectorAll('text.link-label');
          const iconTexts = document.querySelectorAll('text.node-icon-text');
          const nodeLabels = document.querySelectorAll('text.node-label');
          let icons = new Set();
          iconTexts.forEach(i => icons.add(i.textContent.trim()));
          let linkTexts = [];
          linkLabels.forEach(l => linkTexts.push(l.textContent.trim()));
          let nodeTexts = [];
          nodeLabels.forEach(n => nodeTexts.push(n.textContent.trim()));
          return JSON.stringify({
            totalNodes: nodes.length,
            linkLabelsVisible: linkLabels.length,
            uniqueIcons: [...icons],
            sampleLinkLabels: [...new Set(linkTexts)].slice(0, 10),
            sampleNodeLabels: nodeTexts.slice(0, 10)
          });
        })()`
      });

      try {
        const d = JSON.parse(detail.result?.value);
        console.log('Nodes:', d.totalNodes);
        console.log('Link labels visible:', d.linkLabelsVisible);
        console.log('Icons:', d.uniqueIcons.join(', '));
        console.log('Link types:', d.sampleLinkLabels.join(', '));
        console.log('Node labels:', d.sampleNodeLabels.join(' | '));
      } catch (e) {
        console.log('Detail:', detail.result?.value);
      }

      ws.close();
    } catch (e) {
      console.error('Error:', e.message);
      ws.close();
    }
  });
})();
