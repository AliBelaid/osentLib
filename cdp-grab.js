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
  console.log('Using:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout ' + m)); }, 15000);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); }
    };
    ws.on('message', h); ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  ws.on('open', async () => {
    try {
      // First just try to get page info without screenshot
      console.log('Getting page info...');
      const info = await send('Runtime.evaluate', {
        expression: `document.title + ' | nodes: ' + document.querySelectorAll('circle.graph-node').length + ' | url: ' + location.href`
      });
      console.log('Page:', info.result?.value);

      // Try screenshot with clip (viewport only)
      console.log('Attempting screenshot...');
      const ss = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }
      });
      fs.writeFileSync('C:\\osentLib\\screen\\maltego-fixed.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved!');

      // Get detailed info
      const detail = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const nodes = document.querySelectorAll('circle.graph-node');
            const linkLabels = document.querySelectorAll('text.link-label');
            const iconTexts = document.querySelectorAll('text.node-icon-text');
            let icons = new Set();
            iconTexts.forEach(i => icons.add(i.textContent.trim()));
            return 'Nodes: ' + nodes.length +
              ', Link labels visible: ' + linkLabels.length +
              ', Icons: ' + [...icons].join(', ');
          })()
        `
      });
      console.log('Graph:', detail.result?.value);

      ws.close();
    } catch (e) {
      console.error('Error:', e.message);
      ws.close();
    }
  });
})();
