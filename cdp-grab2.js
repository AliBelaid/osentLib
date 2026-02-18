const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

(async () => {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = tabs.find(t => t.url.includes('maltego'));
  if (!page) { console.log('No maltego tab'); return; }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout ' + m)); }, 30000);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); }
    };
    ws.on('message', h); ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  ws.on('open', async () => {
    try {
      // Pause the force simulation animation to allow screenshot
      console.log('Pausing animation...');
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            // Stop all requestAnimationFrame loops
            const oldRaf = window.requestAnimationFrame;
            window.requestAnimationFrame = () => 0;
            // Also try to stop via Angular component
            const pause = document.querySelector('button[mattooltip*="Pause"]');
            if (pause) { pause.click(); return 'paused via button'; }
            return 'disabled rAF';
          })()
        `
      });
      await new Promise(r => setTimeout(r, 500));

      // Now take screenshot
      console.log('Taking screenshot...');
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-fixed.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved!');

      // Restore rAF
      await send('Runtime.evaluate', {
        expression: `window.requestAnimationFrame = window.__origRaf || window.requestAnimationFrame; 'restored'`
      });

      // Get graph details
      const detail = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const nodes = document.querySelectorAll('circle.graph-node');
            const linkLabels = document.querySelectorAll('text.link-label');
            const nodeLabels = document.querySelectorAll('text.node-label');
            const iconTexts = document.querySelectorAll('text.node-icon-text');
            let icons = new Set();
            iconTexts.forEach(i => icons.add(i.textContent.trim()));
            let linkTexts = [];
            linkLabels.forEach(l => linkTexts.push(l.textContent.trim()));
            let nodeTexts = [];
            nodeLabels.forEach(n => nodeTexts.push(n.textContent.trim()));
            return JSON.stringify({
              nodes: nodes.length,
              linkLabelsVisible: linkLabels.length,
              uniqueIcons: [...icons],
              linkTexts: linkTexts.slice(0, 10),
              nodeTexts: nodeTexts.slice(0, 10)
            }, null, 2);
          })()
        `
      });
      console.log('Graph details:', detail.result?.value);

      ws.close();
    } catch (e) {
      console.error('Error:', e.message);
      ws.close();
    }
  });
})();
