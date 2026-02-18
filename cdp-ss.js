const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

(async () => {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = tabs.find(t => t.url.includes('localhost:4100'));
  if (!page) { console.log('No tab'); return; }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout')); }, 60000);
    const h = d => { const msg = JSON.parse(d.toString()); if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); } };
    ws.on('message', h); ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
  ws.on('open', async () => {
    try {
      await new Promise(r => setTimeout(r, 2000));
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-fixed.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved');

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
              ', Link labels: ' + linkLabels.length +
              ', Icons: ' + [...icons].join(', ') +
              ', Labels: ' + labels.slice(0, 10).join(', ');
          })()
        `
      });
      console.log(info.result?.value);
      ws.close();
    } catch (e) { console.error(e.message); ws.close(); }
  });
})();
